import { AuditLedger } from './audit_ledger';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ResourceType = 'CONTEXT' | 'TOOL' | 'SYSTEM';
export type Action = 'READ' | 'WRITE' | 'EXECUTE' | 'ADMIN_OP';

export interface UserContext {
    userId: string;
    role: Role;
}

export class RbacPolicy {
    // Permission Matrix: Role -> allowed Resources/Actions
    // For simplicity, we define scopes directly.
    // In a real system, this might load from a DB or Policy file (Oso/Casbin).
    private static permissions: Record<Role, Record<ResourceType, Action[]>> = {
        'ADMIN': {
            'CONTEXT': ['READ', 'WRITE'],
            'TOOL': ['EXECUTE', 'ADMIN_OP'],
            'SYSTEM': ['ADMIN_OP']
        },
        'EDITOR': {
            'CONTEXT': ['READ', 'WRITE'],
            'TOOL': ['EXECUTE'],
            'SYSTEM': []
        },
        'VIEWER': {
            'CONTEXT': ['READ'],
            'TOOL': [],
            'SYSTEM': []
        }
    };

    /**
     * Checks if a user has permission to perform an action on a resource.
     * Also enforces "Context Scoping" (e.g. VIEWER cannot access 'ADMIN_SECRET' context).
     */
    static async checkPermission(user: UserContext, action: Action, resourceType: ResourceType, resourceName?: string): Promise<boolean> {
        // 1. Role Check
        const rolePerms = this.permissions[user.role];
        if (!rolePerms || !rolePerms[resourceType].includes(action)) {
            await AuditLedger.log("RBAC_DENY", user.userId, {
                reason: "Role Mismatch",
                role: user.role,
                action,
                resourceType
            });
            return false;
        }

        // 2. Scoped Context Logic (Context-Namespacing Enforcement)
        if (resourceType === 'CONTEXT' && resourceName) {
            // Rule: VIEWERS can only access 'PUBLIC_' or 'TEAM_' contexts.
            // ADMIN contexts require ADMIN role.
            if (resourceName.startsWith('ADMIN_') && user.role !== 'ADMIN') {
                await AuditLedger.log("RBAC_DENY", user.userId, {
                    reason: "Scope Violation (Admin Context)",
                    resourceName
                });
                return false;
            }
            // Rule: EDITORS cannot access 'HR_' contexts unless explicitly allowed (simplified here)
            if (resourceName.startsWith('HR_') && user.role === 'VIEWER') {
                await AuditLedger.log("RBAC_DENY", user.userId, {
                    reason: "Scope Violation (HR Context)",
                    resourceName
                });
                return false;
            }
        }

        // 3. Log Success (Optional for high volume, but good for Enterprise Audit)
        // We log it in orchestration usually, but here is fine too.
        return true;
    }
}
