CREATE TABLE "vip_access" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"label" text,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vip_access_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "vip_access" ADD CONSTRAINT "vip_access_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;