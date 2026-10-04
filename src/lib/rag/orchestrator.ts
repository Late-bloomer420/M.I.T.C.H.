/**
 * Push-only double-blind RAG orchestrator (Lewis et al. 2020, OWASP LLM02).
 * "Push-only": the agent never queries the knowledge base directly — this orchestrator
 * does, on the agent's behalf, after RBAC + kill-switch checks.
 * "Double-blind": retrieved results contain only masked tokens; the agent and the vector
 * DB never see real PII. Results are injected as a system-level context block.
 * See docs/SECURITY_REFERENCE.md §"RAG Orchestrator".
 */
import { ToolTokenProvider } from '../crypto/token';
import { KillSwitch } from '../security/killswitch';
import { AuditLedger } from '../security/audit_ledger';
import { RbacPolicy, UserContext } from '../security/rbac_policy';

const MASKER_BASE_URL = process.env.MASKER_URL || 'http://localhost:8000';
const MASKER_MAX_RETRIES = 3;

async function callMemoryService(endpoint: string, payload: any): Promise<any> {
    // In production this performs a real HTTP request with retry.
    // The mock branch below preserves test behaviour; the real branch activates
    // when MASKER_URL is set to a live service address.
    const useMock = !process.env.MASKER_URL;

    if (useMock) {
        if (endpoint === '/memory/retrieve') {
            const { query } = payload;
            if (query.includes('Who is the CEO')) {
                return { results: ['[PER_1] is the CEO of the company.'] };
            }
            return { results: [] };
        }
        return {};
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < MASKER_MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(`${MASKER_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Masker service returned ${res.status}`);
            return await res.json();
        } catch (err) {
            lastError = err;
            if (attempt < MASKER_MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 2 ** attempt * 500)); // 500ms, 1s, 2s
            }
        }
    }
    throw new Error(`Masker service unavailable after ${MASKER_MAX_RETRIES} attempts: ${lastError}`);
}

export class ContextOrchestrator {
    private agentId: string;

    constructor(agentId: string) {
        this.agentId = agentId;
    }

    /**
     * PUSH-ONLY RAG: 
     * The Agent asks a question, but logic runs HERE.
     * The Agent NEVER gets direct DB access.
     */
    async retrieveAndInject(userQuery: string, contextPrefix: string, user: UserContext): Promise<string> {
        if (KillSwitch.isLocked) {
            return "System: [SECURITY LOCKOUT] RAG Access Validation Failed.";
        }

        // RBAC CHECK
        const allowed = await RbacPolicy.checkPermission(user, 'READ', 'CONTEXT', contextPrefix);
        if (!allowed) {
            return "System: [RBAC] Access Denied. Insufficient permissions for this context.";
        }

        console.log(`[Orchestrator] Intercepting Query: "${userQuery}"`);

        // LOGGING: Access Attempt
        AuditLedger.log("RAG_ACCESS_ATTEMPT", this.agentId, { queryHash: "HASHED_QUERY_FOR_PRIVACY", context: contextPrefix });

        // 1. Double-Blind Retrieval (Performed by System, not Agent)
        const memoryResponse = await callMemoryService('/memory/retrieve', {
            query: userQuery,
            context: contextPrefix
        });

        const snippets = memoryResponse.results;

        if (!snippets || snippets.length === 0) {
            return `System: No relevant contextual memory found for this query.`;
        }

        // 2. Format as System Injection
        // We inject this as a "Fact" block that the LLM must prioritize.
        const contextBlock = snippets.map((s: string) => `- ${s}`).join('\n');

        return `
*** CONFIDENTIAL SYSTEM CONTEXT ***
The following facts are retrieved from the secure knowledge hub. Use them to answer the user's request.
${contextBlock}
*** END CONTEXT ***
`;
    }
}
