CREATE TABLE IF NOT EXISTS "wynndle_guesses" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wynndle_puzzles" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"date" text NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"game_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wynndle_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"puzzle_id" text NOT NULL,
	"user_id" text,
	"anon_key" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"solved_at" timestamp with time zone,
	"hints_revealed" integer DEFAULT 0 NOT NULL,
	"guess_count" integer DEFAULT 0 NOT NULL,
	"won" integer DEFAULT 0 NOT NULL,
	"finished" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wynndle_streaks" (
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"longest" integer DEFAULT 0 NOT NULL,
	"last_solved" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wynndle_streaks_user_id_mode_pk" PRIMARY KEY("user_id","mode")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wynndle_guesses" ADD CONSTRAINT "wynndle_guesses_round_id_wynndle_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."wynndle_rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wynndle_rounds" ADD CONSTRAINT "wynndle_rounds_puzzle_id_wynndle_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."wynndle_puzzles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wynndle_rounds" ADD CONSTRAINT "wynndle_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wynndle_streaks" ADD CONSTRAINT "wynndle_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wynndle_guesses_round_ordinal_idx" ON "wynndle_guesses" USING btree ("round_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wynndle_puzzles_mode_date_idx" ON "wynndle_puzzles" USING btree ("mode","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wynndle_rounds_puzzle_user_idx" ON "wynndle_rounds" USING btree ("puzzle_id","user_id") WHERE "wynndle_rounds"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wynndle_rounds_puzzle_anon_idx" ON "wynndle_rounds" USING btree ("puzzle_id","anon_key") WHERE "wynndle_rounds"."anon_key" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wynndle_rounds_user_idx" ON "wynndle_rounds" USING btree ("user_id");