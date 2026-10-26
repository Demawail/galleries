CREATE TABLE IF NOT EXISTS download_jobs (
 id TEXT PRIMARY KEY, gallery_id TEXT NOT NULL, link_id TEXT NOT NULL,
 reviewer_id TEXT NOT NULL, files TEXT NOT NULL, size TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued', created INTEGER NOT NULL, expires INTEGER NOT NULL,
 secret TEXT NOT NULL, lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 dispatched INTEGER NOT NULL DEFAULT 0,
 bytes INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE INDEX IF NOT EXISTS download_jobs_reviewer ON download_jobs(gallery_id,link_id,reviewer_id,created);
