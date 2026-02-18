import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { claims, truthSnapshots } from '../../db/schema';

export interface TruthGraphNode {
    id: string;
    type: 'entity' | 'claim' | 'truth';
    label: string;
    meta?: Record<string, unknown>;
}

export interface TruthGraphEdge {
    id: string;
    from: string;
    to: string;
    type: 'supports' | 'conflicts_with' | 'about' | 'derived_from';
    meta?: Record<string, unknown>;
}

export interface TruthGraph {
    scope: string;
    nodes: TruthGraphNode[];
    edges: TruthGraphEdge[];
}

function safeParseArray<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export async function buildTruthGraph(scope: string = 'GLOBAL'): Promise<TruthGraph> {
    const rows = await db.select().from(truthSnapshots).where(eq(truthSnapshots.scope, scope));

    const nodes: TruthGraphNode[] = [];
    const edges: TruthGraphEdge[] = [];

    const claimIds = new Set<string>();

    for (const snap of rows) {
        const truthNodeId = `truth:${snap.id}`;
        nodes.push({
            id: truthNodeId,
            type: 'truth',
            label: snap.single_line_of_truth,
            meta: {
                scope: snap.scope,
                confidence: snap.confidence,
                generatedBy: snap.generated_by,
                generatedAt: snap.generated_at,
            },
        });

        const supports = safeParseArray<string[]>(snap.supporting_claim_ids_json, []);
        for (const claimId of supports) {
            claimIds.add(claimId);
            edges.push({
                id: `e:supports:${snap.id}:${claimId}`,
                from: `claim:${claimId}`,
                to: truthNodeId,
                type: 'supports',
            });
        }

        const conflicts = safeParseArray<Array<{ competingClaimIds?: string[]; note?: string }>>(snap.conflicts_json, []);
        for (const group of conflicts) {
            const ids = group.competingClaimIds ?? [];
            for (const id of ids) claimIds.add(id);
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    edges.push({
                        id: `e:conflict:${ids[i]}:${ids[j]}`,
                        from: `claim:${ids[i]}`,
                        to: `claim:${ids[j]}`,
                        type: 'conflicts_with',
                        meta: { note: group.note },
                    });
                }
            }
        }
    }

    if (claimIds.size > 0) {
        const claimRows = await db.select().from(claims).where(inArray(claims.id, Array.from(claimIds)));
        const entities = new Set<string>();

        for (const c of claimRows) {
            const claimNodeId = `claim:${c.id}`;
            nodes.push({
                id: claimNodeId,
                type: 'claim',
                label: `${c.subject} ${c.predicate} ${c.object_value}`,
                meta: {
                    claimKey: c.claim_key,
                    confidence: c.confidence,
                    sourceType: c.source_type,
                    sourceId: c.source_id,
                    sourceRef: c.source_ref,
                    status: c.status,
                },
            });

            const subjectNodeId = `entity:${c.subject}`;
            const objectNodeId = `entity:${c.object_value}`;

            if (!entities.has(subjectNodeId)) {
                entities.add(subjectNodeId);
                nodes.push({ id: subjectNodeId, type: 'entity', label: c.subject });
            }
            if (!entities.has(objectNodeId)) {
                entities.add(objectNodeId);
                nodes.push({ id: objectNodeId, type: 'entity', label: c.object_value });
            }

            edges.push({
                id: `e:about:${c.id}:subject`,
                from: subjectNodeId,
                to: claimNodeId,
                type: 'about',
            });
            edges.push({
                id: `e:about:${c.id}:object`,
                from: claimNodeId,
                to: objectNodeId,
                type: 'about',
            });
        }
    }

    return { scope, nodes, edges };
}
