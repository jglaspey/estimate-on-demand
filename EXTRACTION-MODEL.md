# Hip/Ridge Extraction Model

## Hip/Ridge Extraction Flow Description

**User uploads document** → Document saved to filesystem and database (Job, Document records created) → Processing queue picks up job

**Phase 1: Quick Priority Fields (30-60 seconds)**
- **Claude API call**: `POST https://api.anthropic.com/v1/messages` with PDF submission
- **PDF Submission Options**:
  - **Current (Base64)**: Direct PDF as base64 document in message content
    ```typescript
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64  // Convert PDF buffer to base64
      }
    }
    ```
    - ✅ Single API call, works with any PDF size under 32MB
    - ❌ Large payload size, re-sends PDF on each call
  - **Production Option (Files API)**: Upload once, reference by file_id
    ```typescript
    // Step 1: Upload PDF
    POST https://api.anthropic.com/v1/files
    // Step 2: Reference in messages
    {
      type: 'document',
      source: {
        type: 'file',
        file_id: 'file_011CNha8iCJcU1wXNR6q4V8w'
      }
    }
    ```
    - ✅ Upload once, reference many times; better for large files
    - ❌ Two-step process, requires beta header
- Extract 8 priority fields: customer name, property address, claim number, policy number, date of loss, carrier, claim rep, estimator, original estimate
- Update Job record with core fields immediately
- WebSocket emits progress event (45% complete)
- User sees basic info populate in real-time

**Phase 2: Full Document Extraction (parallel, background)**
- **Mistral OCR API call**: `POST https://api.mistral.ai/v1/ocr` with PDF submission
- **PDF Submission Options**:
  - **Current (Data URI)**: Base64 encoded PDF as data URI
    ```typescript
    {
      model: 'mistral-ocr-2505',
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${base64Pdf}`
      }
    }
    ```
    - ✅ Single API call, no external hosting required
    - ❌ Large payload size for big files
  - **Public URL Option**: For large files or hosted documents
    ```typescript
    {
      model: 'mistral-ocr-2505',
      document: {
        type: 'document_url',
        document_url: 'https://your-domain.com/path/to/document.pdf'
      }
    }
    ```
    - ✅ Minimal payload, good for large files
    - ❌ Requires public URL hosting, security considerations
  - **Mistral Files API**: Upload to Mistral storage first
    ```typescript
    // Step 1: Upload to Mistral, get file_id
    // Step 2: Get signed URL, use in OCR call
    ```
    - ✅ Secure file handling, good for large files
    - ❌ Multi-step process, additional API calls
- **Additional Options**:
  - Page selection: `pages: [1, 2, 3]` to process specific pages only
  - Response format options: markdown, text, structured content
- Mistral returns page-by-page markdown text for all pages
- Save each page's raw text to DocumentPage table

**Phase 2a: Line Item Extraction (estimates only)**
- API call to Claude Haiku: `POST https://api.anthropic.com/v1/messages` with estimate page text chunks
- Claude parses line items into structured JSON: `{ code, description, quantity, unit, unitPrice, totalPrice, category, sourcePages }`
- Also extracts classifiers: roof type (laminated/3-tab), ridge cap type (purpose-built/cut-from-3tab)

**Phase 2b: Measurement Extraction (roof reports only)**  
- API call to Claude Haiku: `POST https://api.anthropic.com/v1/messages` with roof report page text chunks
- Claude extracts measurements: `{ ridgeLength, hipLength, eaveLength, rakeLength, valleyLength, squares, slope, stories, sourcePages }`

**Phase 2 Completion**
- Merge all extracted data into single JSON object
- Create MistralExtraction record with combined `extractedData`
- Update Job record with roof measurements (ridgeHipLength, eaveLength, etc.)
- Set Job status to "ANALYSIS_READY"
- WebSocket emits progress event (80% complete)

**Rule 1 Analysis (triggered separately)**
- Analysis worker reads latest MistralExtraction.extractedData JSON
- API call to Claude Haiku: `POST https://api.anthropic.com/v1/messages` with structured JSON + Rule 1 prompt
- Claude analyzes ridge cap compliance (no OCR text needed, just the structured data)
- Returns RuleAnalysisResult: status, confidence, reasoning, cost impact, variance calculations
- Save RuleAnalysis record for ridge_cap rule
- Set Job status to "REVIEW"
- WebSocket emits completion (100%)

**User Views Results**
- `/app/analysis/[jobId]` shows progress and basic rule status
- `/app/job-detail/[jobId]` fetches Job + latest RuleAnalyses via API
- UI maps database extractions to ridge cap display using existing `mapDatabaseToRidgeCapData()`
- User sees "6 LF vs 119 LF shortage" with detailed analysis

## Supporting Mermaid Flow

```mermaid
flowchart TD
    A[User uploads PDF] --> B[Save to filesystem + DB]
    B --> C[Add to processing queue]
    
    C --> D[Phase 1: Quick Fields]
    D --> E[Claude API call<br/>PDF → priority fields]
    E --> F[Update Job record<br/>WebSocket 45%]
    
    C --> G[Phase 2: Full Extraction]
    G --> H[Mistral OCR API<br/>PDF → page text]
    H --> I[Save DocumentPages]
    
    G --> J[Claude: Line Items<br/>estimate text → items[]]
    G --> K[Claude: Measurements<br/>roof report → measurements]
    
    J --> L[Merge extracted data]
    K --> L
    I --> L
    L --> M[Save MistralExtraction<br/>Update Job → ANALYSIS_READY<br/>WebSocket 80%]
    
    M --> N[Rule 1 Analysis Worker]
    N --> O[Claude API call<br/>JSON → RuleAnalysisResult]
    O --> P[Save RuleAnalysis<br/>Job → REVIEW<br/>WebSocket 100%]
    
    P --> Q[User views results<br/>/job-detail/[jobId]]
    Q --> R[API: GET job + rules]
    R --> S[UI shows: 6 LF vs 119 LF]

    style D fill:#e1f5fe
    style G fill:#f3e5f5
    style N fill:#fff3e0
    style Q fill:#e8f5e8
```

## Key API Calls

1. **Claude Haiku (Priority)**: `claude-3-5-haiku-20241022` with PDF document type
2. **Mistral OCR**: `mistral-ocr-2505` for full page text extraction  
3. **Claude Haiku (Line Items)**: text parsing for estimate line items
4. **Claude Haiku (Measurements)**: text parsing for roof measurements
5. **Claude Haiku (Rule Analysis)**: JSON analysis for compliance determination

## Separation of Concerns

- **Extraction**: Steps 1-12 only parse and normalize data, no compliance decisions
- **Analysis**: Step 13+ takes structured data and determines rule compliance
- **UI**: Reads final results, no direct LLM calls

## Implementation Files

- **Phase 1**: `lib/extraction/upload-integration.ts` (existing)
- **Phase 2**: `lib/extraction/smart-extraction-service.ts` (enhance with Claude extractors)
- **New**: `lib/extraction/claude-extractors.ts` (line items + measurements)
- **Analysis**: New analysis worker (separate from extraction)
- **UI**: `lib/ridge-cap-data-mapper.ts` + `app/job-detail/[jobId]/page.tsx` (existing)

## Data Flow

1. **Input**: PDF documents (estimate + roof report)
2. **Phase 1 Output**: Priority fields in Job record
3. **Phase 2 Output**: `MistralExtraction.extractedData` with `{ lineItems[], roofMeasurements{} }`
4. **Analysis Output**: `RuleAnalysis` record with compliance determination
5. **UI Input**: Combined Job + MistralExtraction + RuleAnalysis data via API

## PDF Submission Recommendations

### **Current Implementation (Good for MVP)**
- **Phase 1**: Base64 document submission to Claude ✅
- **Phase 2**: Data URI base64 submission to Mistral OCR ✅
- **File Size Limits**: Works well for typical insurance documents (<10MB)
- **Simplicity**: Single API calls, no file management complexity

### **Production Enhancements**
```typescript
// Enhanced Phase 1 approach
if (pdfBuffer.length > 10 * 1024 * 1024) { // > 10MB
  // Use Claude Files API for large documents
  const fileId = await uploadToClaudeFiles(pdfBuffer);
  content = [{ type: 'document', source: { type: 'file', file_id: fileId } }];
} else {
  // Use base64 (current approach) for smaller files
  content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }];
}

// Enhanced Phase 2 approach  
if (pdfBuffer.length > 5 * 1024 * 1024) { // > 5MB
  // Upload to temporary storage and use URL for large files
  const tempUrl = await uploadToTempStorage(pdfBuffer);
  document = { type: 'document_url', document_url: tempUrl };
} else {
  // Use data URI (current approach) for smaller files
  document = { type: 'document_url', document_url: `data:application/pdf;base64,${base64}` };
}
```

### **File Size Considerations**
- **Claude**: 32MB max, 100 pages max
- **Mistral OCR**: No explicit limit, but performance degrades with very large files
- **Typical Insurance Docs**: 2-15 pages, 1-8MB
- **Sweet Spot**: Current base64 approach works for 95% of use cases

### **Security Considerations**
- **Base64/Data URI**: Documents stay in API calls, no external storage
- **Files API**: Documents stored temporarily in provider systems
- **Public URLs**: Require secure hosting and access controls
- **Recommendation**: Use base64 for sensitive documents, Files API for efficiency


## OCR Extraction Insights

### Scope
This document summarizes the experiments, reliability results, and JSON extraction design for insurance estimate PDFs processed with Mistral OCR.

### What we tested
- OCR via URL (https): Mistral OCR endpoint with a publicly accessible link
- OCR via Data URL (base64): same endpoint using `data:application/pdf;base64,...`
- Optional cleanup: post-processing the OCR text with `mistral-small-latest` to normalize prose/markdown

Inputs used:
- Estimate: `Evans___Bob_NE_5916_estimate_from_url.pdf`
- Roof report: `Evans___Bob_NE_5916_roof-report.pdf`

Artifacts: `experiments/ocr_matrix_results/` (JSON + MD per run), analysis in `experiments/ocr_matrix_results/analysis/`

### Findings (reliability)
- Estimate (URL vs Data URL)
  - Page identity: 16/17 identical; one page had trivial formatting differences.
  - Word similarity: Jaccard 100.00%, Cosine 100.00%.
  - Numeric consistency: identical (0 differences across 348 numeric tokens).
  - Conclusion: URL and base64 Data URL are functionally equivalent for this doc.

- Roof report (Data URL only in this run)
  - Cleanup is shorter prose; not comparable for totals. Use raw OCR for quantitative analysis.

Sources (internal):
- Matrix table: `experiments/ocr_matrix_results/analysis/compare_all.md`
- Pair report: `experiments/ocr_matrix_results/analysis/report.md`

References (external):
- Mistral OCR API and schema: https://docs.mistral.ai/api/#tag/ocr/operation/ocr_v1_ocr_post
- OCR annotations for structured JSON: https://docs.mistral.ai/capabilities/OCR/annotations

### Key takeaways
- Use the OCR API with either https URL or base64 Data URL. Prefer URL for simplicity, Data URL for private/local input.
- Numeric integrity is the critical metric for claims; both paths preserved it perfectly in our test.
- Markdown page text is consistent; minor differences are layout/spacing.

### Smart JSON for supplements
Goal: ultra-fast lookup (e.g., “ridge cap, page 3, 104.25 LF”), accurate totals, and jump-to-PDF UX.

Proposed top-level structure:
```json
{
  "document": { "id": "...", "sourceUrl": "...", "pagesProcessed": 17, "docSizeBytes": 83098 },
  "meta": {
    "insured": "Evans, Robert",
    "claimNumber": "1354565-242889-014101",
    "policyNumber": "NEA47803",
    "dateOfLoss": "2024-05-21",
    "priceList": "NEOM8X_JUN24",
    "estimator": "David Sanchez"
  },
  "lineItems": [
    {
      "id": "li-12-ridge-cap",
      "pageIndex": 2,
      "section": "Exterior > Roofing",
      "lineNumber": 12,
      "description": {
        "raw": "Hip / Ridge cap - Standard profile - composition shingles",
        "normalized": "ridge cap - composition",
        "tags": ["ridge_cap", "hip_cap"]
      },
      "quantity": { "value": 104.25, "unit": "LF", "unitNormalized": "linear_feet" },
      "unitPrice": { "value": 7.15, "currency": "USD" },
      "tax": { "value": 17.14, "currency": "USD" },
      "rcv": { "value": 762.53, "currency": "USD" },
      "depreciation": { "value": 124.23, "currency": "USD" },
      "acv": { "value": 638.30, "currency": "USD" },
      "confidence": 0.98,
      "source": {
        "markdownSnippet": "12. Hip / Ridge cap ... | 104.25 LF | 7.15 | 17.14 | 762.53 | (124.23) | 638.30",
        "markdownOffset": { "start": 12345, "end": 12480 },
        "pdf": { "page": 3, "bbox": null }
      }
    }
  ],
  "totals": {
    "dwelling": { "rcv": 27757.04, "acv": 23619.62, "depreciation": 4137.42 },
    "otherStructures": { "rcv": 291.46 }
  },
  "index": {
    "byTag": { "ridge_cap": ["li-12-ridge-cap"] },
    "byPage": { "3": ["li-12-ridge-cap"] }
  },
  "validations": [
    { "rule": "sum(rcv.roofing) == recap.roofing.rcv", "status": "ok" }
  ]
}
```

Why it works for supplement writers
- `pageIndex` and (future) `source.pdf.bbox` enable precise PDF jumps/highlights.
- `tags` and `index.byTag` power instant search (“ridge_cap”).
- `quantity`, `unit`, `rcv/acv` normalized → accurate math & deltas.
- `validations` surface mismatches to verify supplement recommendations quickly.

### Getting JSON directly from Mistral OCR
Use annotations to receive structured JSON along with pages:
```json
{
  "model": "mistral-ocr-latest",
  "document": { "type": "document_url", "document_url": "<https-or-data-url>" },
  "document_annotation_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "estimate",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "meta": {
            "type": "object",
            "properties": {
              "insured": { "type": "string" },
              "claimNumber": { "type": "string" },
              "policyNumber": { "type": "string" },
              "dateOfLoss": { "type": "string" }
            },
            "required": ["insured", "claimNumber"]
          },
          "line_items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "pageIndex": { "type": "integer" },
                "lineNumber": { "type": "integer" },
                "section": { "type": "string" },
                "description": { "type": "string" },
                "quantity": {
                  "type": "object",
                  "properties": {
                    "value": { "type": "number" },
                    "unit": { "type": "string" }
                  },
                  "required": ["value", "unit"]
                },
                "unitPrice": { "type": "number" },
                "rcv": { "type": "number" },
                "depreciation": { "type": "number" },
                "acv": { "type": "number" }
              },
              "required": ["pageIndex", "description", "quantity"]
            }
          }
        },
        "required": ["line_items"]
      }
    }
  }
}
```

To attach region-level boxes (for PDF highlights), add `bbox_annotation_format` with a JSON schema focused on per-image/table items; OCR will return `imageAnnotation` entries that you can map to PDF coordinates later.

### Implementation notes
- Current code already produces per-page markdown and raw JSON; a transformer can normalize into the smart JSON above and build `index` and `validations`.
- For jump-to-PDF links in a web viewer, construct `#page=<page>&search=<term>` anchors; bbox highlighting can be layered in once available.

## LLM Calls Inventory (where, inputs, prompts, outputs, persistence, consumers)

1) Phase 1: Priority Fields (Claude Haiku)
- Where: `lib/extraction/claude-phase1-extractor.ts` (invoked from `lib/extraction/upload-integration.ts` → processing queue)
- Endpoint/Model: `POST https://api.anthropic.com/v1/messages` `claude-3-5-haiku-20241022`
- Inputs: PDF as base64 document (current) or `file_id` via Claude Files (planned, size-based). Temperature 0, JSON-only response.
- Prompt (summary): Extract exactly the 8 priority fields and return strict JSON; allow nulls when not present. No analysis.
- Output: `{ customerName, propertyAddress, claimNumber, policyNumber, dateOfLoss, carrier, claimRep, estimator, originalEstimate? }` plus run metadata (processing time, confidence).
- Persistence: Writes fields into `job` record immediately; progress events via WebSocket (≈45%).
- Consumers: `/app/analysis/[jobId]`, `/app/job-detail/[jobId]` for early UI population.

2) Phase 2: Full OCR (Mistral OCR)
- Where: `lib/extraction/mistral-service.ts` (orchestrated by `lib/extraction/smart-extraction-service.ts`)
- Endpoint/Model: `POST https://api.mistral.ai/v1/ocr` `mistral-ocr-2505` (or `mistral-ocr-latest`)
- Inputs: PDF as data URL (current) or public/signed URL (planned for large files). Optional `pages: number[]` and `document_annotation_format` for structured JSON.
- Output: Page-by-page markdown/text, optionally annotations JSON.
- Persistence: `DocumentPage.rawText` per page; creates/updates a `MistralExtraction` record.
- Consumers: Phase 2a/2b Claude extractors, downstream analysis.

3) Phase 2a: Estimate Line-Item Extractor (Claude Haiku)
- Where: `lib/extraction/claude-line-item-extractor.ts`
- Endpoint/Model: `POST https://api.anthropic.com/v1/messages` `claude-3-5-haiku-20241022`
- Inputs: OCR text chunks from estimate pages; deterministic prompt; temperature 0; JSON-only schema.
- Output: Array of normalized line items: `{ code?, description, quantity{value,unit}, unitPrice?, totalPrice?, section?, pageIndex, sourcePages[] }` and classifiers like `{ roofType?, ridgeCapType? }` where available.
- Persistence: Merged into latest `MistralExtraction.extractedData.lineItems[]` with provenance and page refs.
- Consumers: Rule 1 UI (ridge cap line), future rules, evidence linking.

4) Phase 2b: Roof Measurement Extractor (Claude Haiku)
- Where: `lib/extraction/claude-measurement-extractor.ts`
- Endpoint/Model: `POST https://api.anthropic.com/v1/messages` `claude-3-5-haiku-20241022`
- Inputs: OCR text chunks from roof reports; deterministic prompt; temperature 0; JSON-only schema.
- Output: `roofMeasurements` object: `{ ridgeLength, hipLength, eaveLength, rakeLength, valleyLength, squares, slope, stories, sourcePages[] }`.
- Persistence: Merged into latest `MistralExtraction.extractedData.roofMeasurements{}` with provenance.
- Consumers: Rule 1 analysis and UI display.

5) Rule Analysis (separate from extraction)
- Where: Analysis worker (separate process/route) consuming DB JSON; not coupled to OCR.
- Endpoint/Model: `POST https://api.anthropic.com/v1/messages` `claude-3-5-haiku-20241022`
- Inputs: Strict structured JSON only (extractedData and required fields), no raw OCR text. Temperature 0.
- Output: `RuleAnalysisResult` with status, confidence, reasoning, and computed deltas.
- Persistence: `RuleAnalysis` per rule; exposed via `/api/jobs/[jobId]/business-rules`.
- Consumers: `/app/analysis/[jobId]`, `/app/job-detail/[jobId]`.

## Frontend contract and availability audit

What UI expects for Hip/Ridge (Rule 1) per `lib/ridge-cap-data-mapper.ts` and `app/job-detail/[jobId]/page.tsx`:
- Roof measurements: `ridgeLength`, `hipLength`, `eaveLength`, `rakeLength`, `valleyLength`, `squares`, `slope`.
- Estimate line item for ridge cap: `{ code?, description, quantity (LF), unitPrice, totalPrice }` and ideally `sourcePages` for evidence.
- Analysis result: `RuleAnalysisResult` for ridge cap with status, reasoning, and shortage/excess LF calculations.

Currently available
- Phase 1: The 8 priority fields populate early (present in Job record).
- Phase 2 (storage): `DocumentPage.rawText` is populated for each page (present).
- Phase 2 extractors (code present): `claude-line-item-extractor.ts`, `claude-measurement-extractor.ts` exist and return strict JSON.
- API: `/api/jobs/[jobId]` returns job with pages/extractions; `/api/jobs/[jobId]/business-rules` returns latest per rule.

Gaps to close (to fully satisfy UI contract)
- Ensure `extractedData.roofMeasurements{}` is populated with all required numeric fields and persisted on Phase 2 completion.
- Ensure ridge cap line item detection is robust and includes `quantity` in LF, `unitPrice`, `totalPrice`, plus `sourcePages`.
- Persist provenance and `sourcePages[]` for both measurements and line items so the UI can deep-link to evidence.
- Guarantee the Extraction → Analysis boundary: analysis must only consume structured JSON; no OCR text leakage.
- Telemetry/cost metadata for observability (optional for UI, critical for ops).

Action items (tracked in Taskmaster)
- 21.1 Claude Files API integration utility
- 21.2 Mistral Files + signed URL helper
- 21.3 Wire extractors into Phase 2 orchestrator and persist `extractedData` (line items + roofMeasurements) with provenance
- 21.4 Telemetry & cost tracking per phase

## Decisions & changes (archived)
- Always separate Extraction and Analysis. Analysis uses Claude Haiku 3.5 on structured JSON only.
- Size-based submission strategy: Claude base64 <10MB else Files API; Mistral data URL <5MB else URL/signed URL.
- Use optional `pages` for rapid partial OCR when needed; run full-document OCR in background.
- Persist provenance: `{ method, model, version, pages, timings }` and `sourcePages[]` per extracted datum.
- Frontend relies on `mapDatabaseToRidgeCapData()`; maintain consistent shapes in `extractedData` and `RuleAnalysisResult`.

### Conclusion
- Mistral OCR is reliable across URL and base64 Data URL inputs for these docs.
- Returning structured JSON through annotations plus a robust page-parser gives supplement writers instant, trustworthy access to the numbers they care about and one-click PDF verification.


