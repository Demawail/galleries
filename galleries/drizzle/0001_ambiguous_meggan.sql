CREATE TABLE `lightroom_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`gallery_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lightroom_connections_token_hash_unique` ON `lightroom_connections` (`token_hash`);