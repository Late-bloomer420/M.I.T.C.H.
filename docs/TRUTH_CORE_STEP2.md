# Truth Core — Step 2 (Text Ingestion Adapter v1)

This step adds the first deterministic ingestion path for canonical claims.

## Added

- `src/lib/truth/ingest.ts`
  - `extractClaimsFromText(rawText)`
    - conservative v1 extraction for `"<subject> is <object>"` lines
  - `ingestClaimsFromText(req)`
    - inserts extracted claims into `claims` table
    - writes provenance (`source_type`, `source_id`, `source_ref`)
    - attaches metadata (`confidence`, `status`, `context_tags_json`)

- `src/test/truth_ingest_setup.ts`
  - verifies extraction count
  - verifies persisted provenance fields

## Script wiring

- Added `npm run test:truth-ingest`
- Included in `test:unit`

## Security posture

- Ingestion stores claims with provenance-first metadata
- No direct bypass of policy gates introduced
- Resolver/promotion policy remains separate and can enforce RBAC/HITL in Step 3+
