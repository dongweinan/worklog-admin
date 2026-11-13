CREATE TABLE "due_override" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"month" varchar(7) NOT NULL,
	"value" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"date" varchar(10) NOT NULL,
	"on_duty_time" varchar(5) DEFAULT '' NOT NULL,
	"off_duty_time" varchar(5) DEFAULT '' NOT NULL,
	"attendance" numeric(2, 1) DEFAULT '0' NOT NULL,
	"work_hours" numeric(5, 1) DEFAULT '0' NOT NULL,
	"note" varchar(255) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"standard_hours" numeric(5, 1) DEFAULT '8' NOT NULL,
	"lunch_hours" numeric(5, 1) DEFAULT '1' NOT NULL,
	"goal_hours" numeric(5, 1) DEFAULT '10' NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"openid" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openid_unique" UNIQUE("openid")
);
--> statement-breakpoint
ALTER TABLE "due_override" ADD CONSTRAINT "due_override_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "due_override_user_month_unique" ON "due_override" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "due_override_user_id_idx" ON "due_override" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "records_user_date_unique" ON "records" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "records_user_id_idx" ON "records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_openid_idx" ON "users" USING btree ("openid");