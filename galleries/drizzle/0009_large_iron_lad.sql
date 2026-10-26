CREATE TABLE `usage_collection` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`account_id` text NOT NULL,
	`audience` text NOT NULL,
	`gallery_id` text NOT NULL,
	`page` text NOT NULL,
	`from_page` text NOT NULL,
	`file_count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_events_at` ON `usage_events` (`at`);--> statement-breakpoint
CREATE TABLE `usage_exclusions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`subject` text NOT NULL
);

--> statement-breakpoint
INSERT INTO usage_collection(id,started_at) VALUES('v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
