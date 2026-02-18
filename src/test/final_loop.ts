import { ContextOrchestrator } from '../lib/rag/orchestrator';
import { ToolExecutor } from '../lib/sandbox/runtime';
import { ToolManifest } from '../lib/sandbox/manifest';
import { advancedHitl } from '../lib/validation/advanced_hitl';
import { KillSwitch } from '../lib/security/killswitch';

// --- THE ANTIGRAVITY END-TO-END DEMO ---

async function main() {
    console.log('\n=============================================================');
    console.log('       GOOGLE ANTIGRAVITY IDE - SECURITY KERNEL DEMO       ');
    console.log('=============================================================\n');

    // 1. Initialize Components
    const orchestrator = new ContextOrchestrator("AGENT_NDU");
    const emailToolManifest: ToolManifest = {
        name: "email-sender",
        version: "2.0",
        permissions: { network: true, filesystem: false, env_vars: [] },
        risk_level: "HIGH"
    };
    const emailTool = new ToolExecutor(emailToolManifest, 'VIEWER');

    // 2. Scenario Step 1: User Query (RAG Injection)
    console.log('--- Step 1: Context Injection (Air-Gapped RAG) ---');
    const userQuery = "Schreib eine E-Mail an den CEO über das NDU-Kolloquium.";
    console.log(`User: "${userQuery}"`);

    const context = await orchestrator.retrieveAndInject(userQuery, 'NDU_DEMO', {
        userId: 'ndu_operator',
        role: 'EDITOR'
    });
    console.log(`System: Injected Context:\n${context}`);

    // 3. Scenario Step 2: Agent Action (Tool Call)
    console.log('--- Step 2: Agent Tool Execution (Sandboxed) ---');
    console.log('Agent: "Ich sende den Entwurf an [PER_1]..."');

    // Async execution to allow simulation of HITL interaction
    const executionPromise = emailTool.execute("mail_client.wasm", "To: [PER_1], Body: NDU Update...");

    // 4. Scenario Step 3: HITL Gate
    setTimeout(() => {
        console.log('\n--- Step 3: Human-in-the-Loop (HITL) ---');
        const pending = advancedHitl.getPendingRequests().find((r) => r.toolName === 'email-sender');
        if (pending) {
            console.log(`[Dashboard] 🔒 High Risk Action Detected: email-sender`);
            console.log(`[User] >> CLICK >> [APPROVE]`);
            advancedHitl.approveRequest(pending.id, pending.nonce);
        }
    }, 1000);

    try {
        const result = await executionPromise;
        console.log(`\n--- Step 4: Execution Result ---`);
        console.log(`Output: ${result}`);
        console.log(`✅ SUCCESS: Secure Loop Completed.`);
    } catch (e) {
        console.error(`❌ FAILURE: Tool execution failed: ${e}`);
    }

    // 5. Scenario Step 4: Kill-Switch Test
    console.log('\n--- Step 5: Emergency Protocols (Kill-Switch) ---');
    KillSwitch.engageLock("Red Team Intrusion Detected");

    try {
        console.log('Intruder: Attempting to use tool...');
        await emailTool.execute("exploit.wasm", "dump_db");
    } catch (e) {
        console.log(`System: 🛑 BLOCK SUCCESSFUL! Error: ${(e as Error).message}`);
    }

    // Optional: Self-Destruct Simulation (Commented out to save the DB file for inspection)
    // await KillSwitch.engageSelfDestruct("CONFIRM_DESTRUCTION");

    console.log('\n=============================================================');
    console.log('              DEMO COMPLETE - SYSTEM SECURE                ');
    console.log('=============================================================\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
