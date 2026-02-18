import { ContextOrchestrator } from '../lib/rag/orchestrator';

async function main() {
    console.log('--- Starting Air-Gapped Knowledge Hub Verification ---');

    const agentId = 'AGENT_Alpha';
    const orchestrator = new ContextOrchestrator(agentId);

    // 1. Simulate User Input requiring Context
    const userQuery = "Who is the CEO?";
    console.log(`User Query: "${userQuery}"`);

    // 2. Orchestrator Intercepts
    // In a real system, the Python service would have indexed "John Doe is the CEO" as "[PER_1] is the CEO".
    // Our mock Orchestrator simulates retrieving that masked snippet.

    const injectedContext = await orchestrator.retrieveAndInject(userQuery, 'GLOBAL', {
        userId: 'user_viewer_01',
        role: 'VIEWER'
    });

    console.log('--- Injected Context Block ---');
    console.log(injectedContext);
    console.log('------------------------------');

    // 3. Verify Privacy
    if (injectedContext.includes('John Doe')) {
        console.error('❌ FAILURE: PII leaked in RAG context!');
        process.exit(1);
    }

    if (injectedContext.includes('[PER_1]')) {
        console.log('✅ SUCCESS: Context contains Masked Token (Double-Blind works).');
    } else {
        console.error('❌ FAILURE: Context missing expected token.');
        process.exit(1);
    }

    // 4. Verify Structure
    if (injectedContext.includes('CONFIDENTIAL SYSTEM CONTEXT')) {
        console.log('✅ SUCCESS: Orchestrator injected robust system prompt header.');
    }

    console.log('--- Verification Complete ---');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
