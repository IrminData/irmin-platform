CREATE TABLE "model_run_daily_metrics" (
	"day" date NOT NULL,
	"role" text NOT NULL,
	"profile_version" text NOT NULL,
	"requested_model" text NOT NULL,
	"resolved_model" text NOT NULL,
	"resolved_provider" text NOT NULL,
	"status" text NOT NULL,
	"run_count" bigint DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"openrouter_cost" numeric(20, 10) DEFAULT '0' NOT NULL,
	"total_latency_ms" bigint DEFAULT 0 NOT NULL,
	"latency_sample_count" bigint DEFAULT 0 NOT NULL,
	"total_time_to_first_token_ms" bigint DEFAULT 0 NOT NULL,
	"time_to_first_token_sample_count" bigint DEFAULT 0 NOT NULL,
	"missing_usage_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_run_daily_metrics_day_role_profile_version_requested_model_resolved_model_resolved_provider_status_pk" PRIMARY KEY("day","role","profile_version","requested_model","resolved_model","resolved_provider","status")
);
--> statement-breakpoint
CREATE INDEX "model_run_daily_metrics_day_idx" ON "model_run_daily_metrics" USING btree ("day");