CREATE TABLE "message_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"run_id" text,
	"message_id" text NOT NULL,
	"workspace_slug" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_runs" (
	"run_id" text PRIMARY KEY NOT NULL,
	"conversation_id" text,
	"message_id" text,
	"workspace_slug" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"profile_version" text NOT NULL,
	"requested_model" text,
	"resolved_model" text,
	"resolved_provider" text,
	"status" text NOT NULL,
	"fallback_index" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"openrouter_cost" numeric(18, 10),
	"latency_ms" integer,
	"time_to_first_token_ms" integer,
	"error_code" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "runtime_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "model_profile_version" text DEFAULT 'legacy-direct-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_run_id_model_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."model_runs"("run_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_feedback_user_message_unique" ON "message_feedback" USING btree ("user_id","conversation_id","message_id");--> statement-breakpoint
CREATE INDEX "message_feedback_conversation_idx" ON "message_feedback" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "model_runs_conversation_created_idx" ON "model_runs" USING btree ("conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "model_runs_workspace_status_idx" ON "model_runs" USING btree ("workspace_slug","status");