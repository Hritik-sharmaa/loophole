ALTER TABLE "exercises" ADD COLUMN "prompt_hi" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "lesson_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_lesson_language" CHECK ("profiles"."lesson_language" in ('en', 'hinglish'));