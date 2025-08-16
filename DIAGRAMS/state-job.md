### State Machine – Job Lifecycle

```mermaid
stateDiagram-v2
  [*] --> UPLOADED
  UPLOADED --> QUEUED: addToQueue
  QUEUED --> PROCESSING: worker start
  PROCESSING --> TEXT_EXTRACTED: Phase 1 complete
  TEXT_EXTRACTED --> ANALYSIS_READY: Phase 2 extraction complete
  ANALYSIS_READY --> ANALYZING: AnalysisWorker start
  ANALYZING --> REVIEWING: RuleAnalysis saved
  REVIEWING --> GENERATING: Report generation (planned)
  GENERATING --> COMPLETED: Report done
  PROCESSING --> FAILED: error / retries exceeded
  ANALYZING --> FAILED: analysis error
  [*] <-- COMPLETED
  [*] <-- FAILED
  CANCELLED: manual cancel
```

Transitions map to code:
- `addToQueue` in `DocumentProcessingQueue.addToQueue`
- Phase 1 completion in `processing-queue.updateJobWithPhase1Fields`
- Phase 2 completion and `ANALYSIS_READY` in `SmartExtractionService.extractFullDocumentData`
- `REVIEWING` after `AnalysisWorker.runAllBusinessRules`


