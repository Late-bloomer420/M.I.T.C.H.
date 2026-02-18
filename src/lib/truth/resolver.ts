import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { claims, truthSnapshots } from '../../db/schema';
import type { TruthConflict, TruthSnapshot } from './types';

function toConfidence(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export interface ResolveTruthInput {
    scope?: string;
    claimKey: string;
    generatedBy?: string;
}

export interface ResolveTruthResult {
    snapshot: TruthSnapshot;
    persistedSnapshotId: string;
}

export async function resolveTruthForClaimKey(input: ResolveTruthInput): Promise<ResolveTruthResult> {
    const scope = input.scope ?? 'GLOBAL';
    const generatedBy = input.generatedBy ?? 'truth-resolver-v1';

    const rows = await db
        .select()
        .from(claims)
        .where(and(eq(claims.claim_key, input.claimKey), eq(claims.status, 'active')))
        .orderBy(desc(claims.confidence), desc(claims.ingested_at));

    if (rows.length === 0) {
        throw new Error(`No active claims for claim_key=${input.claimKey}`);
    }

    const winner = rows[0];
    const conflicts: TruthConflict[] = [];

    if (rows.length > 1) {
        const uniqueObjects = Array.from(new Set(rows.map((r) => r.object_value)));
        if (uniqueObjects.length > 1) {
            conflicts.push({
                claimKey: input.claimKey,
                competingClaimIds: rows.map((r) => r.id),
                note: `Competing values detected for ${input.claimKey}: ${uniqueObjects.join(' | ')}`,
            });
        }
    }

    const singleLine = `${winner.subject} ${winner.predicate} ${winner.object_value}`;
    const supportIds = [winner.id];

    const avgConfidence = rows.reduce((acc, r) => acc + (r.confidence ?? 50), 0) / rows.length;
    const finalConfidence = conflicts.length > 0 ? avgConfidence * 0.75 : avgConfidence;

    const snapshotId = randomUUID();
    const generatedAt = new Date().toISOString();

    await db.insert(truthSnapshots).values({
        id: snapshotId,
        scope,
        claim_key: input.claimKey,
        single_line_of_truth: singleLine,
        supporting_claim_ids_json: JSON.stringify(supportIds),
        conflicts_json: JSON.stringify(conflicts),
        rationale: conflicts.length > 0
            ? 'Winner selected by confidence and recency, with conflicts retained for HITL review.'
            : 'Single active claim resolved without conflict.',
        confidence: toConfidence(finalConfidence),
        generated_by: generatedBy,
        generated_at: generatedAt,
    });

    const snapshot: TruthSnapshot = {
        id: snapshotId,
        scope,
        singleLineOfTruth: singleLine,
        supportingClaimIds: supportIds,
        conflicts,
        rationale: conflicts.length > 0
            ? 'Winner selected by confidence and recency, with conflicts retained for HITL review.'
            : 'Single active claim resolved without conflict.',
        confidence: toConfidence(finalConfidence),
        generatedBy,
        generatedAt,
    };

    return { snapshot, persistedSnapshotId: snapshotId };
}
