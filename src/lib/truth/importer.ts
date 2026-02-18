import fs from 'node:fs';
import path from 'node:path';
import { ingestClaimsFromText } from './ingest';
import type { SourceType } from './types';

export interface TruthImportItem {
    sourceType: SourceType;
    sourceId: string;
    sourceRef?: string;
    text: string;
    contextTags?: string[];
}

export interface TruthImportPayload {
    version: '1.0';
    scope?: string;
    items: TruthImportItem[];
}

export interface TruthImportResult {
    importedItems: number;
    insertedClaims: number;
}

export function parseTruthImportPayload(raw: string): TruthImportPayload {
    const parsed = JSON.parse(raw) as TruthImportPayload;
    if (parsed.version !== '1.0') throw new Error('Unsupported import payload version');
    if (!Array.isArray(parsed.items)) throw new Error('Invalid payload: items[] required');
    return parsed;
}

export async function importTruthPayload(payload: TruthImportPayload): Promise<TruthImportResult> {
    let insertedClaims = 0;

    for (const item of payload.items) {
        const res = await ingestClaimsFromText({
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            sourceRef: item.sourceRef,
            rawText: item.text,
            contextTags: item.contextTags ?? [],
            createdBy: 'truth-importer-v1',
        });
        insertedClaims += res.inserted;
    }

    return {
        importedItems: payload.items.length,
        insertedClaims,
    };
}

export async function importTruthPayloadFromFile(filePath: string): Promise<TruthImportResult> {
    const abs = path.resolve(filePath);
    const raw = fs.readFileSync(abs, 'utf8');
    const payload = parseTruthImportPayload(raw);
    return importTruthPayload(payload);
}
