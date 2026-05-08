CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');--> statement-breakpoint
CREATE TYPE "public"."exercise_type" AS ENUM('strength', 'cardio', 'hiit', 'flexibility', 'other');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"exercise_name" text NOT NULL,
	"exercise_type" "exercise_type" NOT NULL,
	"sets" integer,
	"reps" integer,
	"weight_lbs" real,
	"duration_minutes" integer,
	"distance_miles" real,
	"calories_burned" real,
	"notes" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"food_name" text NOT NULL,
	"calories" real NOT NULL,
	"protein_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"weight_lbs" real NOT NULL,
	"height_inches" real NOT NULL,
	"activity_level" "activity_level" NOT NULL,
	"goal_calories" integer NOT NULL,
	"goal_protein_g" integer NOT NULL,
	"goal_carbs_g" integer NOT NULL,
	"goal_fat_g" integer NOT NULL,
	"goal_lifting_volume_lbs" integer NOT NULL,
	"goal_cardio_minutes" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"weight_lbs" real NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;