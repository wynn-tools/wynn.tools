CREATE TABLE IF NOT EXISTS "weight_cache" (
	"item_name" text PRIMARY KEY NOT NULL,
	"nori" jsonb,
	"wynnpool" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
