CREATE TABLE `client_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_contacts_email_unique` ON `client_contacts` (`email`);--> statement-breakpoint
CREATE TABLE `client_downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`visit_id` text NOT NULL,
	`title` text NOT NULL,
	`files` text NOT NULL,
	`size` text NOT NULL,
	`requested_at` text NOT NULL,
	`received_at` text
);
--> statement-breakpoint
CREATE TABLE `client_journal` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`visibility` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_magic` (
	`hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_mail_limits` (
	`email` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`gallery_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`link_id` text NOT NULL,
	`title` text NOT NULL,
	`first_at` text,
	`last_at` text
);
