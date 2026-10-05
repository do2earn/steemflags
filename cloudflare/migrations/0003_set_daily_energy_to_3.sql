CREATE TABLE IF NOT EXISTS app_migrations (MigrationId TEXT PRIMARY KEY, AppliedAt TEXT NOT NULL);
INSERT OR IGNORE INTO app_migrations (MigrationId,AppliedAt) VALUES ('0003_set_daily_energy_to_3',datetime('now'));
UPDATE accounts SET Energy=3 WHERE (SELECT changes())=1;
