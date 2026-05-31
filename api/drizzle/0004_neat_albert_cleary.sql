CREATE TABLE IF NOT EXISTS "og_image_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text DEFAULT 'image/png' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
