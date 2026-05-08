import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface AptosScoreQuery {
  user_id: string;
  days?: number;
}

interface AptosScoreResponse {
  score: number;
  label: string;
  breakdown: {
    calorie_score: number;
    calorie_adherence_pct: number;
    calorie_ambition_multiplier: number;
    fitness_score: number;
    fitness_adherence_pct: number;
    fitness_ambition_multiplier: number;
    consistency_score: number;
    consistency_pct: number;
    days_analyzed: number;
  };
}

function getActivityTDEEMultiplier(activityLevel: string): number {
  const baselineTDEE = 2000;
  switch (activityLevel) {
    case 'sedentary':
      return baselineTDEE * 1.2;
    case 'lightly_active':
      return baselineTDEE * 1.375;
    case 'moderately_active':
      return baselineTDEE * 1.55;
    case 'very_active':
      return baselineTDEE * 1.725;
    case 'extremely_active':
      return baselineTDEE * 1.9;
    case 'extra_active':
      return baselineTDEE * 1.9;
    default:
      return baselineTDEE * 1.55;
  }
}

function getCalorieAmbitionMultiplier(impliedDeficit: number): number {
  // Surplus side (implied_deficit <= 0)
  if (impliedDeficit <= -1000) return 1.0;
  if (impliedDeficit <= -500) return 1.25;
  if (impliedDeficit <= 0) return 1.0;

  // Deficit side (implied_deficit > 0) - smooth linear interpolation
  if (impliedDeficit < 500) {
    // 0 to 500: 1.0 + (implied_deficit / 500) * 0.25
    return 1.0 + (impliedDeficit / 500) * 0.25;
  }
  if (impliedDeficit <= 1000) {
    // 500 to 1000: 1.25 + ((implied_deficit - 500) / 500) * 0.25
    return 1.25 + ((impliedDeficit - 500) / 500) * 0.25;
  }
  // > 1000: cap at 1.5
  return 1.5;
}

function getCardioAmbitionMultiplier(weeklyTarget: number): number {
  if (weeklyTarget < 60) return 0.5;
  if (weeklyTarget < 120) return 0.7;
  if (weeklyTarget < 180) return 0.85;
  if (weeklyTarget < 240) return 1.0;
  if (weeklyTarget < 300) return 1.2;
  if (weeklyTarget < 360) return 1.4;
  if (weeklyTarget < 420) return 1.6;
  if (weeklyTarget < 480) return 1.8;
  return 2.0;
}

function getLiftingAmbitionMultiplier(weeklyTarget: number): number {
  if (weeklyTarget < 1000) return 0.5;
  if (weeklyTarget < 2500) return 0.7;
  if (weeklyTarget < 5000) return 0.85;
  if (weeklyTarget < 7500) return 1.0;
  if (weeklyTarget < 10000) return 1.2;
  if (weeklyTarget < 12500) return 1.4;
  if (weeklyTarget < 15000) return 1.6;
  if (weeklyTarget < 20000) return 1.8;
  return 2.0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getScoreLabel(score: number): string {
  if (score < 200) return 'Beginner';
  if (score < 400) return 'Building';
  if (score < 600) return 'Consistent';
  if (score < 750) return 'Advanced';
  if (score < 900) return 'Elite';
  return 'Legend';
}

function getDateMinusDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getLastNDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/aptos-score', {
    schema: {
      description: 'Calculate fitness score for a user',
      tags: ['aptos-score'],
      querystring: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string', description: 'User ID' },
          days: { type: 'integer', description: 'Number of days to analyze (default 7)', default: 7 },
        },
      },
      response: {
        200: {
          description: 'Aptos score calculated',
          type: 'object',
          properties: {
            score: { type: 'number' },
            label: { type: 'string' },
            breakdown: {
              type: 'object',
              properties: {
                calorie_score: { type: 'number' },
                calorie_adherence_pct: { type: 'number' },
                calorie_ambition_multiplier: { type: 'number' },
                fitness_score: { type: 'number' },
                fitness_adherence_pct: { type: 'number' },
                fitness_ambition_multiplier: { type: 'number' },
                consistency_score: { type: 'number' },
                consistency_pct: { type: 'number' },
                days_analyzed: { type: 'number' },
              },
            },
          },
        },
        400: {
          description: 'Missing user_id',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'User profile not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: AptosScoreQuery }>, reply: FastifyReply) => {
    const { user_id, days = 7 } = request.query;

    if (!user_id) {
      app.logger.warn({}, 'Missing user_id in aptos-score request');
      return reply.status(400).send({ error: 'user_id is required' });
    }

    app.logger.info({ user_id, days }, 'Calculating aptos score');

    // Get user profile
    const profile = await app.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, user_id));

    if (profile.length === 0) {
      app.logger.warn({ user_id }, 'User profile not found');
      return reply.status(404).send({ error: 'User profile not found' });
    }

    const user = profile[0];
    const datesToAnalyze = getLastNDates(days);
    const startDate = datesToAnalyze[0];

    // Fetch food logs
    const foodLogs = await app.db
      .select()
      .from(schema.foodLogs)
      .where(and(
        eq(schema.foodLogs.user_id, user_id),
        gte(schema.foodLogs.date, startDate),
      ));

    // Fetch exercise logs
    const exerciseLogs = await app.db
      .select()
      .from(schema.exerciseLogs)
      .where(and(
        eq(schema.exerciseLogs.user_id, user_id),
        gte(schema.exerciseLogs.date, startDate),
      ));

    // Group by date
    const foodByDate: Record<string, typeof foodLogs> = {};
    const exerciseByDate: Record<string, typeof exerciseLogs> = {};

    for (const food of foodLogs) {
      if (!foodByDate[food.date]) foodByDate[food.date] = [];
      foodByDate[food.date].push(food);
    }

    for (const exercise of exerciseLogs) {
      if (!exerciseByDate[exercise.date]) exerciseByDate[exercise.date] = [];
      exerciseByDate[exercise.date].push(exercise);
    }

    // === CALORIE SCORE ===
    const estimatedTDEE = getActivityTDEEMultiplier(user.activity_level);
    const impliedDeficit = estimatedTDEE - user.goal_calories;
    const calorieAmbitionMultiplier = getCalorieAmbitionMultiplier(impliedDeficit);

    let totalCalorieAdherence = 0;
    let daysWithFood = 0;

    for (const date of datesToAnalyze) {
      const dayFoods = foodByDate[date] || [];
      if (dayFoods.length === 0) {
        totalCalorieAdherence += 0;
      } else {
        const actualCalories = dayFoods.reduce((sum, f) => sum + f.calories, 0);
        const adherence = clamp(1 - Math.abs(actualCalories - user.goal_calories) / user.goal_calories, 0, 1);
        totalCalorieAdherence += adherence;
        daysWithFood++;
      }
    }

    const averageCalorieAdherence = daysWithFood > 0 ? totalCalorieAdherence / days : 0;
    const calorieScore = clamp(averageCalorieAdherence * calorieAmbitionMultiplier * 400, 0, 400);
    const calorieAdherencePct = Math.round(averageCalorieAdherence * 100);

    // === FITNESS SCORE ===
    const cardioAmbitionMultiplier = getCardioAmbitionMultiplier(user.goal_cardio_minutes);
    const liftingAmbitionMultiplier = getLiftingAmbitionMultiplier(user.goal_lifting_volume_lbs);
    const fitnessAmbitionMultiplier = (cardioAmbitionMultiplier + liftingAmbitionMultiplier) / 2;

    let totalLiftingVolume = 0;
    let totalCardioMinutes = 0;
    let daysWithExercise = 0;

    for (const date of datesToAnalyze) {
      const dayExercises = exerciseByDate[date] || [];
      if (dayExercises.length === 0) continue;

      daysWithExercise++;

      for (const exercise of dayExercises) {
        if (exercise.exercise_type === 'strength') {
          const volume = ((exercise.sets || 0) * (exercise.reps || 0) * (exercise.weight_lbs || 0));
          totalLiftingVolume += volume;
        }
        if (exercise.exercise_type === 'cardio') {
          totalCardioMinutes += exercise.duration_minutes || 0;
        }
      }
    }

    const weeklyVolume = (totalLiftingVolume * 7) / days;
    const weeklyCardio = (totalCardioMinutes * 7) / days;

    const volumeAdherence = user.goal_lifting_volume_lbs > 0
      ? Math.min(1, weeklyVolume / user.goal_lifting_volume_lbs)
      : 1.0;

    const cardioAdherence = user.goal_cardio_minutes > 0
      ? Math.min(1, weeklyCardio / user.goal_cardio_minutes)
      : 1.0;

    const combinedFitnessAdherence = (volumeAdherence + cardioAdherence) / 2;
    const fitnessScore = clamp(combinedFitnessAdherence * fitnessAmbitionMultiplier * 400, 0, 400);
    const fitnessAdherencePct = Math.round(combinedFitnessAdherence * 100);

    // === CONSISTENCY SCORE ===
    let daysWithBoth = 0;

    for (const date of datesToAnalyze) {
      const hasFoods = (foodByDate[date] || []).length > 0;
      const hasExercise = (exerciseByDate[date] || []).length > 0;
      if (hasFoods && hasExercise) {
        daysWithBoth++;
      }
    }

    const consistencyRatio = daysWithBoth / days;
    const consistencyScore = consistencyRatio * 200;
    const consistencyPct = Math.round(consistencyRatio * 100);

    // === TOTAL SCORE ===
    const totalScore = Math.round(clamp(calorieScore + fitnessScore + consistencyScore, 0, 1000));
    const label = getScoreLabel(totalScore);

    const response: AptosScoreResponse = {
      score: totalScore,
      label,
      breakdown: {
        calorie_score: Math.round(calorieScore),
        calorie_adherence_pct: calorieAdherencePct,
        calorie_ambition_multiplier: calorieAmbitionMultiplier,
        fitness_score: Math.round(fitnessScore),
        fitness_adherence_pct: fitnessAdherencePct,
        fitness_ambition_multiplier: fitnessAmbitionMultiplier,
        consistency_score: Math.round(consistencyScore),
        consistency_pct: consistencyPct,
        days_analyzed: days,
      },
    };

    app.logger.info({ user_id, score: totalScore, label }, 'Aptos score calculated successfully');

    return response;
  });
}
