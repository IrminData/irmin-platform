ALTER TABLE "analytics" DROP CONSTRAINT "analytics_message_id_messages_id_fk";
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "message_id";--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "token_count";--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "cost_dollars";--> statement-breakpoint
ALTER TABLE "analytics" DROP COLUMN "processing_time_ms";