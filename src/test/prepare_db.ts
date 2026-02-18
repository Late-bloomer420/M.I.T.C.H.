import path from 'node:path';
import Database from 'better-sqlite3';
import { execSync } from 'node:child_process';

async function main() {
    const repoRoot = path.resolve(__dirname, '../..');
    const dbPath = path.join(repoRoot, 'sqlite.db');
    const sqlite = new Database(dbPath);

    sqlite.exec(`
CREATE TABLE IF NOT EXISTS pii_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  pattern TEXT,
  sensitivity_level TEXT DEFAULT 'HIGH',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS identity_map (
  token_id TEXT PRIMARY KEY,
  encrypted_real_value TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  context_prefix TEXT NOT NULL DEFAULT 'GLOBAL',
  entity_type TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_hash, context_prefix)
);

CREATE TABLE IF NOT EXISTS data_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_field TEXT NOT NULL,
  pii_type_id INTEGER,
  description TEXT
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  claim_key TEXT NOT NULL,
  normalized_claim TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_value TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_ref TEXT,
  confidence INTEGER NOT NULL DEFAULT 50,
  happened_at TEXT,
  ingested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  conflict_group TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  context_tags_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL DEFAULT 'truth-ingestor-v1'
);

CREATE TABLE IF NOT EXISTS truth_snapshots (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'GLOBAL',
  claim_key TEXT NOT NULL DEFAULT 'global.unknown',
  single_line_of_truth TEXT NOT NULL,
  supporting_claim_ids_json TEXT NOT NULL DEFAULT '[]',
  conflicts_json TEXT NOT NULL DEFAULT '[]',
  rationale TEXT,
  confidence INTEGER NOT NULL DEFAULT 50,
  generated_by TEXT NOT NULL DEFAULT 'truth-resolver-v1',
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

    // Backfill schema drift for existing local DBs
    try {
        sqlite.exec(`ALTER TABLE truth_snapshots ADD COLUMN claim_key TEXT NOT NULL DEFAULT 'global.unknown';`);
    } catch {
        // ignore when column already exists
    }

    sqlite.close();

    execSync('node ./node_modules/tsx/dist/cli.mjs ./src/test/reset_state.ts', {
        cwd: repoRoot,
        stdio: 'inherit',
        env: { ...process.env, CI: '1' },
    });

    console.log('✅ Test DB prepared and reset.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
