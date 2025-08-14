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
