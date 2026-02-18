import { ingestClaimsFromText } from '../lib/truth/ingest';
import { resolveTruthForClaimKey } from '../lib/truth/resolver';
import { exportLatestTruthAsJson, getLatestTruthSnapshot, getLatestTruthSnapshotForClaimKey } from '../lib/truth/query';

async function main() {
    console.log('--- Truth Query Setup Test ---');

    await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'ops/notes.txt',
        rawText: 'Status is Green',
    });

    await resolveTruthForClaimKey({
        scope: 'OPS',
        claimKey: 'status.is',
        generatedBy: 'truth-query-test',
    });

    const latest = await getLatestTruthSnapshot('OPS');
    if (!latest || !latest.singleLineOfTruth.includes('Status is Green')) {
        console.error('❌ FAILURE: latest scope snapshot missing/incorrect.');
        process.exit(1);
    }

    const byKey = await getLatestTruthSnapshotForClaimKey('OPS', 'status.is');
    if (!byKey || byKey.id !== latest.id) {
        console.error('❌ FAILURE: key-based snapshot lookup failed.');
        process.exit(1);
    }

    const exported = await exportLatestTruthAsJson('OPS');
    if (!exported.includes('Status is Green')) {
        console.error('❌ FAILURE: JSON export missing expected truth line.');
        process.exit(1);
    }

    console.log('✅ SUCCESS: truth query/read surface works for scope + key + JSON export.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
