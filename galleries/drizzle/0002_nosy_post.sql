CREATE TABLE `gallery_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`source_id` text NOT NULL,
	`position` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gallery_photos_order` ON `gallery_photos` (`gallery_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_photos_source` ON `gallery_photos` (`gallery_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `workspace_legacy_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workspaces` ADD `photo_storage_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `mutation_id` text DEFAULT '' NOT NULL;