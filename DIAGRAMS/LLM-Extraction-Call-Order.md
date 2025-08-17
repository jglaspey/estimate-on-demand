### LLM Extraction Call Order and Data Persistence

This document lists, in execution order, each LLM call in the current workflow, its inputs, outputs, and where the data is stored.

#### 0) Upload and Queue (non-LLM)
- Trigger: `POST /api/upload` → saves PDFs to `/uploads/`, creates `Job`, `Document` rows; then `DocumentProcessingQueue.addToQueue(jobId, filePaths)`
- Storage: `jobs`, `documents`

#### 1) Phase 1 – Fast Priority Fields (Claude)
- Caller: `DocumentProcessingQueue.processJob()` → `executeUploadExtraction()`
- Model: Claude (Haiku) document input
- Inputs: Primary PDF path (first file)
- Output (structured):
  - fields: `{ customerName, propertyAddress, claimNumber, policyNumber, dateOfLoss, carrier, claimRep, estimator, originalEstimate? }`
  - metadata: `{ extractionRate, confidence, processingTimeMs, fieldsFound, warnings[] }`
- Stored:
  - `jobs` (immediate update): fields above and `status='TEXT_EXTRACTED'`, plus `phase1ProcessingTime`
  - WebSocket: `job-progress` (~45%)

#### 2) Phase 2 – Full OCR (Mistral OCR API)
- Caller: `SmartExtractionService.extractFullDocumentData()`
- Model: `mistral-ocr-2505` (HTTP OCR)
- Inputs: All PDF file paths for the job
- Output (structured): Page objects with `content`, `confidence`, optional `imagesBase64`
- Stored:
  - Per page: `document_pages` (`rawText`, `extractedContent.processing_metadata`, `assets.pageImages` with normalized `/uploads/...`)

#### 3) Phase 2a – Estimate Line Item Extraction (Claude)
- Caller: `SmartExtractionService.extractStructuredDataWithClaude()` → `claudeLineItemExtractor.extractLineItems(fullText, pageTexts, jobId)`
- Model: Claude (Haiku) textual parsing
- Inputs: `fullText` and `pageTexts[]` from OCR for the estimate document
- Output (structured):
  - `lineItems[]` with `{ code?, description, quantity{value,unit}, unitPrice?, totalPrice?, section?, pageIndex, sourcePages[], confidence, isRidgeCapItem?, ridgeCapQuality? }`
  - classifiers: `roofType{ roofType, confidence, reasoning }`
- Stored:
  - Merged later into `mistral_extractions.extractedData` (see step 5)

#### 3b) Phase 2b – Roof Measurement Extraction (Claude)
- Caller: `SmartExtractionService.extractStructuredDataWithClaude()` → `claudeMeasurementExtractor.extractMeasurements(fullText, pageTexts, jobId)`
- Model: Claude (Haiku) textual parsing
- Inputs: `fullText` and `pageTexts[]` from OCR for the roof report document
- Output (structured):
  - `roofMeasurements` with `{ ridgeLength, hipLength, eaveLength, rakeLength, valleyLength, squares, slope, stories, sourcePages[], confidence }`
- Stored:
  - Merged later into `mistral_extractions.extractedData` (see step 5)

#### 4) Phase 2 Merge + Job Update (no LLM)
- Caller: `SmartExtractionService.mergeClaudeExtractionData()` and `updateJobWithDetailedData()`
- Inputs: outputs of 2, 3, 3b
- Stored:
  - `mistral_extractions` row: `extractedData = { lineItems, ridgeCapItems, roofMeasurements, roofType, documents[], extractionMetadata }`, `pageCount`, `confidence`
  - `jobs` (detailed fields): `roofSquares, roofStories, rakeLength, eaveLength, ridgeHipLength, valleyLength, roofSlope, roofMaterial`
  - WebSocket: `job-progress` (~80%) and `status='ANALYSIS_READY'`

#### 5) Phase 3 – Verification (tiny LLM, document-grounded)
- Caller: v2 Orchestrator
- Inputs: extracted data (RCV/ACV, line items, measurements) + relevant `document_pages.rawText` and page images
- Output: `verifications[]` with field-by-field confidence and any `corrections`
- Stored: `mistral_extractions.extractedData.verification`; high-confidence safe fields mirrored to `jobs`

#### 6) Phase 4 – Business Rule Analysis (Claude)
- Caller: `AnalysisWorker.runAllBusinessRules()` (invoked from SmartExtractionService)
- Model: Claude (Haiku / Sonnet) JSON-only analysis
- Inputs: Latest `mistral_extractions.extractedData` + `job`
- Output (per rule): `RuleAnalysisResult` objects (ridge cap implemented, others TBI)
- Stored:
  - `rule_analyses` rows: `{ ruleType, status, confidence, findings(json), reasoning, costImpact?, variance fields }`
  - `jobs.status='REVIEWING'`
  - WebSocket: `job-progress` (80→100%)

---

### Recommended strengthening for full requirements coverage

Keep calls modular and scoped; add small, targeted LLM calls instead of a single mega-prompt.

1) Phase 2a (Estimate) – Expand extractor coverage (Claude, same call or split)
- Ensure categories for: `ridge_cap`, `starter`, `drip_edge`, `gutter_apron`, `ice_water`, with codes and evidence.
- Option A (minimal change): one extractor call returns `lineItems[]` with `category` per item.
- Option B (higher reliability): split into dedicated calls per category (4 short calls) using focused prompts and smaller contexts.

2) Phase 2b (Roof Report) – Add code-required computation helper (Claude or deterministic)
- Compute required I&W SF from eave LF, pitch, and assumptions; store `requiredIceWaterSf` + explanation in `extractedData.extractionMetadata`.
- Prefer deterministic local computation where possible; use Claude only to infer missing inputs (e.g., soffit depth if present in text).

3) Normalization pass (no LLM or tiny LLM assist)
- Parse RCV/ACV/Net Claim, price list, and date completed from estimate pages into `jobs` or `extractedData.meta`.
- This can be regex-based; fall back to a tiny Claude call only if regex fails.

4) Enums and numeric mirrors (DB hygiene)
- Add `RuleStatus.SUPPLEMENT_NEEDED` and `RuleStatus.COMPLIANT`.
- In `rule_analyses.findings`, include numeric mirrors for quantities and deltas (for sorting/analytics).


