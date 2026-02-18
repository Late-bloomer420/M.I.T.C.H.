import { db } from '../db';
import { claims, truthSnapshots } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ingestClaimsFromText } from '../lib/truth/ingest';
import { resolveTruthForClaimKey } from '../lib/truth/resolver';

async function main() {
    console.log('--- Truth Resolver Setup Test ---');

    // Seed conflicting claims for same claim_key (subject.predicate)
    await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'notes/a.txt',
        rawText: 'Alice is CEO',
        contextTags: ['weekly-sync'],
    });

    await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'notes/b.txt',
        rawText: 'Alice is CTO',
        contextTags: ['agent-conversation'],
    });

    const activeClaims = await db.select().from(claims).where(eq(claims.claim_key, 'alice.is'));
    if (activeClaims.length < 2) {
        console.error('❌ FAILURE: expected at least 2 active claims for alice.is');
        process.exit(1);
    }

    // Boost one claim to create deterministic winner
    const winner = activeClaims.find((c) => c.object_value === 'CEO');
    if (!winner) {
        console.error('❌ FAILURE: missing expected CEO claim');
        process.exit(1);
    }

    await db.update(claims).set({ confidence: 90 }).where(eq(claims.id, winner.id));

    const resolved = await resolveTruthForClaimKey({
        claimKey: 'alice.is',
        generatedBy: 'truth-resolver-test',
    });

    if (!resolved.snapshot.singleLineOfTruth.includes('Alice is CEO')) {
        console.error(`❌ FAILURE: wrong single line: ${resolved.snapshot.singleLineOfTruth}`);
        process.exit(1);
    }

    if (resolved.snapshot.conflicts.length === 0) {
        console.error('❌ FAILURE: expected conflicts metadata for competing claims');
        process.exit(1);
    }

    const persisted = await db.select().from(truthSnapshots).where(eq(truthSnapshots.id, resolved.persistedSnapshotId));
    if (persisted.length !== 1) {
        console.error('❌ FAILURE: truth snapshot not persisted');
        process.exit(1);
    }

    console.log('✅ SUCCESS: Truth resolver generated and persisted conflict-aware snapshot.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
