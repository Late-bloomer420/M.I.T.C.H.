import EventEmitter from 'events';
import { AuditLedger } from '../security/audit_ledger';

class HitlService extends EventEmitter {
    private pendingRequests: Map<string, (approved: boolean) => void> = new Map();

    async requestApproval(toolName: string, riskLevel: string): Promise<boolean> {
        if (riskLevel === 'LOW') {
            return true; // Auto-approve low risk
        }

        console.log(`[HITL] 🔒 Approval Request for tool: "${toolName}" (Risk: ${riskLevel})`);

        return new Promise((resolve) => {
            const requestId = `${toolName}-${Date.now()}`;
            this.pendingRequests.set(requestId, resolve);

            // Simulate emitting an event to the Dashboard UI
            this.emit('approval_needed', { requestId, toolName, riskLevel });

            // For CLI/Test demo purposes only: Auto-deny after timeout if not simulated otherwise
            // In prod, this would wait indefinitely or timeout with false.
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    console.log(`[HITL] ⏳ Request for ${toolName} timed out (Auto-Deny).`);
                    this.processResponse(requestId, false);
                }
            }, 30000);
        });
    }

    // Called by the Dashboard UI (or Test Harness)
    approveRequest(requestId: string) {
        this.processResponse(requestId, true);
    }

    denyRequest(requestId: string) {
        this.processResponse(requestId, false);
    }

    private processResponse(requestId: string, approved: boolean) {
        const resolver = this.pendingRequests.get(requestId);
        if (resolver) {
            resolver(approved);
            this.pendingRequests.delete(requestId);

            // LOGGING: Immutable Record
            AuditLedger.log(
                approved ? "HITL_APPROVED" : "HITL_DENIED",
                "USER_ACTION",
                { requestId, approved }
            );

            return true;
        }
        return false;
    }

    // Helper to find ID by tool name (for testing)
    getPendingIdForTool(toolName: string): string | undefined {
        for (const [id, _] of this.pendingRequests) {
            if (id.startsWith(toolName)) return id;
        }
        return undefined;
    }
}

export const hitl = new HitlService();
