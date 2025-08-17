## Message-by-message summary (Extraction V2 thread)

- **Context**: Export timestamp in source thread indicates 2025-08-16; conversation spans design, planning, implementation, and UI validation for Extraction V2.

### 1) User → Request for architecture diagrams
- Asked for: C4, Sequence, ERD, State machine diagrams; suggested building them in `/DIAGRAMS/` and reading code first.
- **Decision**: Use “diagrams as code” (Mermaid) and keep diagrams in-repo for versioning.

### 2) Assistant → Scans repo and proposes plan
- Scans manifests, APIs, services to ground diagrams.
- **Decision**: Generate multiple diagram sets (C4 levels, sequence of upload→extraction→analysis→review, ERD, states).

### 3) User → Provides supporting docs
- Points at `DEPLOYMENT.md`, `EXTRACTION-MODEL.md`, `CLAUDE.md`, `WORKSPACE_START-HERE.md` for context.
- **Decision**: Incorporate docs into diagrams for accuracy.

### 4) Assistant → Creates `/DIAGRAMS/` with Mermaid
- Adds: C4 context/container (current + production), component diagram, sequence, ERD, job/document state machines, and README.
- Highlights containers (Next.js API, WebSockets, Prisma/Postgres, Mistral OCR, Claude), flows, and entities.
- **Decision**: Keep diagrams close to code; update via PRs.

### 5) User → Requests PNG exports
- Wants PNGs of all diagrams.
- Assistant reports PNGs generated (for sharing/presentations).
- Note: Source control remains Mermaid; PNGs referenced in chat context.

### 6) User → Asks to analyze `TEMP-DATA-READ.md` vs model/rules
- Questions: Am I extracting/storing the right data? Is analysis set up correctly?
- Assistant returns high-signal verdicts: ridge cap is solid; gaps remain for starter, drip edge/gutter apron, and Ice & Water.
- **Decisions**:
  - Add `RuleStatus` enum values (`SUPPLEMENT_NEEDED`, `COMPLIANT`).
  - Normalize estimate totals/dates.
  - Extract line items per category; compute deterministic “required” quantities.
  - Continue evidence storage; consider bbox later.

### 7) User → Wants an outline of the current call order doc
- Requests doc listing each LLM call, inputs, outputs, storage.
- Assistant creates `DIAGRAMS/LLM-Extraction-Call-Order.md`.
- **Decision**: Keep calls modular and scoped; prefer several small calls over one mega-prompt.

### 8) User → Plans a cleaner, v2 workflow on a new branch
- Wants a parallel extraction v2 with clear design and testing before replacing v1.
- Assistant drafts `docs/EXTRACTION-V2-PLAN.md` covering pipeline, schema updates, implementation checklist, tests, rollout.
- **Decisions**:
  - Branch `feature/extraction-v2`.
  - Introduce `lib/extraction/v2/orchestrator.ts` under a feature flag `EXTRACTION_V2=1`.
  - Add dedicated route `/api/jobs/[jobId]/extract-v2` for safe, end-to-end testing.

### 9) User → Clarifies “tiny LLM fallback” vs verification
- Prefers extraction + a verification LLM pass against source.
- Assistant agrees and inserts a Verification phase (document-grounded audit) into plan and call-order.
- **Decision**: Add verification phase after merge; store verifications and corrections.

### 10) Assistant → Scaffolds orchestrator + route behind feature flag
- Adds `orchestrator.ts` emitting WS progress; sets job to `ANALYSIS_READY`.
- Adds POST `/api/jobs/[jobId]/extract-v2` route (feature-flagged).
- **Decision**: Non-blocking background run; mirror current async behavior.

### 11) User → Greenlight to create/switch branch and commit
- Branch `feature/extraction-v2` created and committed with plan, diagrams, orchestrator, route.
- **Decision**: Keep working locally (no push/PR yet).

### 12) Assistant → Implements v2 modules
- Adds: `estimate-normalizer` (regex-first + tiny LLM), `line-item-extractors` (starter, drip edge, gutter apron, I&W), `roof-measurement-parser` (regex-first), `verification` (LLM), wires into `orchestrator.ts`.
- **Decision**: Persist under `mistral_extractions.extractedData.v2` and mirror key metrics to `jobs`.

### 13) Assistant → Adds GET endpoint + enables flag
- Sets `EXTRACTION_V2=1`; adds GET `/api/jobs/[jobId]/extract-v2` to fetch `extractedData.v2`.
- **Decision**: Provide minimal admin viewer endpoint for QA.

### 14) User → Asks if normal frontend can drive v2
- Assistant updates `DocumentProcessingQueue` to call v2 when `EXTRACTION_V2=1`.
- **Decision**: Existing UI flow triggers v2 automatically post-upload.

### 15) User → Shares example job JSON and wants a basic v2 viewer
- Assistant adds a small client-side viewer page to render v2 totals, line items, measurements, verification.
- **Decision**: Provide missing fields summary to guide QA.

### 16) User → Notes UI mismatch (ridges 208 vs 101)
- Issue: Combined vs separate values (Total Ridges/Hips vs Ridge only).
- Assistant fixes parser to capture `totalRidgeHip`, mirrors to `job.ridgeHipLength`, preserves `ridgeLength=101` and `hipLength=6`.
- **Decision**: Compute and show combined + parts; avoid mis-assignments.

### 17) User → Asks if any other combined values need visualization
- Assistant identifies `dripEdgeTotal = eaves + rakes`.
- **Decision**: Derive `dripEdgeTotal`; update viewer/UI to show totals with sublabels for parts.

### 18) UI alignment in `job-detail`
- Assistant updates `app/job-detail/[jobId]/page.tsx` to prefer v2 measurement values and coerce strings to numbers, and to render ridge/hip sublabels.
- **Decision**: Align UI panels; compute combined values if needed.

### 19) Extractors and heuristics improvements
- Expands gutter apron selection regex; adds roof-material heuristic (`extractRoofMaterialFromPages`) and persists to `v2.measurements` and `job.roofMaterial`.
- **Decision**: Enrich `v2.measurements` and job mirrors to support UI and rules.

### 20) Commit milestone
- Commit: feat(extraction-v2): align UI with v2 values; ridge/hip sublabel; consolidate Drip Edge total; regex for gutter apron; roof material helper; lint fixes.
- **Decision**: Baseline stable for continued v2 work and QA.

---

## Key decisions at a glance
- **Diagrams as code** in `/DIAGRAMS/` with Mermaid; PNGs for sharing.
- **Phase separation**: Fast Phase 1 (Claude) + Phase 2 (OCR + focused extractors) + Verification + Rule analysis.
- **Feature flag** `EXTRACTION_V2=1` with dedicated POST/GET endpoints for v2.
- **Modular LLM calls**: small, category-specific extractors (starter, drip, gutter apron, I&W) rather than one mega prompt.
- **Verification pass**: document-grounded LLM check; attach to `extractedData.v2.verification`.
- **Deterministic first**: regex-first normalizers and measurement parsers; tiny LLM only as fallback.
- **Data persistence shape**: write under `mistral_extractions.extractedData.v2` and mirror key fields to `jobs`.
- **UI alignment**: prefer v2 measurements; show combined totals with part breakdown; add viewer for QA.
- **Schema readiness**: add missing `RuleStatus` enum values; plan numeric mirrors for findings if needed.
