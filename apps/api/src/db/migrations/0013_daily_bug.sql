CREATE TABLE "daily_bug_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"problem_id" uuid NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"solved_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_bug_plays_once_a_day" UNIQUE("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "daily_bug_plays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_bug_plays" ADD CONSTRAINT "daily_bug_plays_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_bug_plays" ADD CONSTRAINT "daily_bug_plays_problem_id_duel_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."duel_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_bug_plays_board" ON "daily_bug_plays" USING btree ("day","solved_at");