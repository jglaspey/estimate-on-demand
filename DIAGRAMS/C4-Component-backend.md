### C4 Model – Level 3: Backend Components

```mermaid
flowchart TB
  subgraph API[Next.js API Layer]
    Upload[/app/api/upload/route.ts]
    JobStatus[/app/api/jobs/[jobId]/status/route.ts]
    JobGet[/app/api/jobs/[jobId]/route.ts]
    JobDocs[/app/api/jobs/[jobId]/documents/route.ts]
    Reprocess[/app/api/jobs/[jobId]/reprocess/route.ts]
    Socket[/app/api/socketio/route.ts]
  end

  subgraph Services[Domain Services]
    Queue[DocumentProcessingQueue]
    Smart[SmartExtractionService]
    Worker[AnalysisWorker]
    WS[WebSocketManager\nwsManager]
  end

  subgraph Infra[Infrastructure]
    Prisma[Prisma Client]
    DB[(PostgreSQL)]
    Uploads[/uploads/]
    Claude[(Claude API)]
    Mistral[(Mistral OCR API)]
  end

  Upload -- create Job/Docs --> Prisma --> DB
  Upload -- write PDFs --> Uploads
  Upload -- addToQueue(jobId, filePaths) --> Queue

  Queue -- phase1: executeUploadExtraction --> Claude
  Queue -- update job fields --> Prisma --> DB
  Queue -- emit progress --> WS
  Queue -- phase2: background --> Smart

  Smart -- OCR all pages --> Mistral
  Smart -- save DocumentPages --> Prisma --> DB
  Smart -- Claude extractors --> Claude
  Smart -- save MistralExtraction --> Prisma --> DB
  Smart -- emit 80% --> WS
  Smart -- trigger analyses --> Worker

  Worker -- read latest extraction --> Prisma --> DB
  Worker -- save RuleAnalysis --> Prisma --> DB
  Worker -- emit 100% --> WS

  JobStatus -- read queued/processing state --> Prisma --> DB
  JobGet -- read job+extractions+rules --> Prisma --> DB
  JobDocs -- read pages (with assets) --> Prisma --> DB
  Reprocess -- delete pages, reset status --> Prisma --> DB
  Socket -- initialize --> WS
```


