ALTER TABLE "topics" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
-- Two statuses now: "open" topics become active, "wrapped up" ones become done.
UPDATE "topics" SET "status" = CASE "status" WHEN 'wrapped_up' THEN 'done' ELSE 'active' END;--> statement-breakpoint
DROP TYPE "public"."topic_status";--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('active', 'done');--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."topic_status";--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "status" SET DATA TYPE "public"."topic_status" USING "status"::"public"."topic_status";
