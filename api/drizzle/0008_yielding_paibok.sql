CREATE TABLE IF NOT EXISTS "crafted_item_credits" (
	"item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "crafted_item_credits_item_id_user_id_pk" PRIMARY KEY("item_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "crafted_items" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "crafted_items" ADD COLUMN "notes" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crafted_item_credits" ADD CONSTRAINT "crafted_item_credits_item_id_crafted_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."crafted_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crafted_item_credits" ADD CONSTRAINT "crafted_item_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crafted_item_credits_user_id_idx" ON "crafted_item_credits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crafted_items_tags_gin" ON "crafted_items" USING gin ("tags");