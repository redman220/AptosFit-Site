import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface ProfileBody {
  name: string;
  age: number;
  weight_lbs: number;
  height_inches: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  goal_lifting_volume_lbs: number;
  goal_cardio_minutes: number;
}

interface ProfileParams {
  userId: string;
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/profile/:userId', {
    schema: {
      description: 'Get a user profile by ID',
      tags: ['profiles'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'User device ID' },
        },
      },
      response: {
        200: {
          description: 'Profile found',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            age: { type: 'number' },
            weight_lbs: { type: 'number' },
            height_inches: { type: 'number' },
            activity_level: { type: 'string' },
            goal_calories: { type: 'number' },
            goal_protein_g: { type: 'number' },
            goal_carbs_g: { type: 'number' },
            goal_fat_g: { type: 'number' },
            goal_lifting_volume_lbs: { type: 'number' },
            goal_cardio_minutes: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
        404: {
          description: 'Profile not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: ProfileParams }>, reply: FastifyReply) => {
    const { userId } = request.params;
    app.logger.info({ userId }, 'Fetching profile');

    const profile = await app.db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.id, userId),
    });

    if (!profile) {
      app.logger.warn({ userId }, 'Profile not found');
      return reply.status(404).send({ error: 'Profile not found' });
    }

    app.logger.info({ userId }, 'Profile retrieved successfully');
    return profile;
  });

  fastify.put('/api/profile/:userId', {
    schema: {
      description: 'Create or update a user profile',
      tags: ['profiles'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'User device ID' },
        },
      },
      body: {
        type: 'object',
        required: ['name', 'age', 'weight_lbs', 'height_inches', 'activity_level', 'goal_calories', 'goal_protein_g', 'goal_carbs_g', 'goal_fat_g', 'goal_lifting_volume_lbs', 'goal_cardio_minutes'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          weight_lbs: { type: 'number' },
          height_inches: { type: 'number' },
          activity_level: { type: 'string', enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'] },
          goal_calories: { type: 'number' },
          goal_protein_g: { type: 'number' },
          goal_carbs_g: { type: 'number' },
          goal_fat_g: { type: 'number' },
          goal_lifting_volume_lbs: { type: 'number' },
          goal_cardio_minutes: { type: 'number' },
        },
      },
      response: {
        200: {
          description: 'Profile upserted successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            age: { type: 'number' },
            weight_lbs: { type: 'number' },
            height_inches: { type: 'number' },
            activity_level: { type: 'string' },
            goal_calories: { type: 'number' },
            goal_protein_g: { type: 'number' },
            goal_carbs_g: { type: 'number' },
            goal_fat_g: { type: 'number' },
            goal_lifting_volume_lbs: { type: 'number' },
            goal_cardio_minutes: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: ProfileParams; Body: ProfileBody }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const body = request.body;
    app.logger.info({ userId, body }, 'Upserting profile');

    const now = new Date().toISOString();

    // Check if profile exists
    const existing = await app.db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.id, userId),
    });

    let result;
    if (existing) {
      // Update existing profile
      const updated = await app.db
        .update(schema.userProfiles)
        .set({
          ...body,
          updated_at: now,
        })
        .where(eq(schema.userProfiles.id, userId))
        .returning();
      result = updated[0];
      app.logger.info({ userId }, 'Profile updated successfully');
    } else {
      // Insert new profile
      const inserted = await app.db
        .insert(schema.userProfiles)
        .values({
          id: userId,
          ...body,
          created_at: now,
          updated_at: now,
        })
        .returning();
      result = inserted[0];
      app.logger.info({ userId }, 'Profile created successfully');
    }

    return result;
  });
}
