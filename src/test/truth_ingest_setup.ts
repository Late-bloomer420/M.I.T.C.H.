import { db } from '../db';
import { claims } from '../db/schema';
import { inArray } from 'drizzle-orm';
import { ingestClaimsFromText } from '../lib/truth/ingest';

async function main() {
    console.log('--- Truth Ingest Setup Test ---');

    const result = await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'notes/session-001.txt',
        sourceRef: 'L1-L3',
        rawText: [
            'Alice is CEO',
            'Project X is delayed',
            'This line should be ignored',
        ].join('\n'),
        contextTags: ['strategy', 'weekly-sync'],
    });

    console.log(`Inserted: ${result.inserted}`);
    if (result.inserted !== 2) {
        console.error(`❌ FAILURE: expected 2 inserted claims, got ${result.inserted}`);
        process.exit(1);
    }

    const rows = await db.select().from(claims).where(inArray(claims.id, result.claimIds));
    if (rows.length !== 2) {
        console.error(`❌ FAILURE: expected 2 persisted rows, got ${rows.length}`);
        process.exit(1);
    }

    const hasProvenance = rows.every((r) => r.source_id === 'notes/session-001.txt' && r.source_ref === 'L1-L3');
    if (!hasProvenance) {
        console.error('❌ FAILURE: provenance fields missing/inconsistent.');
        process.exit(1);
    }

    console.log('✅ SUCCESS: Text claims ingested with provenance.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
