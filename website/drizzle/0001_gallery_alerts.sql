CREATE TABLE `gallery_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`lease` integer DEFAULT 0 NOT NULL
);
