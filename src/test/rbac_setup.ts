import { RbacPolicy, UserContext } from '../lib/security/rbac_policy';

async function testRbac() {
    console.log('--- 1. Setting Up Users ---');
    const adminUser: UserContext = { userId: 'Alice_Admin', role: 'ADMIN' };
    const viewerUser: UserContext = { userId: 'Bob_Viewer', role: 'VIEWER' };

    console.log('\n--- 2. Valid Access (Admin -> Admin Context) ---');
    const canAdminAccess = await RbacPolicy.checkPermission(adminUser, 'READ', 'CONTEXT', 'ADMIN_STRATEGY');
    if (!canAdminAccess) {
        console.error('❌ FAILURE: Admin denied valid access.');
        process.exit(1);
    }
    console.log('✅ ACCESS GRANTED: Admin accessed ADMIN_STRATEGY');

    console.log('\n--- 3. Invalid Access (Viewer -> Admin Context) ---');
    const canViewerAccess = await RbacPolicy.checkPermission(viewerUser, 'READ', 'CONTEXT', 'ADMIN_PAYROLL');
    if (canViewerAccess) {
        console.error('❌ FAILURE: Viewer allowed to read admin context.');
        process.exit(1);
    }
    console.log('✅ ACCESS DENIED: Viewer blocked from ADMIN_PAYROLL');

    console.log('\n--- 4. Capability Check (Viewer -> Tool Execution) ---');
    const canExecute = await RbacPolicy.checkPermission(viewerUser, 'EXECUTE', 'TOOL', 'email-sender');
    if (canExecute) {
        console.error('❌ FAILURE: Viewer allowed to execute tool.');
        process.exit(1);
    }
    console.log('✅ ACCESS DENIED: Viewer cannot execute tools.');

    console.log('\n--- 5. Default-Deny Check (Unknown Resource Scope) ---');
    const canReadSystem = await RbacPolicy.checkPermission(viewerUser, 'READ', 'SYSTEM');
    if (canReadSystem) {
        console.error('❌ FAILURE: Viewer unexpectedly allowed to READ SYSTEM.');
        process.exit(1);
    }
    console.log('✅ ACCESS DENIED: Default-deny preserved for unsupported action/resource.');

    console.log('\n✅ RBAC setup test completed cleanly.');
}

testRbac().catch((err) => {
    console.error(err);
    process.exit(1);
});
