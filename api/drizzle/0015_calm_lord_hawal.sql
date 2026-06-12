CREATE TABLE IF NOT EXISTS "stock_rate_bucket" (
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stock_rate_bucket_user_id_action_window_start_pk" PRIMARY KEY("user_id","action","window_start")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_rate_bucket" ADD CONSTRAINT "stock_rate_bucket_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
