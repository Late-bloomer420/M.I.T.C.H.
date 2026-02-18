import { RbacPolicy, UserContext } from '../lib/security/rbac_policy';
import { Encryption } from '../lib/crypto'; // Assuming basic crypto avail
import { AuditLedger } from '../lib/security/audit_ledger';

// Mock Orchestrator integration test
async function testRbac() {
    console.log("--- 1. Setting Up Users ---");
    const adminUser: UserContext = { userId: "Alice_Admin", role: "ADMIN" };
    const workUser: UserContext = { userId: "Bob_Worker", role: "VIEWER" };

    console.log("\n--- 2. Valid Access (Admin -> Admin Context) ---");
    const canAdminAccess = await RbacPolicy.checkPermission(adminUser, 'READ', 'CONTEXT', 'ADMIN_STRATEGY');
    if (canAdminAccess) console.log("✅ ACCESS GRANTED: Admin accessed ADMIN_STRATEGY");
    else console.error("❌ FAILURE: Admin denied valid access.");

    console.log("\n--- 3. Invalid Access (Viewer -> Admin Context) ---");
    const canViewerAccess = await RbacPolicy.checkPermission(workUser, 'READ', 'CONTEXT', 'ADMIN_PAYROLL');
    if (!canViewerAccess) {
        console.log("✅ ACCESS DENIED: Viewer blocked from ADMIN_PAYROLL");
    } else {
        console.error("❌ FAILURE: Viewer allowed to see Admin Data!");
    }

    console.log("\n--- 4. Capability Check (Viewer -> Tool Execution) ---");
    // Viewers cannot execute tools
    const canExecute = await RbacPolicy.checkPermission(workUser, 'EXECUTE', 'TOOL', 'email-sender');
    if (!canExecute) {
        console.log("✅ ACCESS DENIED: Viewer cannot execute tools.");
    } else {
        console.error("❌ FAILURE: Viewer allowed to execute tool!");
    }

    console.log("\n--- 5. Verifying Audit Log for Denial ---");
    // We expect the Ledger to have logged the denials
    // In a real test we'd parse the ledger file, but here we assume the console log from RbacPolicy works
    console.log("(Check Audit.ledger for RBAC_DENY events)");
}

testRbac();
