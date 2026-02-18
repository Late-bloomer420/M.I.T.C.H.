import { randomUUID } from 'node:crypto';
import { db } from '../../db';
import { claims } from '../../db/schema';
import type { SourceType } from './types';

export interface IngestRequest {
    sourceType: SourceType;
    sourceId: string;
    sourceRef?: string;
    rawText: string;
    createdBy?: string;
    contextTags?: string[];
}

export interface IngestResult {
    inserted: number;
    claimIds: string[];
}

function normalizeClaimText(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function claimKeyFor(subject: string, predicate: string): string {
    return `${subject.trim().toLowerCase()}.${predicate.trim().toLowerCase()}`;
}

// Step 2 v1 extractor: conservative "A is B" text extraction
// Example: "Alice is CEO" => subject=Alice, predicate=is, object=CEO
export function extractClaimsFromText(rawText: string): Array<{ subject: string; predicate: string; objectValue: string }> {
    const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const out: Array<{ subject: string; predicate: string; objectValue: string }> = [];

    for (const line of lines) {
        const m = line.match(/^([A-Za-z0-9_\-\[\] ]+)\s+is\s+(.+)$/i);
        if (!m) continue;

        const subject = m[1].trim();
        const objectValue = m[2].trim();
        if (!subject || !objectValue) continue;

        out.push({ subject, predicate: 'is', objectValue });
    }

    return out;
}

export async function ingestClaimsFromText(req: IngestRequest): Promise<IngestResult> {
    const extracted = extractClaimsFromText(req.rawText);
    const claimIds: string[] = [];

    for (const c of extracted) {
        const id = randomUUID();
        const normalized = normalizeClaimText(`${c.subject} ${c.predicate} ${c.objectValue}`);

        await db.insert(claims).values({
            id,
            claim_key: claimKeyFor(c.subject, c.predicate),
            normalized_claim: normalized,
            subject: c.subject,
            predicate: c.predicate,
            object_value: c.objectValue,
            source_type: req.sourceType,
            source_id: req.sourceId,
            source_ref: req.sourceRef,
            confidence: 60,
            status: 'active',
            context_tags_json: JSON.stringify(req.contextTags ?? []),
            created_by: req.createdBy ?? 'truth-ingestor-v1',
        });

        claimIds.push(id);
    }

    return { inserted: claimIds.length, claimIds };
}
