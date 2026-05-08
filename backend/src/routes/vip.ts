import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';


async function isOwner(authenticatedUserId: string, app: App): Promise<boolean> {
  const allUsers = await app.db
    .select({ id: authSchema.user.id, createdAt: authSchema.user.createdAt })
    .from(authSchema.user)
    .orderBy(asc(authSchema.user.createdAt));

  if (allUsers.length === 0) {
    app.logger.warn({}, 'No users found in database');
    return false;
  }

  const firstUserId = allUsers[0].id;
  const result = firstUserId === authenticatedUserId;

  app.logger.debug({
    authenticatedUserId,
    firstUserId,
    isOwner: result,
    allUsersCount: allUsers.length
  }, 'Owner check result');

  return result;
}

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/vip/check
  fastify.get('/api/vip/check', {
    schema: {
      description: 'Check if current user has VIP access',
      tags: ['vip'],
      response: {
        200: {
          description: 'VIP status',
          type: 'object',
          properties: {
            isVip: { type: 'boolean' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userEmail = session.user.email;
    app.logger.info({ email: userEmail }, 'Checking VIP status');

    const vipEntry = await app.db
      .select()
      .from(schema.vipAccess)
      .where(eq(schema.vipAccess.email, userEmail));

    const isVip = vipEntry.length > 0;
    app.logger.info({ email: userEmail, isVip }, 'VIP check completed');

    return { isVip };
  });

  // GET /api/vip
  fastify.get('/api/vip', {
    schema: {
      description: 'Get all VIP access entries (owner only)',
      tags: ['vip'],
      response: {
        200: {
          description: 'List of VIP entries',
          type: 'object',
          properties: {
            vips: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  label: { type: ['string', 'null'] },
                  granted_by: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden - owner only',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching VIP list');

    const owner = await isOwner(session.user.id, app);
    if (!owner) {
      app.logger.warn({ userId: session.user.id }, 'User not authorized to access VIP list');
      return reply.status(403).send({ error: 'Only owner can access VIP list' });
    }

    const vips = await app.db
      .select()
      .from(schema.vipAccess)
      .orderBy(desc(schema.vipAccess.created_at));

    app.logger.info({ count: vips.length }, 'VIP list retrieved');

    return { vips };
  });

  // POST /api/vip
  fastify.post('/api/vip', {
    schema: {
      description: 'Add a new VIP access entry (owner only)',
      tags: ['vip'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string' },
          label: { type: ['string', 'null'] },
        },
      },
      response: {
        201: {
          description: 'VIP entry created',
          type: 'object',
          properties: {
            vip: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                label: { type: ['string', 'null'] },
                granted_by: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          description: 'Invalid request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden - owner only',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        409: {
          description: 'Email already has VIP access',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { email: string; label?: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { email, label } = request.body;

    if (!email) {
      app.logger.warn({ userId: session.user.id }, 'Email missing in VIP creation request');
      return reply.status(400).send({ error: 'Email is required' });
    }

    app.logger.info({ userId: session.user.id, email }, 'Adding VIP access');

    const owner = await isOwner(session.user.id, app);
    if (!owner) {
      app.logger.warn({ userId: session.user.id }, 'User not authorized to add VIP access');
      return reply.status(403).send({ error: 'Only owner can grant VIP access' });
    }

    const id = randomUUID();

    try {
      const created = await app.db
        .insert(schema.vipAccess)
        .values({
          id,
          email,
          label: label || null,
          granted_by: session.user.id,
        })
        .returning();

      app.logger.info({ id, email }, 'VIP access granted successfully');

      reply.status(201);
      return { vip: created[0] };
    } catch (error: any) {
      if (error.message?.includes('unique constraint')) {
        app.logger.warn({ email }, 'Email already has VIP access');
        return reply.status(409).send({ error: 'Email already has VIP access' });
      }
      app.logger.error({ err: error, email }, 'Failed to grant VIP access');
      throw error;
    }
  });

  // DELETE /api/vip/:id
  fastify.delete('/api/vip/:id', {
    schema: {
      description: 'Remove VIP access (owner only)',
      tags: ['vip'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'VIP access removed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden - owner only',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'VIP entry not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;
    app.logger.info({ userId: session.user.id, id }, 'Removing VIP access');

    // Check if VIP entry exists before checking authorization
    const vipEntry = await app.db
      .select()
      .from(schema.vipAccess)
      .where(eq(schema.vipAccess.id, id));

    if (vipEntry.length === 0) {
      app.logger.warn({ id }, 'VIP entry not found');
      return reply.status(404).send({ error: 'VIP entry not found' });
    }

    const owner = await isOwner(session.user.id, app);
    if (!owner) {
      app.logger.warn({ userId: session.user.id }, 'User not authorized to remove VIP access');
      return reply.status(403).send({ error: 'Only owner can revoke VIP access' });
    }

    await app.db.delete(schema.vipAccess).where(eq(schema.vipAccess.id, id));

    app.logger.info({ id }, 'VIP access removed successfully');

    return { success: true };
  });
}
