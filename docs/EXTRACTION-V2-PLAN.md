### Extraction v2 – Plan, Scope, and Implementation Outline

#### Goals
- Max reliability and completeness for all items in `comprehensive-extraction-requirements.md`.
- Small, composable LLM calls; deterministic computations where possible.
- Fill currently-null `Job` fields and persist category-specific line items.
- Each business rule runs as its own analysis call with clear inputs/outputs.

#### Branch & rollout strategy
- Create branch: `feature/extraction-v2` (parallel implementation, no breaking changes to current pipeline).
- Add new orchestrator under `lib/extraction/v2/` and dedicated API route (`/api/jobs/[jobId]/extract-v2`).
- Progressive enablement per environment; full swap after QA.

---

### Pipeline (v2) – Call order, inputs, outputs, storage

0) Upload and queue (existing; no change)
- Source: `/api/upload` → `DocumentProcessingQueue.addToQueue`
- Storage: `jobs`, `documents`

1) Phase 1 – Fast priority fields (Claude; unchanged interface)
- Caller: `processing-queue` → `executeUploadExtraction`
- Input: primary PDF (first file)
- Output: 8 priority fields + metadata
- Store: update `jobs` (priority fields), status `TEXT_EXTRACTED`

2) OCR – All pages (Mistral OCR; unchanged interface)
- Caller: `lib/extraction/v2/orchestrator.ts`
- Input: all PDFs; output: page markdown + images
- Store: `document_pages` (rawText, assets.pageImages), set `documents.pageCount`

3) Estimate totals & header normalization (deterministic-first)
- Parser reads estimate pages; extracts: `RCV`, `ACV`, `Net Claim`, `priceList`, `dateEstimateCompleted`
- Fallback: tiny Claude call only if regex fails
- Store: `jobs.originalEstimate`, (optional) `jobs.acv`, `jobs.netClaim`, `jobs.priceList`, `jobs.estimateCompletedAt`

4) Line-item extraction – 4 focused calls (Claude, small prompts)
- 4 calls against estimate text/pages (limit context to relevant sections):
  - Ridge Cap items (existing scope)
  - Starter items (universal/peel-and-stick vs cut/"included in waste")
  - Drip Edge items (codes/descriptions)
  - Gutter Apron items (codes/descriptions)
- Output per item: `{ code, description, quantity{value,unit}, unitPrice?, totalPrice?, pageIndex, sourcePages[], confidence, category }`
- Store: either as `extractedData.lineItems[]` with `category`, or dedicated arrays: `starterItems[]`, `dripEdgeItems[]`, `gutterApronItems[]` (choose one; default: single `lineItems[]` + `category`)

5) Roof measurements – deterministic-first + optional Vision
- Deterministic parser (regex over OCR text) for: `ridgeLength, hipLength, eaveLength, rakeLength, valleyLength, squares, predominantPitch, stories`.
- If `stories` or pitch are ambiguous: optional Claude Vision call with page images (`document_pages.assets.pageImages`) to disambiguate.
- Store: `extractedData.roofMeasurements{...}`; also mirror to `jobs` fields via update.

6) Compute required quantities (no LLM)
- `requiredStarterLf = eaveLength`
- `requiredDripEdgeLf = rakeLength`
- `requiredIceWaterSf = eaveLength * requiredInches / 12`, where `requiredInches` depends on soffit depth + wall thickness + pitch per code (defaults: 24" soffit, 6" wall; example ≈ 60.4" for 6/12).
- Store: `extractedData.requirements{ requiredStarterLf, requiredDripEdgeLf, requiredIceWaterSf }`

7) Persist extraction (merge)
- Create/Update `mistral_extractions` with full `extractedData`, `documents[]`, `pageCount`, `confidence`.
- Update `jobs` with measurement mirrors (squares, ridgeHipLength, eave/rake/valley, slope, stories/material when available).

8) Verification – Document-grounded audit (tiny LLM focused review)
- Caller: `lib/extraction/v2/orchestrator.ts` after merge
- Inputs: latest `mistral_extractions.extractedData`, selected `document_pages.rawText`, and page images (`assets.pageImages`) when helpful
- Behavior: Compare extracted values (e.g., RCV/ACV, totals, measurements, line-item categories) against the source text/images. Return corrections and confidence per field.
- Output JSON shape:
  - `verifications[]: { field, extractedValue, observedValue?, confidence, pages:[...], notes }`
  - `corrections: Record<string, any>` with only changed fields
- Store: attach to `mistral_extractions.extractedData.verification` and update `jobs` for safe fields (e.g., RCV/ACV) when high confidence

9) Rule analyses – 4 independent calls (Claude)
- Ridge Cap, Starter, Drip Edge & Gutter Apron, Ice & Water – separate prompts, temperature 0, JSON-only.
- Inputs: `mistral_extractions.extractedData` + computed `requirements`.
- Output: `RuleAnalysisResult` per rule with quantitative comparisons.
- Store: one `rule_analyses` record per rule; `jobs.status='REVIEWING'` at completion; WS events throughout.

---

### Schema updates
- `RuleStatus` enum: add `SUPPLEMENT_NEEDED`, `COMPLIANT`.
- Optional `Job` fields (nullable): `acv` (float), `netClaim` (float), `priceList` (string), `estimateCompletedAt` (datetime).
- Optional: `MistralExtraction.extractedData.requirements{...}` object.

### Implementation checklist (files & modules)
- Prisma
  - Update `prisma/schema.prisma` enums/fields → `npx prisma generate`.
- Orchestrator
  - Add `lib/extraction/v2/orchestrator.ts` with pipeline steps and feature flag.
- Normalizers
  - `lib/extraction/v2/estimate-normalizer.ts` (RCV/ACV/Net Claim/price list/date parsing; regex-first, LLM fallback helper).
  - `lib/extraction/v2/roof-measurement-parser.ts` (regex-first; shared helpers).
- Vision helper (optional)
  - `lib/extraction/v2/vision-helpers.ts` (Claude Vision call for stories/pitch from page images when ambiguous).
- Line-item extractors
  - Extend `lib/extraction/claude-line-item-extractor.ts` to support categories OR add `lib/extraction/v2/line-item-extractors.ts` with 4 focused prompts.
- Requirements
  - `lib/extraction/v2/requirements.ts` to compute required quantities (no LLM).
- Analysis
  - Update `lib/analysis/analysis-worker.ts` to call 4 rule functions (toggleable), map statuses to updated enums.
- API (for testing)
  - Add `app/api/jobs/[jobId]/extract-v2/route.ts` to run v2 end-to-end without affecting current flow.

### Testing plan
- Golden documents in `examples/` (estimate + roof report).
- Unit tests for parsers & requirements (deterministic outputs).
- Integration test: run v2 pipeline → assert DB rows populated and enums valid.
- Spot-check with `TEMP-DATA-READ.md` values; verify nulls eliminated (`job.originalEstimate`, eave/rake/ridgeHip/valley/slope/stories, etc.).

### Rollout
- Dev: run via `/api/jobs/[jobId]/extract-v2` and compare outputs vs current.
- Stage: v2 enabled by default; route and queue now call v2 directly.
- Prod: swap orchestrator once parity plus added coverage is verified.

### Reliability guidelines
- Keep prompts small and task-focused; temperature 0.
- Restrict context (subset of pages) by heuristic: sections around items/headers.
- Use deterministic math for coverage requirements; no LLM arithmetic.
- Persist evidence (page indices, snippets, image references) for auditability.


