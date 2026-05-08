import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, gte, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface WeightLogBody {
  user_id: string;
  date: string;
  weight_lbs: number;
}

interface WeightLogsQuery {
  user_id: string;
  days?: number;
}

interface WeightLogParams {
  id: string;
}

function generateId(): string {
  return randomUUID();
}

function getDateMinusDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/weight-logs', {
    schema: {
      description: 'Get weight logs for a user',
      tags: ['weight-logs'],
      querystring: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string', description: 'User device ID' },
          days: { type: 'number', description: 'Number of days to retrieve (default 90)', default: 90 },
        },
      },
      response: {
        200: {
          description: 'Weight logs retrieved',
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
                  weight_lbs: { type: 'number' },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: WeightLogsQuery }>, reply: FastifyReply) => {
    const { user_id, days = 90 } = request.query;
    app.logger.info({ user_id, days }, 'Fetching weight logs');

    const startDate = getDateMinusDays(new Date(), days);

    const logs = await app.db
      .select()
      .from(schema.weightLogs)
      .where(and(
        eq(schema.weightLogs.user_id, user_id),
        gte(schema.weightLogs.date, startDate),
      ))
      .orderBy(schema.weightLogs.date);

    app.logger.info({ user_id, days, logCount: logs.length }, 'Weight logs retrieved');

    return { logs };
  });

  fastify.post('/api/weight-logs', {
    schema: {
      description: 'Create a new weight log entry',
      tags: ['weight-logs'],
      body: {
        type: 'object',
        required: ['user_id', 'date', 'weight_lbs'],
        properties: {
          user_id: { type: 'string' },
          date: { type: 'string' },
          weight_lbs: { type: 'number' },
        },
      },
      response: {
        201: {
          description: 'Weight log created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            date: { type: 'string' },
            weight_lbs: { type: 'number' },
            created_at: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: WeightLogBody }>, reply: FastifyReply) => {
    const body = request.body;
    const id = generateId();
    const now = new Date().toISOString();

    app.logger.info({ id, user_id: body.user_id }, 'Creating weight log');

    const created = await app.db
      .insert(schema.weightLogs)
      .values({
        id,
        ...body,
        created_at: now,
      })
      .returning();

    app.logger.info({ id, user_id: body.user_id }, 'Weight log created successfully');

    reply.status(201);
    return created[0];
  });

  fastify.delete('/api/weight-logs/:id', {
    schema: {
      description: 'Delete a weight log entry',
      tags: ['weight-logs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Weight log deleted',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: WeightLogParams }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ id }, 'Deleting weight log');

    await app.db.delete(schema.weightLogs).where(eq(schema.weightLogs.id, id));

    app.logger.info({ id }, 'Weight log deleted successfully');

    return { success: true };
  });
}
