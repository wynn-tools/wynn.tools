CREATE TABLE IF NOT EXISTS "market_price_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"payload" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
