import { advancedHitl } from '../lib/validation/advanced_hitl';

async function testIntentBinding() {
    console.log("--- 1. Testing Valid Approval (Correct Nonce) ---");
    console.log("Agent: Requesting Critical Action...");
    const p1 = advancedHitl.requestApproval("system-update", "HIGH", "ADMIN", "Kernel Update");

    const pending = advancedHitl.getPendingRequests();
    if (pending.length > 0) {
        const req = pending[0];
        console.log(`[UI] Received Nonce: ${req.nonce}`);

        // Correct Approval
        const success = advancedHitl.approveRequest(req.id, req.nonce);
        if (success) console.log("✅ Approval Succeeded with valid Nonce.");
        else console.error("❌ Valid Nonce failed!");
    }
    await p1; // Wait for resolution

    console.log("\n--- 2. Testing Replay Attack (Invalid Nonce) ---");
    console.log("Attacker: Requesting Unauthorized Action...");
    const p2 = advancedHitl.requestApproval("delete-db", "HIGH", "VIEWER", "Malicious Delete");

    const pending2 = advancedHitl.getPendingRequests();
    if (pending2.length > 0) {
        const req = pending2[0];
        const STOLEN_OLD_NONCE = "old_nonce_from_previous_session";

        console.log(`[Attacker] Trying to approve with stolen nonce: ${STOLEN_OLD_NONCE}`);
        const success = advancedHitl.approveRequest(req.id, STOLEN_OLD_NONCE);

        if (!success) console.log("✅ Attack Blocked! Invalid Nonce rejected.");
        else console.error("❌ SECURITY FAIL: Stolen nonce worked!");
    }

    // Cleanup: Deny the hanging request so the test finishes cleanly
    advancedHitl.denyRequest(pending2[0].id);
    try { await p2; } catch (e) { } // Trigger cleanup
}

testIntentBinding();
