CREATE TABLE "bot_duels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"opponent" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"bot_schedule" jsonb NOT NULL,
	"result" text,
	"finished_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bot_duels_opponent" CHECK ("bot_duels"."opponent" in ('meera', 'arjun', 'harpreet')),
	CONSTRAINT "bot_duels_result" CHECK ("bot_duels"."result" is null or "bot_duels"."result" in ('won', 'lost', 'gave-up'))
);
--> statement-breakpoint
ALTER TABLE "bot_duels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot_duels" ADD CONSTRAINT "bot_duels_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_duels" ADD CONSTRAINT "bot_duels_problem_id_duel_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."duel_problems"("id") ON DELETE cascade ON UPDATE no action;