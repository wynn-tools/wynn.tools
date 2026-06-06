CREATE TABLE IF NOT EXISTS "build_credits" (
	"build_id" text NOT NULL,
	"user_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "build_credits_build_id_user_id_pk" PRIMARY KEY("build_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "tutorial_url" text;--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kind" text DEFAULT 'real' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "build_credits" ADD CONSTRAINT "build_credits_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "build_credits" ADD CONSTRAINT "build_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "build_credits_user_id_idx" ON "build_credits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_idx" ON "users" USING btree (lower("username"));