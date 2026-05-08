import { pgTable, text, integer, real, pgEnum, unique, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const activityLevelEnum = pgEnum('activity_level', [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active',
]);

export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]);

export const exerciseTypeEnum = pgEnum('exercise_type', [
  'strength',
  'cardio',
  'hiit',
  'flexibility',
  'other',
]);

export const friendRequestStatusEnum = pgEnum('friend_request_status', [
  'pending',
  'accepted',
  'declined',
]);

export const postTypeEnum = pgEnum('post_type', [
  'workout',
  'meal',
]);

export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  weight_lbs: real('weight_lbs').notNull(),
  height_inches: real('height_inches').notNull(),
  activity_level: activityLevelEnum('activity_level').notNull(),
  goal_calories: integer('goal_calories').notNull(),
  goal_protein_g: integer('goal_protein_g').notNull(),
  goal_carbs_g: integer('goal_carbs_g').notNull(),
  goal_fat_g: integer('goal_fat_g').notNull(),
  goal_lifting_volume_lbs: integer('goal_lifting_volume_lbs').notNull(),
  goal_cardio_minutes: integer('goal_cardio_minutes').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const foodLogs = pgTable('food_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => userProfiles.id),
  date: text('date').notNull(),
  meal_type: mealTypeEnum('meal_type').notNull(),
  food_name: text('food_name').notNull(),
  calories: real('calories').notNull(),
  protein_g: real('protein_g').notNull(),
  carbs_g: real('carbs_g').notNull(),
  fat_g: real('fat_g').notNull(),
  created_at: text('created_at').notNull(),
});

export const exerciseLogs = pgTable('exercise_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => userProfiles.id),
  date: text('date').notNull(),
  exercise_name: text('exercise_name').notNull(),
  exercise_type: exerciseTypeEnum('exercise_type').notNull(),
  sets: integer('sets'),
  reps: integer('reps'),
  weight_lbs: real('weight_lbs'),
  duration_minutes: integer('duration_minutes'),
  distance_miles: real('distance_miles'),
  calories_burned: real('calories_burned'),
  notes: text('notes'),
  created_at: text('created_at').notNull(),
});

export const weightLogs = pgTable('weight_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => userProfiles.id),
  date: text('date').notNull(),
  weight_lbs: real('weight_lbs').notNull(),
  created_at: text('created_at').notNull(),
});

export const friendRequests = pgTable('friend_requests', {
  id: text('id').primaryKey(),
  requester_id: text('requester_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recipient_id: text('recipient_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: friendRequestStatusEnum('status').notNull().default('pending'),
  created_at: text('created_at').notNull(),
});

export const sharedPosts = pgTable('shared_posts', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  post_type: postTypeEnum('post_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  data: text('data').notNull(),
  likes_count: integer('likes_count').notNull().default(0),
  created_at: text('created_at').notNull(),
});

export const postLikes = pgTable('post_likes', {
  id: text('id').primaryKey(),
  post_id: text('post_id').notNull().references(() => sharedPosts.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  created_at: text('created_at').notNull(),
}, (table) => ({
  uniqPostUser: unique('unique_post_user').on(table.post_id, table.user_id),
}));

export const vipAccess = pgTable('vip_access', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  label: text('label'),
  granted_by: text('granted_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
