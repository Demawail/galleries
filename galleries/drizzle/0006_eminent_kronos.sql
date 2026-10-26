CREATE TABLE `portfolio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`source` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portfolio_state` (
	`id` text PRIMARY KEY NOT NULL,
	`draft` text NOT NULL,
	`published` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`published_at` text
);
