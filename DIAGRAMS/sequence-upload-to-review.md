### Sequence Diagram – Upload → Extraction → Analysis → Review

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser (Next.js UI)
  participant U as /api/upload
  participant Q as DocumentProcessingQueue
  participant S as SmartExtractionService
  participant W as AnalysisWorker
  participant DB as PostgreSQL (Prisma)
  participant WS as WebSocket (wsManager)
  participant C as Claude API
  participant M as Mistral OCR

  B->>U: POST /api/upload (files)
  U->>DB: create Job, create Document(s)
  U->>U: write PDFs to /uploads
  U->>Q: addToQueue(jobId, filePaths)
  U-->>B: 200 { jobId, message }

  Q->>DB: update job.status=QUEUED
  Q->>WS: emit job-progress (queued,20%)

  rect rgb(225,245,254)
    Note over Q: Phase 1 (fast fields)
    Q->>C: executeUploadExtraction(file)
    C-->>Q: fields + metadata
    Q->>DB: update Job (fields, status=TEXT_EXTRACTED)
    Q->>WS: emit job-progress (phase1_complete,45%)
  end

  par Phase 2 (background)
    Q->>S: extractFullDocumentData(filePaths, jobId)
    S->>M: OCR all pages (markdown + images)
    M-->>S: page texts + images
    S->>DB: upsert DocumentPage(s)
    S->>C: Claude extractors (line items, measurements)
    C-->>S: structured JSON
    S->>DB: create MistralExtraction (extractedData)
    S->>DB: update Job (ridge/eave/etc.) status=ANALYSIS_READY
    S->>WS: emit job-progress (extraction_complete,80%)
    S->>W: runAllBusinessRules(jobId)
    W->>DB: read latest MistralExtraction
    W->>DB: create RuleAnalysis (HIP_RIDGE_CAP, ...)
    W->>DB: update Job status=REVIEWING
    W->>WS: emit job-progress (analysis_complete,100%)
  and
    B->>WS: subscribe-job(jobId)
    WS-->>B: job-progress events (live)
    B->> /api/jobs/[jobId]/status: GET
    /api/jobs/[jobId]/status-->>B: stage, progress, summary
  end
```


