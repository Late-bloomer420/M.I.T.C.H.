import { ingestClaimsFromText } from '../lib/truth/ingest';
import { promoteTruthWithPolicy } from '../lib/truth/promotion';
import { advancedHitl } from '../lib/validation/advanced_hitl';

async function main() {
    console.log('--- Truth Promotion Policy Test ---');

    await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'finance/a.txt',
        rawText: 'Payroll is reduced by 10%',
    });

    await ingestClaimsFromText({
        sourceType: 'text',
        sourceId: 'finance/b.txt',
        rawText: 'Payroll is unchanged',
    });

    // Sensitive + conflicting key should require HITL.
    const promotePromise = promoteTruthWithPolicy({
        scope: 'TEAM_FINANCE',
        claimKey: 'payroll.is',
        user: { userId: 'admin_fin', role: 'ADMIN' },
    });

    setTimeout(() => {
        const req = advancedHitl.getPendingRequests().find((r) => r.toolName === 'truth-promote');
        if (req) {
            advancedHitl.approveRequest(req.id, req.nonce);
        }
    }, 300);

    const snapshot = await promotePromise;
    if (!snapshot.singleLineOfTruth.toLowerCase().includes('payroll is')) {
        console.error('❌ FAILURE: promotion did not return payroll truth line.');
        process.exit(1);
    }

    let denied = false;
    try {
        await promoteTruthWithPolicy({
            scope: 'ADMIN_PAYROLL',
            claimKey: 'payroll.is',
            user: { userId: 'viewer_1', role: 'VIEWER' },
        });
    } catch {
        denied = true;
    }

    if (!denied) {
        console.error('❌ FAILURE: viewer should not be able to promote truth in admin scope.');
        process.exit(1);
    }

    console.log('✅ SUCCESS: truth promotion enforces RBAC + HITL for sensitive conflicts.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
