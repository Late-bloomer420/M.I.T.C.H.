# Truth Core — Step 7 (Drag/Drop Contract + Apple-Inspired Preview)

This step adds the import contract and a visual preview layer inspired by modern Apple UI principles (glassmorphism, calm hierarchy, high readability).

## Added

- `src/lib/truth/importer.ts`
  - parse/validate import payload
  - ingest payload items into claims via existing secure ingestion path

- `src/cli/truth_import_cli.ts`
  - `npm run truth:import -- <payload.json>`

- `src/test/truth_import_setup.ts`
  - validates payload import and claim insertion count

- `src/electron/renderer/mindmap_preview.html`
  - Apple-inspired, glass UI
  - drag/drop JSON graph loading
  - quick visual breakdown of truth/claim/entity nodes

- `docs/TRUTH_IMPORT_PAYLOAD_SCHEMA.md`
  - defines drag/drop payload contract (`version: 1.0`)

## Script wiring

- `npm run test:truth-import`
- `npm run truth:import -- <file>`
- `npm run ui:mindmap`

## Security posture

- Import path reuses existing claim ingestion and provenance model
- No policy bypass introduced
- Promotion/resolve controls remain RBAC/HITL guarded
