import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { claims, truthSnapshots } from '../../db/schema';
import type { TruthSnapshot } from './types';

function parseJsonArray<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function toTruthSnapshot(row: typeof truthSnapshots.$inferSelect): TruthSnapshot {
    return {
        id: row.id,
        scope: row.scope,
        singleLineOfTruth: row.single_line_of_truth,
        supportingClaimIds: parseJsonArray<string[]>(row.supporting_claim_ids_json, []),
        conflicts: parseJsonArray(row.conflicts_json, []),
        rationale: row.rationale ?? undefined,
        confidence: row.confidence ?? 50,
        generatedBy: row.generated_by,
        generatedAt: row.generated_at ?? undefined,
    };
}

export async function getLatestTruthSnapshot(scope: string = 'GLOBAL'): Promise<TruthSnapshot | null> {
    const rows = await db
        .select()
        .from(truthSnapshots)
        .where(eq(truthSnapshots.scope, scope))
        .orderBy(desc(truthSnapshots.generated_at))
        .limit(1);

    if (rows.length === 0) return null;
    return toTruthSnapshot(rows[0]);
}

export async function getLatestTruthSnapshotForClaimKey(scope: string, claimKey: string): Promise<TruthSnapshot | null> {
    const snapshots = await db
        .select()
        .from(truthSnapshots)
        .where(eq(truthSnapshots.scope, scope))
        .orderBy(desc(truthSnapshots.generated_at))
        .limit(50);

    for (const snap of snapshots) {
        const supportIds = parseJsonArray<string[]>(snap.supporting_claim_ids_json, []);
        if (supportIds.length === 0) continue;

        const supportClaims = await db
            .select({ claimKey: claims.claim_key })
            .from(claims)
            .where(inArray(claims.id, supportIds));

        if (supportClaims.some((c) => c.claimKey === claimKey)) {
            return toTruthSnapshot(snap);
        }
    }

    return null;
}

export async function exportLatestTruthAsJson(scope: string = 'GLOBAL'): Promise<string> {
    const snapshot = await getLatestTruthSnapshot(scope);
    return JSON.stringify({ scope, snapshot }, null, 2);
}
