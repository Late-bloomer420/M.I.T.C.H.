import EventEmitter from 'events';
import { AuditLedger } from '../security/audit_ledger';

import * as crypto from 'crypto';

export interface ApprovalRequest {
    id: string;
    nonce: string; // Intent Binding
    toolName: string;
    riskLevel: string;
    reason: string;      // "Explainable Security"
    userRole: string;
    timestamp: number;
    resolver: (approved: boolean) => void;
}

class AdvancedHitlService extends EventEmitter {
    // Public queue for external APIs (e.g. Dashboard/Mobile)
    public pendingRequests: Map<string, ApprovalRequest> = new Map();

    async requestApproval(toolName: string, riskLevel: string, userRole: string, reason: string): Promise<boolean> {
        // Policy-Over-Approval: Admins execute LOW/MEDIUM risks automatically
        if (userRole === 'ADMIN' && riskLevel !== 'HIGH') {
            await AuditLedger.log("HITL_AUTO_APPROVE", "SYSTEM", { toolName, riskLevel, reason: "Admin Policy" });
            return true;
        }

        console.log(`[HITL] 🔒 Async Approval Required: "${toolName}"`);
        console.log(`       Reason: ${reason}`);

        return new Promise((resolve) => {
            const requestId = `${toolName}-${Date.now()}`;
            const nonce = crypto.randomBytes(16).toString('hex'); // High entropy nonce

            const request: ApprovalRequest = {
                id: requestId,
                nonce,
                toolName,
                riskLevel,
                reason,
                userRole,
                timestamp: Date.now(),
                resolver: resolve
            };

            this.pendingRequests.set(requestId, request);

            // Notify listeners (e.g. Websocket Server)
            // In a real UI, this nonce is sent to the Frontend and must be returned with the approval
            this.emit('approval_needed', {
                requestId,
                nonce,
                toolName,
                riskLevel,
                reason
            });

            // Auto-Deny Timeout (30s)
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    console.log(`[HITL] ⏳ Request ${requestId} timed out.`);
                    this.processResponse(requestId, false); // No nonce needed for timeout deny
                }
            }, 30000);
        });
    }

    // External API Endpoint (Mocked)
    approveRequest(requestId: string, providedNonce: string): boolean {
        const req = this.pendingRequests.get(requestId);
        if (!req) return false;

        // INTENT BINDING CHECK
        if (req.nonce !== providedNonce) {
            console.error(`[HITL] 🚨 SECURITY ALERT: Invalid Nonce for ${requestId}!`);
            console.error(`       Expected: ${req.nonce}`);
            console.error(`       Received: ${providedNonce}`);
            // Log as security incident
            AuditLedger.log("HITL_NONCE_MISMATCH", "SECURITY", { requestId, providedNonce });
            return false;
        }

        return this.processResponse(requestId, true);
    }

    denyRequest(requestId: string): boolean {
        return this.processResponse(requestId, false);
    }

    // List pending requests for Dashboard
    getPendingRequests(): Omit<ApprovalRequest, 'resolver'>[] {
        return Array.from(this.pendingRequests.values()).map(({ resolver, ...rest }) => rest);
    }

    private processResponse(requestId: string, approved: boolean): boolean {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            request.resolver(approved);
            this.pendingRequests.delete(requestId);

            // LOGGING: Immutable Record
            AuditLedger.log(
                approved ? "HITL_APPROVED" : "HITL_DENIED",
                "USER_ASYNC",
                { requestId, tool: request.toolName, reason: request.reason, approved }
            );

            return true;
        }
        return false;
    }
}

export const advancedHitl = new AdvancedHitlService();
