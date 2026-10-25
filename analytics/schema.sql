CREATE TABLE IF NOT EXISTS site_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pageviews INTEGER NOT NULL DEFAULT 0 CHECK (pageviews BETWEEN 0 AND 9007199254740991)
);

INSERT OR IGNORE INTO site_stats (id, pageviews) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS recent_visitors (
  ip TEXT PRIMARY KEY NOT NULL,
  last_seen INTEGER NOT NULL,
  last_sequence INTEGER NOT NULL UNIQUE CHECK (last_sequence > 0)
);

CREATE INDEX IF NOT EXISTS recent_visitors_recency ON recent_visitors (last_sequence DESC);
