ALTER TABLE "users" ADD COLUMN "discord_join_status" text DEFAULT 'unset' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_joined_at" timestamp with time zone;