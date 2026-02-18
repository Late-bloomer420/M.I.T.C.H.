# Truth Core — Step 1 (Schema + Snapshot Contract)

This step establishes the baseline data model for building a single line of truth from multiple inputs while keeping security-first controls.

## Added DB tables

- `claims`
  - normalized claim triple (`subject`, `predicate`, `object_value`)
  - provenance (`source_type`, `source_id`, `source_ref`)
  - trust metadata (`confidence`, `status`, `conflict_group`)
  - contextual tags and ingest metadata

- `truth_snapshots`
  - canonical `single_line_of_truth`
  - supporting claim references
  - conflict payload
  - rationale, confidence, generator metadata

## Added TS contracts

- `src/lib/truth/types.ts`
  - `ClaimRecord`
  - `TruthConflict`
  - `TruthSnapshot`
  - `buildTruthSnapshot(...)`

## Security posture in this step

- No bypasses introduced to RBAC/HITL paths
- Claim schema designed for provenance-first auditability
- Future resolver can require HITL for conflict promotions

## Next Step

Step 2: implement ingestion adapters for text + transcript sources into `claims` with deterministic extraction.
