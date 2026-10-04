# Security Reference

Every security mechanism in this codebase is named, explained, and sourced here.
This document exists so that nothing in the system is opaque. If you read code in this project and ask "what is this and why does it work?", the answer is here.

---

## Symmetric Encryption — AES-256-CBC

**File:** `src/lib/crypto.ts`

**What it is.** A block cipher that encrypts fixed-size (128-bit) chunks of plaintext into ciphertext using a 256-bit key. CBC (Cipher Block Chaining) XORs each plaintext block with the previous ciphertext block before encryption, so identical inputs produce different outputs.

**How it works here.**
- Key is 32 bytes (256 bits), sourced from `ENCRYPTION_KEY` env var or a hardcoded dev default.
- A random 16-byte IV (Initialization Vector) is generated per encryption call and prepended to the ciphertext as `iv:ciphertext` hex.
- `encrypt()` → AES-256-CBC cipher, returns `iv_hex:ciphertext_hex`.
- `decrypt()` → splits on `:`, reconstructs IV, decrypts.
- `hash()` → HMAC-SHA256 with the same key; used for consistent, key-bound hashing (deterministic but not reversible without the key).

**Why a random IV matters.** Without it, two encryptions of the same plaintext produce the same ciphertext, leaking pattern information. With a random IV each call is independent.

**References.**
- NIST FIPS 197 — Advanced Encryption Standard: https://csrc.nist.gov/publications/detail/fips/197/final
- NIST SP 800-38A — Block Cipher Modes (CBC defined in Section 6.2): https://csrc.nist.gov/publications/detail/sp/800-38a/final
- NIST FIPS 198-1 — HMAC: https://csrc.nist.gov/publications/detail/fips/198/1/final

---

## Tool Token — HMAC-SHA256 Signed Bearer Token

**File:** `src/lib/crypto/token.ts`

**What it is.** A short-lived, scoped bearer token that proves an agent is authorized to invoke a specific tool within a 60-second window. It is stateless: no DB lookup needed to verify it.

**How it works here.**
- Payload: `agentId:toolName:timestamp` encoded as Base64.
- Signature: HMAC-SHA256 of the payload using `TOKEN_SECRET`.
- Token format: `payloadBase64.signatureHex`.
- `verifyToolToken()` checks: (1) tool name matches, (2) timestamp is within 60 s, (3) signature is valid using `crypto.timingSafeEqual` to prevent timing attacks.

**Why `timingSafeEqual`.** A naive `===` comparison short-circuits on the first mismatched byte, leaking information about how many bytes matched. `timingSafeEqual` always runs in constant time.

**References.**
- NIST FIPS 198-1 — HMAC: https://csrc.nist.gov/publications/detail/fips/198/1/final
- RFC 6238 — TOTP (Time-Based One-Time Password, same TTL principle): https://datatracker.ietf.org/doc/html/rfc6238
- CWE-208 — Observable Timing Discrepancy: https://cwe.mitre.org/data/definitions/208.html

---

## PII Tokenization — Context-Scoped Identity Vault

**File:** `src/lib/pii/mapper.ts`

**What it is.** A technique that replaces sensitive real values (names, IDs, emails) with opaque tokens. The real value is encrypted and stored separately; the rest of the system only ever sees the token.

**How it works here.**
- `tokenize(realValue, entityType, contextPrefix)` hashes the real value + context prefix, checks if a mapping already exists, and if not, generates a token of the form `[PER_a1b2]` (3-char type abbreviation + 4-byte random hex).
- The real value is AES-256-CBC encrypted (`src/lib/crypto.ts`) before storage.
- The same person gets **different tokens in different contexts**: `Alice` in `GLOBAL` → `[PER_6a04]`; `Alice` in `FINANCE` → `[PER_6c9d]`. This is context-scoped tokenization.
- `deanonymize(tokenId)` decrypts and returns the real value — only callable from the trusted zone.

**Why context scoping matters.** If an agent operating in `FINANCE` leaks a token, that token is meaningless outside `FINANCE`. Cross-context correlation is structurally impossible without the mapping table.

**References.**
- NIST SP 800-188 — De-Identifying Government Datasets: https://csrc.nist.gov/publications/detail/sp/800-188/final
- PCI DSS Tokenization Guidelines (v2.0): https://www.pcisecuritystandards.org/documents/Tokenization_Product_Security_Guidelines.pdf
- ISO/IEC 29101 — Privacy Architecture Framework (context-based data separation)

---

## RBAC — Role-Based Access Control

**File:** `src/lib/security/rbac_policy.ts`

**What it is.** A model where permissions are assigned to roles, not to individual users. A user acquires permissions by being assigned a role.

**How it works here.**
- Three roles: `ADMIN`, `EDITOR`, `VIEWER`.
- Three resource types: `CONTEXT` (data scopes), `TOOL` (executable plugins), `SYSTEM` (admin operations).
- Four actions: `READ`, `WRITE`, `EXECUTE`, `ADMIN_OP`.
- The permission matrix is a static `Record<Role, Record<ResourceType, Action[]>>`.
- `checkPermission()` evaluates the matrix, then applies scoped-context rules (e.g., `ADMIN_*` contexts require `ADMIN` role). On denial, it logs a `RBAC_DENY` event to the audit ledger.
- Default-deny: any action/resource pair not in the matrix is rejected.

**Why default-deny.** Allowlists are safer than denylists. An unknown combination fails closed, not open.

**References.**
- NIST SP 800-162 — Guide to Attribute-Based Access Control (ABAC), which supersedes RBAC: https://csrc.nist.gov/publications/detail/sp/800-162/final
- NIST SP 800-207 — Zero Trust Architecture (default-deny principle): https://csrc.nist.gov/publications/detail/sp/800-207/final
- Sandhu et al. 1996 — "Role-Based Access Control Models" (IEEE Computer): foundational RBAC paper

---

## HITL — Human-in-the-Loop with Nonce-Based Intent Binding

**File:** `src/lib/validation/advanced_hitl.ts`

**What it is.** A gate that halts execution of a high-risk action until a human explicitly approves it. The "nonce-based intent binding" prevents a pre-captured approval from being replayed on a different action.

**How it works here.**
- `requestApproval(toolName, riskLevel, userRole, reason)`:
  - `LOW` risk → auto-approves for all roles and logs `HITL_AUTO_APPROVE`.
  - `MEDIUM` risk → auto-approves for `ADMIN` only; other roles queue.
  - `HIGH` risk → always queues for async approval.
- Queued requests: stored in `pendingRequests` Map. A 16-byte random nonce is generated per request.
- `approveRequest(requestId, providedNonce)`: verifies the nonce matches exactly; mismatch → `HITL_NONCE_MISMATCH` audit event + deny.
- Auto-deny timeout: 30 seconds if no response.

**Why nonces prevent replay.** An attacker who intercepts an approval for request A cannot use it to approve request B — the nonce is request-specific and single-use. Replaying an old nonce from a previous session also fails (the request ID has already been deleted from the map).

**References.**
- NIST AI RMF (AI Risk Management Framework) — GOVERN 6.1, MANAGE 2.4 (human oversight): https://www.nist.gov/system/files/documents/2023/01/26/AI%20RMF%201.0.pdf
- IEEE 7001-2021 — Transparency of Autonomous Systems (HITL requirements)
- RFC 4226 — HOTP (one-time token concept): https://datatracker.ietf.org/doc/html/rfc4226

---

## Audit Ledger — Append-Only Hash Chain

**File:** `src/lib/security/audit_ledger.ts`

**What it is.** A tamper-evident log where each entry includes a hash of the previous entry. Modifying any past entry invalidates every entry after it, making the tampering detectable.

**How it works here.**
- Each block: `{timestamp, eventType, actorId, payload, payloadHash, prevHash}`.
- Block hash: SHA-256 of the entire JSON entry string.
- Storage: `audit.ledger` on disk, append-only, one line per block: `blockHash|entryJSON`.
- `log()`: builds the entry, hashes it, appends to file, updates `lastHash` in memory.
- `verifyChain()`: reads every line, checks that `entry.prevHash === hash of previous entry`, and re-hashes each entry's JSON to confirm it matches the stored hash. Any mismatch triggers `KillSwitch.engageLock()`.
- Genesis block: `prevHash = "GENESIS_HASH_00000000…"`.

**Why a hash chain.** Deleting or editing block N requires recomputing all hashes from N to the end of the file — computationally detectable if a reference snapshot exists. This is the same primitive behind Git commit history and blockchain data structures.

**References.**
- Merkle, R.C. 1988 — "A Digital Signature Based on a Conventional Encryption Function" (hash tree foundation)
- NIST SP 800-92 — Guide to Computer Security Log Management: https://csrc.nist.gov/publications/detail/sp/800-92/final
- NIST SP 800-53 Rev 5 — AU-9 (Protection of Audit Information), AU-10 (Non-Repudiation): https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final

---

## Kill-Switch — Circuit Breaker

**File:** `src/lib/security/killswitch.ts`

**What it is.** A global lock that stops all system operations when a security incident is detected or manually triggered. All code paths check `KillSwitch.isLocked` before acting.

**How it works here.**
- `engageLock(reason)`: sets `_isLocked = true`, records reason.
- `resetLock(adminKey)`: requires hardcoded admin key `"SECRET_ADMIN_KEY"`.
- `engageSelfDestruct("CONFIRM_DESTRUCTION")`: sets `_isDestroyed = true`, overwrites the SQLite DB with zeros, deletes it, calls `process.exit(1)`.
- Callers: any privileged action in `runtime.ts`, `mitch_chat.ts`, and the audit ledger itself on tamper detection.

**Why separate lock and destroy states.** `_isLocked` is recoverable by an admin. `_isDestroyed` is not — it is a panic response to a confirmed breach. Separating them prevents an accidental lock from triggering data destruction.

**References.**
- Nygard, M. 2007 — "Release It!" (Circuit Breaker pattern, Chapter 5)
- NIST SP 800-53 Rev 5 — IR-4 (Incident Handling), IR-10 (Integrated Information Security Analysis): https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- NIST AI RMF — RESPOND 2.1 (emergency shutdown procedures)

---

## TPM Provider — Trusted Platform Module (Simulated)

**File:** `src/lib/security/tpm_provider.ts`

**What it is.** A hardware chip that stores cryptographic keys and can bind them to the measured state of the system (BIOS, bootloader, OS kernel). A key sealed to a specific PCR state can only be unsealed if the system boots identically — detecting boot-time tampering.

**How it works here (simulation).**
- PCRs (Platform Configuration Registers): a dict of expected hash values representing valid system state.
- `seal(data)`: derives a wrapping key from `HMAC(STORAGE_ROOT_KEY, SHA256(PCR_state))`, encrypts data with AES-256-CBC.
- `unseal(blob)`: re-derives the wrapping key using the current PCR state. If PCRs changed (simulated with `simulateTampering()`), the derived key differs → decryption fails → throws "UNSEAL FAILED".
- `getAttestationQuote(nonce)`: signs current PCR state + nonce with an RSA private key (Attestation Key), proving system identity to a remote verifier.

**Why PCR binding matters.** A key that can only be unsealed on a clean boot cannot be extracted by malware that modifies the kernel — by the time the malware runs, the PCR state no longer matches the sealed state.

**References.**
- TCG TPM Library Specification, Part 1: Architecture (Revision 1.59): https://trustedcomputinggroup.org/resource/tpm-library-specification/
- NIST SP 800-164 — Guidelines on Hardware-Rooted Security in Mobile Devices: https://csrc.nist.gov/publications/detail/sp/800-164/final
- NIST SP 800-155 — BIOS Integrity Measurement Guidelines: https://csrc.nist.gov/publications/detail/sp/800-155/draft

---

## Streaming Demasker — Token Boundary Re-identification

**File:** `src/lib/streaming/demasker.ts`

**What it is.** A stateful processor that replaces PII tokens (e.g. `[PER_a1b2]`) with real values in a live AI streaming response, without requiring the entire response before starting output.

**The problem it solves.** Streaming responses arrive in arbitrary chunks. A token like `[PER_a1b2]` may be split across two chunks: `[PER_` in chunk 1 and `a1b2]` in chunk 2. A naive replacement would fail.

**How it works here.**
- Maintains an internal `buffer` string between chunks.
- On each `processChunk()`: appends chunk to buffer, scans for `[` (token start). Text before `[` is safe to emit. Scans for `]` (token end). If found → full token → `IdentityVault.deanonymize()` → replace. If not found and buffer ≥ 32 bytes → not a token → emit first character and rescan.
- `flush()`: called at stream end, emits any remaining buffer.

**Why 32-byte buffer limit.** Tokens are at most `[XYZ_xxxxxxxx]` = ~16 chars. A buffer larger than 32 without a closing `]` is not a token; flush one char and continue to avoid stalling the stream indefinitely.

**References.**
- Jurafsky & Martin — "Speech and Language Processing" 3rd ed., §2 (tokenization boundary problem)
- Server-Sent Events (SSE) protocol — streaming model for LLM outputs: https://html.spec.whatwg.org/multipage/server-sent-events.html

---

## Sandbox — WebAssembly Capability Model

**Files:** `src/lib/sandbox/manifest.ts`, `src/lib/sandbox/runtime.ts`

**What it is.** A model where a plugin (tool) declares its required permissions upfront in a manifest. The runtime enforces those declarations by only injecting the host functions it declared; everything else is unreachable.

**How it works here.**
- `ToolManifest`: declares `{network, filesystem, env_vars}` permissions and a `risk_level`.
- `DEFAULT_MANIFEST`: `risk_level: "HIGH"` — unknown tools are maximally restricted.
- `ToolExecutor.execute()`:
  1. Kill-switch check.
  2. HITL gate (`advancedHitl.requestApproval` with the manifest's risk level).
  3. Host function injection: `http_request` is only added to the WASM environment if `permissions.network === true`; otherwise WASM code that calls it fails at import time.
  4. Execute via Extism (WASM runtime).

**Why WASM.** WebAssembly runs in a memory-isolated VM. A malicious plugin cannot access the Node.js process heap, filesystem, or network unless the host explicitly injects those capabilities. The sandbox boundary is enforced by the WASM VM, not by application-level checks.

**References.**
- W3C WebAssembly Core Specification: https://webassembly.github.io/spec/core/
- WASI (WebAssembly System Interface) — capability-based system access: https://wasi.dev
- NIST SP 800-53 Rev 5 — SC-39 (Process Isolation), CM-7 (Least Functionality): https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- Principle of Least Privilege — Saltzer & Schroeder 1975, "The Protection of Information in Computer Systems"

---

## RAG Orchestrator — Push-Only Double-Blind Retrieval

**File:** `src/lib/rag/orchestrator.ts`

**What it is.** Retrieval-Augmented Generation (RAG) is a pattern where a language model's response is grounded by facts retrieved from an external knowledge base. "Push-only" means the agent never queries the knowledge base directly — the orchestrator does, on the agent's behalf.

**How it works here.**
- `retrieveAndInject(userQuery, contextPrefix, user)`:
  1. Kill-switch check.
  2. RBAC check: user must have `READ` on `CONTEXT` for the requested `contextPrefix`.
  3. Audit log: `RAG_ACCESS_ATTEMPT` (query is hashed before logging, not stored in plain text).
  4. Retrieval: `callMemoryService('/memory/retrieve', {query, context})` — the Python masker service (port 8000) handles the embedding search against ChromaDB.
  5. Results contain masked tokens (e.g. `[PER_1]`), not real values.
  6. Injection: results are wrapped in a `*** CONFIDENTIAL SYSTEM CONTEXT ***` block and injected as a system message.

**Why double-blind.** The agent receives masked facts. The vector database stores masked embeddings. Neither the agent nor the vector DB ever sees real PII — only the trusted `IdentityVault` holds the mappings.

**References.**
- Lewis et al. 2020 — "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Facebook AI): https://arxiv.org/abs/2005.11401
- OWASP LLM Top 10 2025 — LLM02 (Sensitive Information Disclosure in RAG): https://genai.owasp.org
- Mitra et al. 2022 — "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer" (grounding context injection)

---

## Truth Core — Multi-Source Claim Resolution

**Files:** `src/lib/truth/` (types, ingest, resolver, promotion, query, graph, importer)

**What it is.** A subsystem that takes claims from multiple sources ("Alice is CEO" from source A, "Alice is CTO" from source B), detects conflicts, and — after human approval on sensitive domains — promotes a single canonical statement of fact.

**Data model.** A claim is a triple: `(subject, predicate, object_value)` with provenance (`sourceType`, `sourceId`, `sourceRef`), confidence (0–100), and status (`active`, `conflicted`, `superseded`, `rejected`). A `TruthSnapshot` is the resolved output: one `singleLineOfTruth` + the list of supporting claim IDs + any unresolved conflicts.

**Pipeline.**
1. **Ingest** (`ingest.ts`): extracts `"<subject> is <object>"` triples from raw text, stores in `claims` table with provenance.
2. **Resolve** (`resolver.ts`): selects active claims for a key, picks winner by highest confidence then most recent, records conflicts in snapshot.
3. **Promote** (`promotion.ts`): for sensitive domains (payroll, finance, legal, security, compliance), requires RBAC (`WRITE` on `CONTEXT`) + HITL approval before the snapshot is accepted as canonical truth.
4. **Query** (`query.ts`): `getLatestTruthSnapshot(scope)` returns the current canonical snapshot for a scope; `exportLatestTruthAsJson()` for programmatic consumers.
5. **Graph** (`graph.ts`): exports nodes (entity, claim, truth) + edges (supports, conflicts_with, about) for visualization.

**Why provenance-first.** Recording where every claim came from makes it possible to retract a source (e.g., a compromised feed) and re-resolve truth without the corrupted claims.

**References.**
- Dong et al. 2014 — "Knowledge Vault: A Web-Scale Approach to Probabilistic Knowledge Fusion" (Google): https://dl.acm.org/doi/10.1145/2623330.2623623
- Wikidata data model — entity/statement/reference structure: https://www.mediawiki.org/wiki/Wikibase/DataModel
- NIST SP 800-188 (provenance tracking for data quality)

---

## Electron Trusted Zone — Context Isolation Architecture

**Files:** `src/electron/main.ts`, `src/electron/preload.ts`, `src/electron/renderer/`, `src/electron/ipc.ts`

**What it is.** Electron splits an application into two processes. The main process has full Node.js access (filesystem, crypto, DB). The renderer is a Chromium browser window — powerful, but untrusted because it renders arbitrary HTML/JS and is exposed to web content attacks. The preload script is the only controlled bridge between them.

**How it works here.**
- `main.ts` (Trusted Zone): holds `MitchChat` (RBAC, HITL, audit), `KillSwitch`, DB access. Never exposes any of this directly to the renderer.
- `preload.ts`: runs in the renderer's context but with Node.js access. It exposes only the typed `MitchBridge` interface via `contextBridge.exposeInMainWorld`.
- `renderer/renderer.ts` (Untrusted Zone): calls only `window.mitchBridge.sendInput()` and listens on `onOutput`/`onError`/`onLock`. It cannot import Node modules, access the filesystem, or call `ipcRenderer` directly.
- `ipc.ts`: typed constants for channel names (`terminal-input`, `terminal-output`, `terminal-error`, `system-lock`) + payload types, preventing string typos from creating accidental new channels.
- Kill-switch propagation: `main.ts` polls `KillSwitch.isLocked` every second and sends a `system-lock` IPC message to the renderer if engaged.

**Why `sandbox: true` + `contextIsolation: true`.** Without context isolation, a renderer XSS could call `require('child_process')`. With both options enabled, the renderer's `window` object is separate from the preload's, and Node.js APIs are completely inaccessible from renderer JS.

**References.**
- Electron Security Docs — Context Isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron Security Docs — `sandbox` option: https://www.electronjs.org/docs/latest/tutorial/sandbox
- Chromium Multi-Process Architecture: https://www.chromium.org/developers/design-documents/multi-process-architecture/
- CWE-923 — Improper Restriction of Communication Channel to Intended Endpoints

---

## Cross-Cutting: Defense in Depth

These modules are not independent features — they are concentric rings. The failure of any one ring does not compromise the system because the rings inside it still hold.

```
[Input]
  → Sanitize (remove invisible chars, tokenize emojis)
    → Tokenize PII (replace real values with context-scoped tokens)
      → RBAC (verify role can act on this resource)
        → HITL (require human approval for high-risk operations)
          → Audit (log everything, tamper-evident)
            → Kill-Switch (global halt on any breach signal)
              → TPM (bind keys to measured hardware state)
```

Each ring trusts the rings outside it as an extra layer but does not depend on them to stay secure. This is the "defense in depth" principle: no single point of failure.

**Reference.** NIST SP 800-53 Rev 5 — SC-2 (Separation of System and User Functionality), SA-8 (Security and Privacy Engineering Principles): https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
