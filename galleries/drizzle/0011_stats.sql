CREATE TABLE stats_records (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE studio_events (id TEXT PRIMARY KEY NOT NULL, at TEXT NOT NULL, gallery_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL, filename TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE INDEX studio_events_at ON studio_events(at);
