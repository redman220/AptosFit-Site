import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface FoodLogBody {
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface FoodLogsQuery {
  user_id: string;
  date: string;
}

interface FoodLogParams {
  id: string;
}

function generateId(): string {
  return randomUUID();
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/food-logs', {
    schema: {
      description: 'Get food logs for a user on a specific date',
      tags: ['food-logs'],
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
          description: 'Food logs retrieved',
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
                  meal_type: { type: 'string' },
                  food_name: { type: 'string' },
                  calories: { type: 'number' },
                  protein_g: { type: 'number' },
                  carbs_g: { type: 'number' },
                  fat_g: { type: 'number' },
                  created_at: { type: 'string' },
                },
              },
            },
            totals: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein_g: { type: 'number' },
                carbs_g: { type: 'number' },
                fat_g: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: FoodLogsQuery }>, reply: FastifyReply) => {
    const { user_id, date } = request.query;
    app.logger.info({ user_id, date }, 'Fetching food logs');

    const logs = await app.db
      .select()
      .from(schema.foodLogs)
      .where(and(
        eq(schema.foodLogs.user_id, user_id),
        eq(schema.foodLogs.date, date),
      ))
      .orderBy(schema.foodLogs.created_at);

    let calories = 0;
    let protein_g = 0;
    let carbs_g = 0;
    let fat_g = 0;

    for (const log of logs) {
      calories += log.calories;
      protein_g += log.protein_g;
      carbs_g += log.carbs_g;
      fat_g += log.fat_g;
    }

    app.logger.info({ user_id, date, logCount: logs.length }, 'Food logs retrieved');

    return {
      logs,
      totals: { calories, protein_g, carbs_g, fat_g },
    };
  });

  fastify.post('/api/food-logs', {
    schema: {
      description: 'Create a new food log entry',
      tags: ['food-logs'],
      body: {
        type: 'object',
        required: ['user_id', 'date', 'meal_type', 'food_name', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
        properties: {
          user_id: { type: 'string' },
          date: { type: 'string' },
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          food_name: { type: 'string' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
      },
      response: {
        201: {
          description: 'Food log created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            date: { type: 'string' },
            meal_type: { type: 'string' },
            food_name: { type: 'string' },
            calories: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
            created_at: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: FoodLogBody }>, reply: FastifyReply) => {
    const body = request.body;
    const id = generateId();
    const now = new Date().toISOString();

    app.logger.info({ id, user_id: body.user_id }, 'Creating food log');

    const created = await app.db
      .insert(schema.foodLogs)
      .values({
        id,
        ...body,
        created_at: now,
      })
      .returning();

    app.logger.info({ id, user_id: body.user_id }, 'Food log created successfully');

    reply.status(201);
    return created[0];
  });

  fastify.delete('/api/food-logs/:id', {
    schema: {
      description: 'Delete a food log entry',
      tags: ['food-logs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Food log deleted',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: FoodLogParams }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ id }, 'Deleting food log');

    await app.db.delete(schema.foodLogs).where(eq(schema.foodLogs.id, id));

    app.logger.info({ id }, 'Food log deleted successfully');

    return { success: true };
  });
}
