import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface ExerciseLogBody {
  user_id: string;
  date: string;
  exercise_name: string;
  exercise_type: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'other';
  sets?: number;
  reps?: number;
  weight_lbs?: number;
  duration_minutes?: number;
  distance_miles?: number;
  calories_burned?: number;
  notes?: string;
}

interface ExerciseLogsQuery {
  user_id: string;
  date: string;
}

interface ExerciseLogParams {
  id: string;
}

function generateId(): string {
  return randomUUID();
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/exercise-logs', {
    schema: {
      description: 'Get exercise logs for a user on a specific date',
      tags: ['exercise-logs'],
      querystring: {
        type: 'object',
        required: ['user_id', 'date'],
        properties: {
          user_id: { type: 'string', description: 'User device ID' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        },
      },
      response: {
        200: {
          description: 'Exercise logs retrieved',
          type: 'object',
          properties: {
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  user_id: { type: 'string' },
                  date: { type: 'string' },
                  exercise_name: { type: 'string' },
                  exercise_type: { type: 'string' },
                  sets: { type: ['number', 'null'] },
                  reps: { type: ['number', 'null'] },
                  weight_lbs: { type: ['number', 'null'] },
                  duration_minutes: { type: ['number', 'null'] },
                  distance_miles: { type: ['number', 'null'] },
                  calories_burned: { type: ['number', 'null'] },
                  notes: { type: ['string', 'null'] },
                  created_at: { type: 'string' },
                },
              },
            },
            total_calories_burned: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: ExerciseLogsQuery }>, reply: FastifyReply) => {
    const { user_id, date } = request.query;
    app.logger.info({ user_id, date }, 'Fetching exercise logs');

    const logs = await app.db
      .select()
      .from(schema.exerciseLogs)
      .where(and(
        eq(schema.exerciseLogs.user_id, user_id),
        eq(schema.exerciseLogs.date, date),
      ))
      .orderBy(schema.exerciseLogs.created_at);

    let total_calories_burned = 0;
    for (const log of logs) {
      if (log.calories_burned) {
        total_calories_burned += log.calories_burned;
      }
    }

    app.logger.info({ user_id, date, logCount: logs.length }, 'Exercise logs retrieved');

    return {
      logs,
      total_calories_burned,
    };
  });

  fastify.post('/api/exercise-logs', {
    schema: {
      description: 'Create a new exercise log entry',
      tags: ['exercise-logs'],
      body: {
        type: 'object',
        required: ['user_id', 'date', 'exercise_name', 'exercise_type'],
        properties: {
          user_id: { type: 'string' },
          date: { type: 'string' },
          exercise_name: { type: 'string' },
          exercise_type: { type: 'string', enum: ['strength', 'cardio', 'hiit', 'flexibility', 'other'] },
          sets: { type: ['number', 'null'] },
          reps: { type: ['number', 'null'] },
          weight_lbs: { type: ['number', 'null'] },
          duration_minutes: { type: ['number', 'null'] },
          distance_miles: { type: ['number', 'null'] },
          calories_burned: { type: ['number', 'null'] },
          notes: { type: ['string', 'null'] },
        },
      },
      response: {
        201: {
          description: 'Exercise log created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            date: { type: 'string' },
            exercise_name: { type: 'string' },
            exercise_type: { type: 'string' },
            sets: { type: ['number', 'null'] },
            reps: { type: ['number', 'null'] },
            weight_lbs: { type: ['number', 'null'] },
            duration_minutes: { type: ['number', 'null'] },
            distance_miles: { type: ['number', 'null'] },
            calories_burned: { type: ['number', 'null'] },
            notes: { type: ['string', 'null'] },
            created_at: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: ExerciseLogBody }>, reply: FastifyReply) => {
    const body = request.body;
    const id = generateId();
    const now = new Date().toISOString();

    app.logger.info({ id, user_id: body.user_id }, 'Creating exercise log');

    const created = await app.db
      .insert(schema.exerciseLogs)
      .values({
        id,
        ...body,
        created_at: now,
      })
      .returning();

    app.logger.info({ id, user_id: body.user_id }, 'Exercise log created successfully');

    reply.status(201);
    return created[0];
  });

  fastify.delete('/api/exercise-logs/:id', {
    schema: {
      description: 'Delete an exercise log entry',
      tags: ['exercise-logs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Exercise log deleted',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: ExerciseLogParams }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ id }, 'Deleting exercise log');

    await app.db.delete(schema.exerciseLogs).where(eq(schema.exerciseLogs.id, id));

    app.logger.info({ id }, 'Exercise log deleted successfully');

    return { success: true };
  });
}
