CREATE TABLE "duel_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"language" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"buggy_code" text NOT NULL,
	"sample_tests" jsonb NOT NULL,
	"hidden_tests" jsonb NOT NULL,
	"difficulty" integer NOT NULL,
	CONSTRAINT "duel_problems_slug_unique" UNIQUE("slug"),
	CONSTRAINT "duel_problems_difficulty" CHECK ("duel_problems"."difficulty" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "duel_problems" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "duel_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"tests_passed" integer NOT NULL,
	"total_tests" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "duel_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "duels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"player_a" uuid NOT NULL,
	"player_b" uuid NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"winner_id" uuid,
	"started_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duels_two_players" CHECK ("duels"."player_a" <> "duels"."player_b")
);
--> statement-breakpoint
ALTER TABLE "duels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "duel_submissions" ADD CONSTRAINT "duel_submissions_duel_id_duels_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_submissions" ADD CONSTRAINT "duel_submissions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_problem_id_duel_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."duel_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_player_a_profiles_id_fk" FOREIGN KEY ("player_a") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_player_b_profiles_id_fk" FOREIGN KEY ("player_b") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_winner_id_profiles_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duel_submissions_duel_time" ON "duel_submissions" USING btree ("duel_id","submitted_at");--> statement-breakpoint
CREATE INDEX "duels_status" ON "duels" USING btree ("status");