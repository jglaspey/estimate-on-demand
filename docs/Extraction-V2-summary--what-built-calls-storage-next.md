## Extraction V2 – What we built, calls made, responses, storage, and what’s next

### What we built
- **Extraction V2 pipeline** is now the default with POST/GET endpoints at `/api/jobs/[jobId]/extract-v2`.
- **New orchestrator** `lib/extraction/v2/orchestrator.ts` emitting WebSocket progress and writing results to `mistral_extractions.extractedData.v2`.
- **Deterministic-first modules**:
  - `estimate-normalizer.ts`: regex-first parsing of RCV, ACV, Net Claim, Price List, Date Completed; tiny LLM fallback only if needed.
  - `roof-measurement-parser.ts`: regex-first parsing from roof report pages (ridge, hip, eave, rake, valley, squares, pitch, stories), plus `totalRidgeHip`; `dripEdgeTotal` computed as eaves + rakes.
  - `line-item-extractors.ts`: small, focused LLM calls for `starter`, `drip_edge`, `gutter_apron`, `ice_water` items.
  - `verification.ts`: document-grounded LLM audit that compares extracted values against source text/images and returns field-level confidence/corrections.
- **Viewer & UI alignment**:
  - Minimal admin viewer to render `v2` (totals, line items, measurements, verification) and list missing fields.
  - `app/job-detail/[jobId]/page.tsx` updated to prefer v2 measurements, coerce numeric strings, and visually show combined totals with part breakdown (e.g., Ridges/Hips, Drip Edge total → Eaves • Rakes).
- **Docs & diagrams**: Mermaid-based C4, sequence, ERD, state diagrams in `/DIAGRAMS/` and call-order doc; `docs/EXTRACTION-V2-PLAN.md` finalized with verification phase.

### Call order (v2) – inputs → outputs → storage
1) Upload & queue (non-LLM)
- Input: PDFs → `POST /api/upload` → `DocumentProcessingQueue.addToQueue`
- Storage: `jobs`, `documents`

2) Phase 1 – Fast priority fields (Claude)
- Input: primary PDF
- Output: `{customerName, propertyAddress, claimNumber, policyNumber, dateOfLoss, carrier, claimRep, estimator}` + metadata
- Storage: `jobs` (immediate), status `TEXT_EXTRACTED`; progress ~45%

3) OCR – All pages (Mistral OCR)
- Input: all PDFs
- Output: page texts and images
- Storage: `document_pages.rawText`, `extractedContent.assets.pageImages`; set `documents.pageCount` when available

4) Totals normalization (deterministic-first, tiny LLM fallback)
- Input: estimate pages text
- Output: `rcv`, `acv`, `netClaim`, `priceList`, `estimateCompletedAt`, confidence, sources, usedLLM
- Storage: `v2.totals` (under `mistral_extractions.extractedData`), mirror `job.originalEstimate` (optionally others later)

5) Line-item extraction (Claude, small focused calls)
- Input: estimate page texts
- Output: categorized items for `starter`, `drip_edge`, `gutter_apron`, `ice_water` with `{code, description, quantity, unitPrice, totalPrice, sourcePages, confidence}`
- Storage: `v2.lineItems` (under `mistral_extractions.extractedData`)

6) Roof measurements (deterministic-first; optional vision later)
- Input: roof report page texts (optionally page images later)
- Output: `ridgeLength`, `hipLength`, `eaveLength`, `rakeLength`, `valleyLength`, `squares`, `pitch`, `stories`, `totalRidgeHip`; derived `dripEdgeTotal = eaves + rakes`
- Storage: `v2.measurements`; mirror to `jobs` (`roofSquares`, `eaveLength`, `rakeLength`, `valleyLength`, `ridgeHipLength`, `roofSlope`, `roofStories`)

7) Verification (document-grounded audit, tiny LLM)
- Input: `v2.totals` subset + relevant `document_pages.rawText` and images
- Output: `verification = { verifications[], corrections{} }`
- Storage: `v2.verification`; for high-confidence corrections, optionally mirror to `jobs` in future

8) Rule analyses (Claude; independent per rule)
- Input: latest `extractedData.v2` + computed requirements (planned) + job mirrors
- Output: per-rule `RuleAnalysisResult` (ridge cap working; others to follow)
- Storage: `rule_analyses` rows; `jobs.status='REVIEWING'` at completion

### What it replies with (examples)
- Phase 1 (Claude): key identity/claim fields + metadata (confidence, processingTime, extractionRate).
- OCR (Mistral): page `rawText`, pageImages references under `/uploads/...`.
- Totals normalization: `{ rcv, acv, netClaim, priceList, estimateCompletedAt, confidence, sources[], usedLLM }`.
- Line items: array of categorized items with evidence page refs and confidence.
- Measurements: ridge/hip/eave/rake/valley/squares/pitch/stories, `totalRidgeHip`, and derived `dripEdgeTotal`.
- Verification: field-by-field confidence and any corrections; links back to source pages.
- Rules: `RuleAnalysis` records with variance, cost impact, reasoning, evidence.

### Where it’s stored
- `mistral_extractions.extractedData.v2`:
  - `totals`, `lineItems`, `measurements`, `verification`
- Job mirrors:
  - `originalEstimate`, `roofSquares`, `eaveLength`, `rakeLength`, `valleyLength`, `ridgeHipLength`, `roofSlope`, `roofStories`, `roofMaterial`
- `document_pages`:
  - `rawText`, `extractedContent.assets.pageImages`
- `rule_analyses`:
  - One row per rule (ridge cap in place; others WIP)

### What’s next (implementation plan)
- **Enums & schema**
  - Add `RuleStatus.SUPPLEMENT_NEEDED`, `COMPLIANT` (if not already applied); consider numeric mirrors in findings for analytics.
- **Line-item coverage**
  - Harden category extractors with additional patterns/evidence; ensure separation of drip edge vs gutter apron across diverse phrasing.
- **Requirements module**
  - Implement `requirements.ts` to compute `requiredStarterLf = eaveLength`, `requiredDripEdgeLf = rakeLength`, `requiredIceWaterSf` from eave length and pitch (deterministic), and store under `v2.requirements`.
- **Verification expansion**
  - Expand beyond totals to validate measurements and category items; only mirror high-confidence corrections.
- **Vision (optional)**
  - Add vision helpers for ambiguous `stories/pitch` from page images.
- **UI/QA**
  - Expose v2 results in the admin viewer with combined totals and sublabels; surface “missing fields” checklist to drive parity.
- **Rules 2–4**
  - Implement analysis for Starter, Drip Edge & Gutter Apron, Ice & Water using v2 data + requirements.

### How to run v2 now
- No env flag required; v2 runs by default.
- Upload via existing UI; Phase 2 will use v2 pipeline automatically.
- Or call: `POST /api/jobs/{jobId}/extract-v2` to trigger.
- Retrieve: `GET /api/jobs/{jobId}/extract-v2` → `{ jobId, v2, job }`.

### Notes
- Keep prompts small, temperature 0, and context tightly scoped to relevant page snippets.
- Prefer deterministic parsing; LLM only as fallback or for verification.
- Maintain evidence: page indices and image references for auditability.
