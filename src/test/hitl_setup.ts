import { advancedHitl } from '../lib/validation/advanced_hitl';

async function testAdvancedHitl() {
    console.log('--- 1. Auto-Approval (Admin + Medium Risk) ---');
    const autoResult = await advancedHitl.requestApproval('data-analyzer', 'MEDIUM', 'ADMIN', 'Routine Analysis');
    if (!autoResult) {
        console.error('❌ FAILURE: Admin should be auto-approved for MEDIUM risk.');
        process.exit(1);
    }
    console.log('✅ Admin action auto-approved.');

    console.log('\n--- 2. High Risk Action (Viewer = Async Approval) ---');
    console.log('Agent: Requesting high-risk transfer...');
    const approvalPromise = advancedHitl.requestApproval(
        'money-transfer',
        'HIGH',
        'VIEWER',
        'Transfer > $500 to External Account'
    );

    console.log('\n[Dashboard] Fetching pending requests...');
    const req = advancedHitl.getPendingRequests().find((r) => r.toolName === 'money-transfer');
    if (!req) {
        console.error('❌ FAILURE: No pending HITL request found.');
        process.exit(1);
    }

    console.log(`[Dashboard] Found Request: ${req.id}`);
    console.log(`            Tool: ${req.toolName}`);
    console.log(`            Reason: ${req.reason}`);

    console.log('\n[Mobile App] User clicks APPROVE...');
    setTimeout(() => {
        advancedHitl.approveRequest(req.id, req.nonce);
    }, 300);

    const manualResult = await approvalPromise;
    if (!manualResult) {
        console.error('❌ FAILURE: Expected approval, got denial.');
        process.exit(1);
    }

    console.log('✅ Async action approved via dashboard simulation.');

    console.log('\n--- 3. Replay/Invalid Nonce Defense ---');
    const attackPromise = advancedHitl.requestApproval(
        'wire-transfer',
        'HIGH',
        'VIEWER',
        'Attempt unauthorized transfer'
    );

    const attackReq = advancedHitl.getPendingRequests().find((r) => r.toolName === 'wire-transfer');
    if (!attackReq) {
        console.error('❌ FAILURE: Missing pending request for invalid nonce test.');
        process.exit(1);
    }

    const accepted = advancedHitl.approveRequest(attackReq.id, 'bad_nonce_value');
    if (accepted) {
        console.error('❌ FAILURE: Invalid nonce was incorrectly accepted.');
        process.exit(1);
    }

    // Cleanup pending request path so promise resolves deterministically.
    advancedHitl.denyRequest(attackReq.id);
    const deniedResult = await attackPromise;
    if (deniedResult) {
        console.error('❌ FAILURE: Invalid nonce flow should end denied.');
        process.exit(1);
    }

    console.log('✅ Invalid nonce correctly rejected and request denied.');
    console.log('\n✅ HITL test completed cleanly.');
}

testAdvancedHitl().catch((err) => {
    console.error(err);
    process.exit(1);
});
