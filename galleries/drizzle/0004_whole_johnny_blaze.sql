CREATE INDEX `client_downloads_contact` ON `client_downloads` (`contact_id`,`requested_at`);--> statement-breakpoint
CREATE INDEX `client_journal_contact` ON `client_journal` (`contact_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `client_visits_contact` ON `client_visits` (`contact_id`);