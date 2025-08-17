# Document Processing Sequence Diagram

## High-Level Architecture Flow

```mermaid
sequenceDiagram
    participant User
    participant API as API Route
    participant Orch as ExtractionV2Orchestrator
    participant WS as WebSocket Manager
    participant Smart as SmartExtractionService
    participant DB as Database (Prisma)
    participant OCR as Mistral OCR API
    participant Claude as Claude SDK
    participant Worker as AnalysisWorker

    %% Phase 1: Upload & Initiation
    User->>API: POST /api/jobs/[jobId]/extract-v2
    API->>DB: Find job & documents
    API->>Orch: extractionV2.run(jobId, filePaths)
    API-->>User: { ok: true, jobId, files }
    
    %% Phase 2: OCR Processing
    Orch->>WS: emit('v2_start', 5%, 'Starting Extraction v2')
    Orch->>WS: emit('ocr_start', 10%, 'Running OCR on all pages')
    Orch->>Smart: extractFullDocumentData(filePaths, jobId)
    
    Smart->>Smart: Phase 1: extractCoreInfoFast()
    Smart->>OCR: Extract first 3 pages
    OCR-->>Smart: Core text data
    Smart->>DB: Update job with core info
    Smart->>WS: emit('TEXT_EXTRACTED', 20%, core info)
    
    Smart->>Smart: Phase 2: extractFullDocumentData()
    loop For each document page
        Smart->>OCR: Process page with Mistral OCR
        OCR-->>Smart: Page markdown + structured data
        Smart->>DB: Save DocumentPage record
    end
    Smart->>WS: emit('ocr_complete', 40%, 'OCR complete')
    
    %% Phase 3: Normalization
    Orch->>WS: emit('normalize_start', 45%, 'Normalizing totals')
    Orch->>DB: Load all document pages
    Orch->>Orch: normalizeEstimateTotalsFromPages()
    Orch->>DB: Update job.originalEstimate (RCV)
    Orch->>WS: emit('normalize_complete', 55%, 'Normalization complete')
    
    %% Phase 4: Line Item Extraction
    Orch->>WS: emit('line_items_start', 60%, 'Extracting line items')
    
    par Parallel Extraction
        Orch->>Orch: extractStarterItems()
        and
        Orch->>Orch: extractDripEdgeItems()
        and
        Orch->>Orch: extractGutterApronItems()
        and
        Orch->>Orch: extractIceWaterItems()
    end
    
    Orch->>WS: emit('line_items_complete', 75%, 'Line items extracted')
    
    %% Phase 5: Measurements & Material
    Orch->>WS: emit('measurements_start', 78%, 'Parsing roof measurements')
    Orch->>Orch: parseRoofMeasurementsFromText()
    Orch->>Orch: extractRoofMaterialFromPages()
    Orch->>Orch: Calculate dripEdgeTotal (eaves + rakes)
    Orch->>WS: emit('measurements_complete', 85%, 'Measurements parsed')
    
    %% Phase 6: Verification
    Orch->>WS: emit('verify_start', 88%, 'Verifying fields')
    Orch->>Orch: verifyExtractionAgainstDocuments()
    
    %% Phase 7: Data Persistence
    Orch->>DB: Find latest MistralExtraction
    Orch->>DB: Update with v2 data structure
    Orch->>DB: Mirror measurements to Job table
    Orch->>WS: emit('verify_complete', 92%, 'Verification complete')
    
    %% Phase 8: Ready for Analysis
    Orch->>WS: emit('v2_complete', 95%, 'Pipeline complete')
    Orch->>DB: Update job.status = 'ANALYSIS_READY'
    
    %% Phase 9: Business Rule Analysis (Triggered Separately)
    User->>Worker: Trigger analysis
    Worker->>DB: Load job with extractions
    Worker->>Worker: runRidgeCapAnalysis()
    Worker->>Claude: Analyze ridge cap compliance
    Claude-->>Worker: Analysis result
    Worker->>DB: Save RuleAnalysis record
    Worker->>WS: emit analysis progress
```

## Detailed Component Interactions

### 1. API Route Handler Flow
```mermaid
sequenceDiagram
    participant Client
    participant Route as /api/jobs/[jobId]/extract-v2
    participant DB
    participant Orchestrator
    
    Client->>Route: POST request
    Route->>Route: Check EXTRACTION_V2 env var
    Route->>DB: prisma.job.findUnique()
    DB-->>Route: Job + documents
    Route->>Route: Extract file paths
    Route->>Orchestrator: Fire-and-forget run()
    Route-->>Client: Immediate response
```

### 2. Smart Extraction Service - Phase 1 (Fast Core Info)
```mermaid
sequenceDiagram
    participant Service as SmartExtractionService
    participant OCR as Mistral OCR
    participant Regex as Text Parser
    participant DB
    
    Service->>Service: identifyDocumentType(files)
    Service->>Service: Find estimate document
    Service->>OCR: extractFirstPagesOCR(file, 3)
    OCR-->>Service: First 3 pages text
    Service->>Regex: extractCoreInfoFromText()
    Regex-->>Service: Customer, address, claim info
    Service->>DB: updateJobWithCoreInfo()
```

### 3. Line Item Extraction Flow
```mermaid
sequenceDiagram
    participant Extractor
    participant Pages as Document Pages
    participant Patterns as Regex Patterns
    
    Extractor->>Pages: Get all page text
    
    par Parallel Processing
        Extractor->>Patterns: Search starter strip patterns
        and
        Extractor->>Patterns: Search drip edge patterns
        and
        Extractor->>Patterns: Search gutter apron patterns
        and
        Extractor->>Patterns: Search ice & water patterns
    end
    
    Patterns-->>Extractor: Matched line items
    Extractor->>Extractor: Consolidate & dedupe
```

### 4. Business Rule Analysis Flow
```mermaid
sequenceDiagram
    participant Worker as AnalysisWorker
    participant Analyzer as RidgeCapAnalyzer
    participant Claude
    participant DB
    
    Worker->>DB: Load job + extractions
    Worker->>Analyzer: runRidgeCapAnalysis(data)
    
    Analyzer->>Analyzer: Prepare analysis input
    Analyzer->>Claude: Send structured prompt
    Claude-->>Analyzer: Compliance analysis
    
    Analyzer->>Analyzer: Parse response
    Analyzer->>Analyzer: Calculate cost impact
    
    Analyzer-->>Worker: Analysis result
    Worker->>DB: Save RuleAnalysis
    Worker->>Worker: Emit progress updates
```

## Data Flow & Storage

### Database Schema Relationships
```mermaid
erDiagram
    JOB ||--o{ DOCUMENT : has
    JOB ||--o{ MISTRAL_EXTRACTION : has
    JOB ||--o{ RULE_ANALYSIS : has
    DOCUMENT ||--o{ DOCUMENT_PAGE : contains
    
    JOB {
        string id
        string status
        decimal originalEstimate
        decimal roofSquares
        decimal eaveLength
        decimal rakeLength
        decimal ridgeHipLength
        string roofMaterial
    }
    
    DOCUMENT {
        string id
        string jobId
        string filePath
        string type
    }
    
    DOCUMENT_PAGE {
        string id
        string documentId
        int pageNumber
        text rawText
        json metadata
    }
    
    MISTRAL_EXTRACTION {
        string id
        string jobId
        json extractedData
        datetime extractedAt
    }
    
    RULE_ANALYSIS {
        string id
        string jobId
        string ruleType
        json result
        string status
    }
```

## V2 Data Structure

### MistralExtraction.extractedData Structure
```javascript
{
  // Original extraction data
  customerName: "...",
  propertyAddress: "...",
  // ... other fields
  
  // V2 enhanced data
  v2: {
    totals: {
      rcv: 25000.00,
      acv: 22000.00,
      netClaim: 21500.00,
      priceList: "RFG_JUL24",
      estimateCompletedAt: "2024-07-15"
    },
    lineItems: [
      {
        code: "RF HIP RDG",
        description: "Hip/Ridge Cap - Standard",
        quantity: "72.78 LF",
        unit: "LF",
        unitPrice: 2.50,
        total: 181.95,
        category: "ridge_hip",
        pageNumber: 5,
        confidence: 0.95
      }
      // ... more items
    ],
    measurements: {
      squares: 32.5,
      stories: 2,
      pitch: "8/12",
      eaveLength: 145.2,
      rakeLength: 98.6,
      ridgeLength: 72.78,
      hipLength: 0,
      totalRidgeHip: 72.78,
      dripEdgeTotal: 243.8,  // Derived: eaves + rakes
      valleyLength: 45.3,
      material: "Composition Shingle"
    },
    verification: {
      documentMatches: true,
      confidence: 0.92,
      discrepancies: []
    }
  }
}
```

## Error Handling & Recovery

```mermaid
sequenceDiagram
    participant Process
    participant ErrorHandler
    participant DB
    participant WS
    
    Process->>Process: Try operation
    
    alt Success
        Process->>DB: Update status
        Process->>WS: Emit progress
    else OCR Failure
        Process->>ErrorHandler: Handle OCR error
        ErrorHandler->>DB: Mark extraction failed
        ErrorHandler->>WS: Emit error event
    else Claude API Error
        Process->>ErrorHandler: Handle API error
        ErrorHandler->>ErrorHandler: Retry with backoff
        ErrorHandler->>DB: Update retry count
    else Database Error
        Process->>ErrorHandler: Handle DB error
        ErrorHandler->>ErrorHandler: Log critical error
        ErrorHandler->>WS: Emit system error
    end
```

## Performance Optimizations

### Parallel Processing Points
1. **Document Type Identification**: All files processed in parallel
2. **Line Item Extraction**: All categories extracted simultaneously
3. **Page OCR**: Batch processing with concurrent API calls (limited by rate limits)

### Caching Strategy
- OCR results cached in DocumentPage table
- Extraction results persisted in MistralExtraction
- Business rule analyses stored in RuleAnalysis table
- No reprocessing unless explicitly requested

### Progressive Loading
1. **Immediate** (< 5s): Job creation, initial status
2. **Fast** (30-60s): Core info from first 3 pages
3. **Standard** (2-3min): Full OCR and extraction
4. **Complete** (3-5min): All business rules analyzed

## WebSocket Events

### Event Flow Timeline
```
[0s]    job:created
[5s]    v2_start (5%)
[10s]   ocr_start (10%)
[20s]   TEXT_EXTRACTED (20%) - Core info available
[60s]   ocr_complete (40%)
[65s]   normalize_start (45%)
[70s]   normalize_complete (55%)
[75s]   line_items_start (60%)
[90s]   line_items_complete (75%)
[95s]   measurements_start (78%)
[100s]  measurements_complete (85%)
[105s]  verify_start (88%)
[110s]  verify_complete (92%)
[115s]  v2_complete (95%)
[120s]  job:analysis_ready (100%)
```

## Key Integration Points

### 1. Mistral OCR API
- **Endpoint**: `/v1/ocr`
- **Model**: `mistral-ocr-2505`
- **Cost**: ~$0.02 per document
- **Timeout**: 30s per page

### 2. Claude SDK
- **Model**: `claude-3-haiku` (fast analysis)
- **Fallback**: `claude-3-sonnet` (complex cases)
- **Rate Limits**: 50 req/min
- **Context Window**: 200k tokens

### 3. Database Transactions
- Atomic updates for extraction results
- Optimistic locking for concurrent access
- Batch inserts for page data

### 4. WebSocket Manager
- Room-based broadcasting (per job)
- Automatic reconnection handling
- Message queuing for offline clients