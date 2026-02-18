export type SourceType = 'text' | 'agent_conversation' | 'transcript' | 'video_transcript';
export type ClaimStatus = 'active' | 'superseded' | 'conflicted' | 'rejected';

export interface ClaimRecord {
    id: string;
    claimKey: string;
    normalizedClaim: string;
    subject: string;
    predicate: string;
    objectValue: string;

    sourceType: SourceType;
    sourceId: string;
    sourceRef?: string;

    confidence: number; // 0-100
    happenedAt?: string;
    ingestedAt?: string;

    conflictGroup?: string;
    status: ClaimStatus;
    contextTags: string[];

    createdBy: string;
}

export interface TruthConflict {
    claimKey: string;
    competingClaimIds: string[];
    note: string;
}

export interface TruthSnapshot {
    id: string;
    scope: string;
    singleLineOfTruth: string;
    supportingClaimIds: string[];
    conflicts: TruthConflict[];
    rationale?: string;
    confidence: number;
    generatedBy: string;
    generatedAt?: string;
}

export function buildTruthSnapshot(input: Omit<TruthSnapshot, 'generatedAt'>): TruthSnapshot {
    return {
        ...input,
        generatedAt: new Date().toISOString(),
    };
}
