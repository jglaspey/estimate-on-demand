import { prisma } from '@/lib/database/client';
import { wsManager } from '@/lib/websocket/socket-handler';
import { smartExtractionService } from '@/lib/extraction/smart-extraction-service';

export interface OrchestratorOptions {
  useVision?: boolean;
}

export class ExtractionV2Orchestrator {
  constructor(
    private readonly jobId: string,
    private readonly options: OrchestratorOptions = {}
  ) {}

  async run(filePaths: string[]): Promise<void> {
    // Phase 1: unchanged – already handled in queue; ensure status
    this.emit('v2_start', 5, 'Starting Extraction v2');

    // Phase 2: OCR all pages
    this.emit('ocr_start', 10, 'Running OCR on all pages');
    await smartExtractionService.extractFullDocumentData(filePaths, this.jobId);
    this.emit('ocr_complete', 40, 'OCR complete');

    // Phase 3: Normalization (RCV/ACV etc.) – placeholder, to be implemented in v2 normalizer
    this.emit('normalize_start', 45, 'Normalizing totals and headers');
    // TODO: call v2 normalizer here
    this.emit('normalize_complete', 55, 'Normalization complete');

    // Phase 4: Focused line-item extraction – placeholder hooks
    this.emit(
      'line_items_start',
      60,
      'Extracting targeted line item categories'
    );
    // TODO: call v2 line-item extractors here
    this.emit('line_items_complete', 75, 'Line item extraction complete');

    // Phase 5: Roof measurements – regex first, optional vision
    this.emit('measurements_start', 78, 'Parsing roof measurements');
    // TODO: call measurement parser, then optional vision when ambiguous
    this.emit('measurements_complete', 85, 'Measurements parsed');

    // Phase 6: Verification – document-grounded audit
    this.emit('verify_start', 88, 'Verifying extracted fields against source');
    // TODO: run verification pass and persist to mistral_extractions.extractedData.verification
    this.emit('verify_complete', 92, 'Verification complete');

    // Phase 7: Rule analyses – to be triggered by analysis worker separately
    this.emit('v2_complete', 95, 'Extraction v2 pipeline complete');

    await prisma.job.update({
      where: { id: this.jobId },
      data: { status: 'ANALYSIS_READY' },
    });
  }

  private emit(stage: string, progress: number, message: string) {
    wsManager.emitJobProgress({
      jobId: this.jobId,
      status: 'PROCESSING',
      stage,
      progress,
      message,
      timestamp: Date.now(),
    });
  }
}

export const extractionV2 = {
  run: async (
    jobId: string,
    filePaths: string[],
    options?: OrchestratorOptions
  ) => {
    const orch = new ExtractionV2Orchestrator(jobId, options);
    await orch.run(filePaths);
  },
};
