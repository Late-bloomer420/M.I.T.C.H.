import { ToolExecutor } from '../lib/sandbox/runtime';
import { advancedHitl } from '../lib/validation/advanced_hitl';
import { ToolManifest } from '../lib/sandbox/manifest';

async function main() {
    console.log('--- Starting Validation & Sandbox Verification ---');

    // 1. Define Manifests
    const benignManifest: ToolManifest = {
        name: "calc-tool",
        version: "1.0",
        permissions: { network: false, filesystem: false, env_vars: [] },
        risk_level: "LOW"
    };

    const riskyManifest: ToolManifest = {
        name: "email-sender",
        version: "2.0",
        permissions: { network: true, filesystem: false, env_vars: [] },
        risk_level: "HIGH"
    };

    // 2. Test LOW Risk (Auto-Approve)
    console.log('Test 1: Low Risk Tool...');
    const executor1 = new ToolExecutor(benignManifest, 'ADMIN');
    const result1 = await executor1.execute("mock.wasm", "1+1");
    console.log(`Result: ${result1}`);
    if (result1.includes("Success")) {
        console.log("✅ SUCCESS: Low risk tool auto-approved.");
    }

    // 3. Test HIGH Risk (HITL Trigger)
    console.log('Test 2: High Risk Tool (Expect Approval Wait)...');
    const executor2 = new ToolExecutor(riskyManifest, 'VIEWER');

    // Start execution (will hang waiting for approval)
    const executionPromise = executor2.execute("mock.wasm", "send_mail");

    // Simulate User Approval after 1 second
    setTimeout(() => {
        const pending = advancedHitl.getPendingRequests().find((r) => r.toolName === "email-sender");
        if (pending) {
            console.log(`[User] Approving request: ${pending.id}`);
            advancedHitl.approveRequest(pending.id, pending.nonce);
        } else {
            console.error("❌ FAILURE: No pending request found via HITL!");
        }
    }, 1000);

    const result2 = await executionPromise;
    console.log(`Result: ${result2}`);

    if (result2.includes("Success")) {
        console.log("✅ SUCCESS: High risk tool approved via HITL.");
    }

    console.log('--- Verification Complete ---');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
