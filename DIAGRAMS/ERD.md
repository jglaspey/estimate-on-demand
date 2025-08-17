### ERD – Based on prisma/schema.prisma

```mermaid
erDiagram
  JOB ||--o{ DOCUMENT : has
  DOCUMENT ||--o{ DOCUMENT_PAGE : has
  JOB ||--o{ MISTRAL_EXTRACTION : has
  JOB ||--o{ SONNET_ANALYSIS : has
  JOB ||--o{ RULE_ANALYSIS : has

  JOB {
    string id PK
    JobStatus status
    string fileName
    int fileSize
    datetime uploadedAt
    datetime processedAt
    datetime completedAt
    datetime updatedAt
    string error
    string filePath
    string fileHash
    string customerName
    string customerAddress
    string customerPhone
    string customerEmail
    string claimNumber
    string policyNumber
    datetime dateOfLoss
    string carrier
    string claimRep
    string estimator
    float originalEstimate
    float roofSquares
    int roofStories
    float rakeLength
    float eaveLength
    float ridgeHipLength
    float valleyLength
    string roofSlope
    string roofMaterial
    string userId
    string extractionConfidence
    int extractionRate
    int phase1ProcessingTime
  }

  DOCUMENT {
    string id PK
    string jobId FK
    string fileName
    int pageCount
    DocumentStatus status
    datetime processedAt
    string error
    string filePath
    int fileSize
    string mimeType
  }

  DOCUMENT_PAGE {
    string id PK
    string documentId FK
    string jobId FK
    int pageNumber
    json extractedContent
    string rawText
    int wordCount
    datetime extractedAt
    string extractionMethod
    float confidence
    int width
    int height
    int imageCount
  }

  MISTRAL_EXTRACTION {
    string id PK
    string jobId FK
    string mistralModel
    string documentType
    int processingTime
    json tokenUsage
    float cost
    boolean success
    string error
    json extractedData
    string customerName
    string claimNumber
    int pageCount
    float confidence
    datetime extractedAt
  }

  SONNET_ANALYSIS {
    string id PK
    string jobId FK
    string mistralExtractionId FK
    string sonnetModel
    AnalysisType analysisType
    int processingTime
    json tokenUsage
    float cost
    boolean success
    string error
    json overallAssessment
    json businessRuleEvaluations
    json complianceFindings
    json supplementRecommendations
    float accuracyScore
    float completenessScore
    float confidenceScore
    datetime analyzedAt
  }

  RULE_ANALYSIS {
    string id PK
    string jobId FK
    RuleType ruleType
    RuleStatus status
    boolean passed
    float confidence
    json findings
    string recommendation
    string reasoning
    UserDecision userDecision
    string userNotes
    json editedValues
    datetime analyzedAt
    datetime decidedAt
  }
```

Notes:
- Field nullability simplified for readability. Refer to `prisma/schema.prisma` for exact constraints and indexes (e.g., `@@unique([documentId, pageNumber])`).


