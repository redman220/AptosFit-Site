import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, or } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  fastify.delete('/api/account', {
    schema: {
      description: 'Permanently delete the authenticated user account and all associated data',
      tags: ['account'],
      response: {
        200: {
          description: 'Account deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        401: {
          description: 'Unauthorized - user not authenticated',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Internal server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: true } | { error: string } | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    app.logger.info({ userId }, 'Starting account deletion');

    try {
      // Delete in specific order to avoid FK constraint issues

      // 1. Delete exercise logs
      app.logger.debug({ userId }, 'Deleting exercise logs');
      await app.db
        .delete(schema.exerciseLogs)
        .where(eq(schema.exerciseLogs.user_id, userId));

      // 2. Delete food logs
      app.logger.debug({ userId }, 'Deleting food logs');
      await app.db
        .delete(schema.foodLogs)
        .where(eq(schema.foodLogs.user_id, userId));

      // 3. Delete weight logs
      app.logger.debug({ userId }, 'Deleting weight logs');
      await app.db
        .delete(schema.weightLogs)
        .where(eq(schema.weightLogs.user_id, userId));

      // 4. Delete post likes
      app.logger.debug({ userId }, 'Deleting post likes');
      await app.db
        .delete(schema.postLikes)
        .where(eq(schema.postLikes.user_id, userId));

      // 5. Delete shared posts (must come after post_likes)
      app.logger.debug({ userId }, 'Deleting shared posts');
      await app.db
        .delete(schema.sharedPosts)
        .where(eq(schema.sharedPosts.user_id, userId));

      // 6. Delete friend requests (where user is requester or recipient)
      app.logger.debug({ userId }, 'Deleting friend requests');
      await app.db
        .delete(schema.friendRequests)
        .where(
          or(
            eq(schema.friendRequests.requester_id, userId),
            eq(schema.friendRequests.recipient_id, userId),
          ),
        );

      // 7. Delete user profile
      app.logger.debug({ userId }, 'Deleting user profile');
      await app.db
        .delete(schema.userProfiles)
        .where(eq(schema.userProfiles.id, userId));

      app.logger.info({ userId }, 'Account deleted successfully');
      reply.status(200);
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to delete account');
      reply.status(500);
      return { error: 'Internal server error' };
    }
  });
}
