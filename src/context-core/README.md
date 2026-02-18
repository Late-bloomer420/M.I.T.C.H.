# Context Core (Scaffold)

Context Core is a standalone service layer for cross-agent context building.

## Purpose
- ingest multi-source interactions (agents/chats/docs/transcripts)
- normalize into claims + provenance
- compute diffs/focus signals
- emit feedback packs for downstream models

## Initial Endpoints (planned)
- `POST /api/context/ingest/chat`
- `POST /api/context/ingest/text`
- `GET /api/context/feedback-pack?scope=...`
- `GET /api/context/graph?scope=...`

## Current status
Scaffold only. Handlers + persistence contracts included for fast iteration.
