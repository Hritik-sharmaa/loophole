CREATE TABLE "league_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"tier" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_groups_tier" CHECK ("league_groups"."tier" between 0 and 3)
);
--> statement-breakpoint
ALTER TABLE "league_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "league_members" (
	"week_start" date NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	CONSTRAINT "league_members_week_start_user_id_pk" PRIMARY KEY("week_start","user_id")
);
--> statement-breakpoint
ALTER TABLE "league_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_group_id_league_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."league_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_groups_week_tier" ON "league_groups" USING btree ("week_start","tier");--> statement-breakpoint
CREATE INDEX "league_members_group" ON "league_members" USING btree ("group_id");