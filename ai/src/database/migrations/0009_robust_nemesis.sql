ALTER TABLE "analytics" DROP CONSTRAINT "analytics_ai_model_id_ai_models_id_fk";
--> statement-breakpoint
DROP INDEX "idx_analytics_ai_model_id";--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "ai_model_id";--> statement-breakpoint
DROP TABLE "ai_models";
