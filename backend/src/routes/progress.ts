import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface ProgressQuery {
  days?: number;
}

interface ProgressParams {
  userId: string;
}

interface WeightTrendItem {
  date: string;
  weight_lbs: number;
}

interface CalorieTrendItem {
  date: string;
  calories_consumed: number;
  calories_burned: number;
}

interface ActivityTrendItem {
  date: string;
  exercise_count: number;
  total_calories_burned: number;
}

function getDateMinusDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(monday.getDate() - daysToMonday);
  return monday.toISOString().split('T')[0];
}

function getSundayOfCurrentWeek(): string {
  const monday = getMondayOfCurrentWeek();
  const [year, month, day] = monday.split('-');
  const mondayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  mondayDate.setDate(mondayDate.getDate() + 6);
  return mondayDate.toISOString().split('T')[0];
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/progress/:userId', {
    schema: {
      description: 'Get progress metrics for a user',
      tags: ['progress'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'User device ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to analyze (default 30)', default: 30 },
        },
      },
      response: {
        200: {
          description: 'Progress metrics',
          type: 'object',
          properties: {
            weight_trend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  weight_lbs: { type: 'number' },
                },
              },
            },
            calorie_trend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  calories_consumed: { type: 'number' },
                  calories_burned: { type: 'number' },
                },
              },
            },
            activity_trend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  exercise_count: { type: 'number' },
                  total_calories_burned: { type: 'number' },
                },
              },
            },
            weekly_lifting_volume: { type: 'number' },
            weekly_cardio_minutes: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: ProgressParams; Querystring: ProgressQuery }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const { days = 30 } = request.query;

    app.logger.info({ userId, days }, 'Fetching progress metrics');

    const startDate = getDateMinusDays(new Date(), days);
    const weekStart = getMondayOfCurrentWeek();
    const weekEnd = getSundayOfCurrentWeek();

    // Weight trend
    const weightLogs = await app.db
      .select()
      .from(schema.weightLogs)
      .where(and(
        eq(schema.weightLogs.user_id, userId),
        gte(schema.weightLogs.date, startDate),
      ))
      .orderBy(schema.weightLogs.date);

    const weight_trend: WeightTrendItem[] = weightLogs.map(log => ({
      date: log.date,
      weight_lbs: log.weight_lbs,
    }));

    // Food logs grouped by date
    const foodLogs = await app.db
      .select()
      .from(schema.foodLogs)
      .where(and(
        eq(schema.foodLogs.user_id, userId),
        gte(schema.foodLogs.date, startDate),
      ));

    // Exercise logs grouped by date
    const exerciseLogs = await app.db
      .select()
      .from(schema.exerciseLogs)
      .where(and(
        eq(schema.exerciseLogs.user_id, userId),
        gte(schema.exerciseLogs.date, startDate),
      ));

    // Build calorie trend
    const calorieMap: Record<string, { consumed: number; burned: number }> = {};

    for (const log of foodLogs) {
      if (!calorieMap[log.date]) {
        calorieMap[log.date] = { consumed: 0, burned: 0 };
      }
      calorieMap[log.date].consumed += log.calories;
    }

    for (const log of exerciseLogs) {
      if (!calorieMap[log.date]) {
        calorieMap[log.date] = { consumed: 0, burned: 0 };
      }
      if (log.calories_burned) {
        calorieMap[log.date].burned += log.calories_burned;
      }
    }

    const calorie_trend: CalorieTrendItem[] = Object.entries(calorieMap)
      .map(([date, data]) => ({
        date,
        calories_consumed: data.consumed,
        calories_burned: data.burned,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build activity trend
    const activityMap: Record<string, { count: number; calories: number }> = {};

    for (const log of exerciseLogs) {
      if (!activityMap[log.date]) {
        activityMap[log.date] = { count: 0, calories: 0 };
      }
      activityMap[log.date].count += 1;
      if (log.calories_burned) {
        activityMap[log.date].calories += log.calories_burned;
      }
    }

    const activity_trend: ActivityTrendItem[] = Object.entries(activityMap)
      .map(([date, data]) => ({
        date,
        exercise_count: data.count,
        total_calories_burned: data.calories,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly lifting volume
    let weekly_lifting_volume = 0;
    for (const log of exerciseLogs) {
      if (
        log.exercise_type === 'strength' &&
        log.date >= weekStart &&
        log.date <= weekEnd &&
        log.sets !== null &&
        log.reps !== null &&
        log.weight_lbs !== null
      ) {
        weekly_lifting_volume += log.sets * log.reps * log.weight_lbs;
      }
    }

    // Weekly cardio minutes
    let weekly_cardio_minutes = 0;
    for (const log of exerciseLogs) {
      if (
        (log.exercise_type === 'cardio' || log.exercise_type === 'hiit') &&
        log.date >= weekStart &&
        log.date <= weekEnd &&
        log.duration_minutes !== null
      ) {
        weekly_cardio_minutes += log.duration_minutes;
      }
    }

    app.logger.info({ userId }, 'Progress metrics computed successfully');

    return {
      weight_trend,
      calorie_trend,
      activity_trend,
      weekly_lifting_volume,
      weekly_cardio_minutes,
    };
  });
}
