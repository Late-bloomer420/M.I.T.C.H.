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
    // On fresh CI runs tables may not exist yet; tolerate that state.
    const safeDelete = (statement: any) => {
        try {
            db.run(statement);
        } catch (err) {
            const msg = String(err);
            if (!msg.includes('no such table')) {
                throw err;
            }
        }
    };

    safeDelete(sql`DELETE FROM identity_map`);
    safeDelete(sql`DELETE FROM pii_types`);
    safeDelete(sql`DELETE FROM data_mappings`);

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
