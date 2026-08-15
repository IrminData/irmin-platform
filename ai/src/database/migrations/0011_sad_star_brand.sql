ALTER TABLE "model_runs" ADD COLUMN "parent_run_id" text;--> statement-breakpoint
CREATE INDEX "model_runs_parent_run_idx" ON "model_runs" USING btree ("parent_run_id");