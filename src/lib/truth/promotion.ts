import { RbacPolicy, UserContext } from '../security/rbac_policy';
import { advancedHitl } from '../validation/advanced_hitl';
import { resolveTruthForClaimKey } from './resolver';
import type { TruthSnapshot } from './types';

export interface PromoteTruthInput {
    scope: string;
    claimKey: string;
    user: UserContext;
}

function isSensitiveDomain(claimKey: string): boolean {
    const key = claimKey.toLowerCase();
    return ['payroll', 'finance', 'legal', 'security', 'compliance'].some((k) => key.includes(k));
}

export async function promoteTruthWithPolicy(input: PromoteTruthInput): Promise<TruthSnapshot> {
    const allowed = await RbacPolicy.checkPermission(input.user, 'WRITE', 'CONTEXT', input.scope);
    if (!allowed) {
        throw new Error('[RBAC] Access denied for truth promotion.');
    }

    const { snapshot } = await resolveTruthForClaimKey({
        claimKey: input.claimKey,
        scope: input.scope,
        generatedBy: `truth-resolver:${input.user.userId}`,
    });

    const requiresHitl = snapshot.conflicts.length > 0 && isSensitiveDomain(input.claimKey);
    if (requiresHitl) {
        const approved = await advancedHitl.requestApproval(
            'truth-promote',
            'HIGH',
            input.user.role,
            `Conflict-aware truth promotion for sensitive key: ${input.claimKey}`
        );

        if (!approved) {
            throw new Error('[HITL] Truth promotion denied.');
        }
    }

    return snapshot;
}
