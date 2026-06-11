CREATE TABLE IF NOT EXISTS "stock_admin_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_blob" (
	"sha256" text PRIMARY KEY NOT NULL,
	"byte_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"original_filename" text NOT NULL,
	"ref_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_creation" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"author_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"classes" text[] DEFAULT '{}'::text[] NOT NULL,
	"category" text NOT NULL,
	"credits_note" text DEFAULT '' NOT NULL,
	"install_count" integer DEFAULT 0 NOT NULL,
	"reaction_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discord_thread_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_credit" (
	"creation_id" text NOT NULL,
	"credited_creation_id" text NOT NULL,
	CONSTRAINT "stock_credit_creation_id_credited_creation_id_pk" PRIMARY KEY("creation_id","credited_creation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_media" (
	"id" text PRIMARY KEY NOT NULL,
	"creation_id" text NOT NULL,
	"order" integer NOT NULL,
	"blob_sha256" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_part" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"order" integer NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"group" text,
	"text_content" text,
	"blob_sha256" text,
	"blob_filename" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_reaction" (
	"user_id" text NOT NULL,
	"creation_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reaction_user_id_creation_id_emoji_pk" PRIMARY KEY("user_id","creation_id","emoji")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_report" (
	"id" text PRIMARY KEY NOT NULL,
	"creation_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_version" (
	"id" text PRIMARY KEY NOT NULL,
	"creation_id" text NOT NULL,
	"number" integer NOT NULL,
	"label" text NOT NULL,
	"changelog" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_admin_audit_log" ADD CONSTRAINT "stock_admin_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_creation" ADD CONSTRAINT "stock_creation_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_credit" ADD CONSTRAINT "stock_credit_creation_id_stock_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."stock_creation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_credit" ADD CONSTRAINT "stock_credit_credited_creation_id_stock_creation_id_fk" FOREIGN KEY ("credited_creation_id") REFERENCES "public"."stock_creation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_media" ADD CONSTRAINT "stock_media_creation_id_stock_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."stock_creation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_media" ADD CONSTRAINT "stock_media_blob_sha256_stock_blob_sha256_fk" FOREIGN KEY ("blob_sha256") REFERENCES "public"."stock_blob"("sha256") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_part" ADD CONSTRAINT "stock_part_version_id_stock_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."stock_version"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_part" ADD CONSTRAINT "stock_part_blob_sha256_stock_blob_sha256_fk" FOREIGN KEY ("blob_sha256") REFERENCES "public"."stock_blob"("sha256") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reaction" ADD CONSTRAINT "stock_reaction_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reaction" ADD CONSTRAINT "stock_reaction_creation_id_stock_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."stock_creation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_report" ADD CONSTRAINT "stock_report_creation_id_stock_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."stock_creation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_report" ADD CONSTRAINT "stock_report_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_version" ADD CONSTRAINT "stock_version_creation_id_stock_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."stock_creation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_admin_audit_actor_idx" ON "stock_admin_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_admin_audit_target_idx" ON "stock_admin_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_creation_slug_idx" ON "stock_creation" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_creation_author_idx" ON "stock_creation" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_creation_kind_idx" ON "stock_creation" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_creation_category_idx" ON "stock_creation" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_creation_last_activity_idx" ON "stock_creation" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_credit_credited_idx" ON "stock_credit" USING btree ("credited_creation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_media_creation_idx" ON "stock_media" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_part_version_idx" ON "stock_part" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_part_blob_idx" ON "stock_part" USING btree ("blob_sha256");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reaction_creation_idx" ON "stock_reaction" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_report_creation_idx" ON "stock_report" USING btree ("creation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_version_creation_number_idx" ON "stock_version" USING btree ("creation_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_version_draft_idx" ON "stock_version" USING btree ("creation_id") WHERE status = 'draft';--> statement-breakpoint
ALTER TABLE "stock_creation"
  ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_creation_search_tsv_idx" ON "stock_creation" USING gin ("search_tsv");