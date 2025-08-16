### C4 Model – Level 2: Container (Current In-Repo Implementation)

```mermaid
flowchart TB
  subgraph Browser[Browser]
    UI[Next.js App Router UI\ncomponents, pages]
    SocketClient[socket.io-client]
  end

  subgraph NextService[Next.js Service]
    direction TB
    APIRoutes[/app/api/* routes\nNextRequest/NextResponse/]
    UploadRoute[/api/upload\nroute.ts]
    JobRoutes[/api/jobs/[jobId]/**\nstatus, analyze, documents, reprocess]
    SocketRoute[/api/socketio\nWS bootstrap]
    WebSocketMgr[lib/websocket/socket-handler.ts\nwsManager]
    ProcessingQueue[lib/extraction/processing-queue.ts\nDocumentProcessingQueue]
    SmartExtraction[lib/extraction/smart-extraction-service.ts]
    AnalysisWorker[lib/analysis/analysis-worker.ts]
    Prisma[lib/database/client.ts\nPrismaClient]
    Postgres[(PostgreSQL)]
    Uploads[/uploads volume]
    Claude[(Claude API)]
    Mistral[(Mistral OCR API)]
  end

  UI -- upload formdata --> UploadRoute
  UploadRoute -- create Job & Document(s) --> Prisma --> Postgres
  UploadRoute -- save files --> Uploads
  UploadRoute -- addToQueue(jobId, filePaths) --> ProcessingQueue

  ProcessingQueue -- phase1 executeUploadExtraction --> Claude
  ProcessingQueue -- update Job (Phase1) --> Prisma --> Postgres
  ProcessingQueue -- emitJobProgress --> WebSocketMgr
  ProcessingQueue -- Phase2 (background) --> SmartExtraction

  SmartExtraction -- OCR --> Mistral
  SmartExtraction -- write DocumentPage(s) --> Prisma --> Postgres
  SmartExtraction -- Claude extractors --> Claude
  SmartExtraction -- save MistralExtraction --> Prisma --> Postgres
  SmartExtraction -- emitJobProgress 80% --> WebSocketMgr
  SmartExtraction -- runAllBusinessRules --> AnalysisWorker

  AnalysisWorker -- read Job+Extraction --> Prisma --> Postgres
  AnalysisWorker -- save RuleAnalysis --> Prisma --> Postgres
  AnalysisWorker -- emitJobProgress 100% --> WebSocketMgr

  SocketClient -- subscribe-job --> SocketRoute --> WebSocketMgr
  WebSocketMgr -- job-progress --> SocketClient
  UI -- fetch JSON --> JobRoutes
  JobRoutes -- read --> Prisma --> Postgres
```


