### C4 Model – Level 1: System Context

```mermaid
flowchart TB
  subgraph ExternalUsers[External Actors]
    Shopper[User (Adjuster/Estimator)]
  end

  subgraph EOD[EOD Insurance Supplement Analysis System]
    WebApp[Web App UI\nNext.js 15 + React 19]
    API[API Routes\nNext.js App Router]
    WS[WebSockets\nsocket.io]
    DB[(PostgreSQL)]
    Storage[/Uploads Volume or S3/]
    AIClaude[(Claude API)]
    AIMistral[(Mistral OCR API)]
  end

  Shopper -- HTTPS --> WebApp
  WebApp -- HTTPS/JSON --> API
  WebApp -- WS(SIO) --> WS
  API -- Prisma --> DB
  API -- Read/Write --> Storage
  API -- HTTPS --> AIClaude
  API -- HTTPS --> AIMistral

  note right of API: App Router endpoints under /app/api
  note right of DB: Models: Job, Document, DocumentPage,\nMistralExtraction, RuleAnalysis
```


