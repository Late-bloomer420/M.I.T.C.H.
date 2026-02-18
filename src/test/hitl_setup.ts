import { advancedHitl } from '../lib/validation/advanced_hitl';

async function testAdvancedHitl() {
    console.log("--- 1. Auto-Approval (Admin + Medium Risk) ---");
    const autoResult = await advancedHitl.requestApproval("data-analyzer", "MEDIUM", "ADMIN", "Routine Analysis");
    if (autoResult) console.log("✅ Admin Action Auto-Approved.");
    else console.error("❌ Error: Admin should be auto-approved.");

    console.log("\n--- 2. High Risk Action (Viewer = Async Wait) ---");
    // Start request (non-blocking simulation)
    console.log("Agent: Requesting High Risk Transfer...");
    const approvalPromise = advancedHitl.requestApproval("money-transfer", "HIGH", "VIEWER", "Transfer > $500 to External Account");

    // Simulate Dashboard polling
    console.log("\n[Dashboard] Fetching Pending Requests...");
    const pending = advancedHitl.getPendingRequests();
    if (pending.length > 0) {
        const req = pending[0];
        console.log(`[Dashboard] Found Request: ${req.id}`);
        console.log(`            Tool: ${req.toolName}`);
        console.log(`            Reason: ${req.reason}`); // Explainable Security!

        console.log("\n[Mobile App] User clicks APPROVE...");
        setTimeout(() => {
            advancedHitl.approveRequest(req.id);
        }, 1000);
    }

    const manualResult = await approvalPromise;
    if (manualResult) console.log("✅ Async Action Approved via Dashboard Simulation.");
    else console.error("❌ Async Action Denied unexpected.");

    console.log("\n(Check Audit.ledger for detailed logs)");
}

testAdvancedHitl();
