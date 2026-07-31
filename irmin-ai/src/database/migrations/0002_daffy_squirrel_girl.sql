ALTER TABLE "vector_collections" ALTER COLUMN "workspace_slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_collections" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vector_collections" ADD COLUMN "is_system_collection" boolean DEFAULT false;