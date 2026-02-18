import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { KillSwitch } from '../lib/security/killswitch';
import { advancedHitl } from '../lib/validation/advanced_hitl';

async function main() {
    const repoRoot = path.resolve(__dirname, '../..');
    const auditPath = path.join(repoRoot, 'audit.ledger');

    // Reset kill-switch lock state for deterministic test runs
    KillSwitch.resetLock('SECRET_ADMIN_KEY');

    // Reset mutable DB tables used by tests
    db.run(sql`DELETE FROM identity_map`);
    db.run(sql`DELETE FROM pii_types`);
    db.run(sql`DELETE FROM data_mappings`);

    // Reset any pending async approval state
    advancedHitl.pendingRequests.clear();

    // Reset audit log file between runs
    if (fs.existsSync(auditPath)) {
        fs.unlinkSync(auditPath);
    }

    console.log('✅ Test state reset complete.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
