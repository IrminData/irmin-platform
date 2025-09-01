CREATE TABLE `ai_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`description` text NOT NULL,
	`input_price_per_million_tokens` real DEFAULT 0,
	`output_price_per_million_tokens` real DEFAULT 0,
	`metadata` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_models_model_id_unique` ON `ai_models` (`model_id`);--> statement-breakpoint
CREATE TABLE `analytics` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`event_data` text,
	`conversation_id` text,
	`message_id` text,
	`ai_model_id` integer,
	`token_count` integer DEFAULT 0,
	`cost_dollars` real DEFAULT 0,
	`processing_time_ms` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ai_model_id`) REFERENCES `ai_models`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`metadata` text,
	`workspace_slug` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`ai_model_id` text,
	`model_provider` text,
	`model_name` text,
	`agent_name` text,
	`input_tokens` integer DEFAULT 0,
	`output_tokens` integer DEFAULT 0,
	`total_tokens` integer DEFAULT 0,
	`cost_dollars` real DEFAULT 0,
	`processing_time_ms` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
