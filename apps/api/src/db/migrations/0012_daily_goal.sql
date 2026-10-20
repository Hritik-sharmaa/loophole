ALTER TABLE "profiles" ADD COLUMN "daily_goal" smallint;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_daily_goal" CHECK ("profiles"."daily_goal" in (10, 20, 30));