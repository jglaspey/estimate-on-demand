import { prisma } from '@/lib/database/client';
import { wsManager } from '@/lib/websocket/socket-handler';
import { smartExtractionService } from '@/lib/extraction/smart-extraction-service';
import { normalizeEstimateTotalsFromPages } from '@/lib/extraction/v2/estimate-normalizer';
// import { computeRequirements } from '@/lib/extraction/v2/requirements';
import { verifyExtractionAgainstDocuments } from '@/lib/extraction/v2/verification';
import {
  extractStarterItems,
  extractDripEdgeItems,
  extractGutterApronItems,
  extractIceWaterItems,
} from '@/lib/extraction/v2/line-item-extractors';
import { parseRoofMeasurementsFromText } from '@/lib/extraction/v2/roof-measurement-parser';

import type { Prisma } from '../../../src/generated/prisma';

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

    // Phase 3: Normalization (RCV/ACV etc.)
    this.emit('normalize_start', 45, 'Normalizing totals and headers');
    const doc = await prisma.job.findUnique({
      where: { id: this.jobId },
      include: {
        documents: { include: { pages: { orderBy: { pageNumber: 'asc' } } } },
        mistralExtractions: { orderBy: { extractedAt: 'desc' }, take: 1 },
      },
    });
    const pages = (doc?.documents?.flatMap(d => d.pages) || []).map(p => ({
      pageNumber: p.pageNumber,
      rawText: p.rawText || '',
    }));
    const totals = await normalizeEstimateTotalsFromPages(pages);

    await prisma.job.update({
      where: { id: this.jobId },
      data: {
        originalEstimate: totals.rcv,
        // Optionally add acv/netClaim/priceList/estimateCompletedAt to Job in schema (already planned)
      },
    });
    this.emit('normalize_complete', 55, 'Normalization complete');

    // Phase 4: Focused line-item extraction
    this.emit(
      'line_items_start',
      60,
      'Extracting targeted line item categories'
    );
    const extractorPages = pages;
    const [starterRes, dripRes, gutterRes, iceRes] = await Promise.all([
      extractStarterItems(extractorPages),
      extractDripEdgeItems(extractorPages),
      extractGutterApronItems(extractorPages),
      extractIceWaterItems(extractorPages),
    ]);
    const lineItems = [
      ...starterRes.items,
      ...dripRes.items,
      ...gutterRes.items,
      ...iceRes.items,
    ];
    this.emit('line_items_complete', 75, 'Line item extraction complete');

    // Phase 5: Roof measurements – regex first, optional vision later
    this.emit('measurements_start', 78, 'Parsing roof measurements');
    const measurements = parseRoofMeasurementsFromText(pages) as Record<
      string,
      unknown
    >;
    // Derive drip edge total (Eaves + Rakes) for convenient display
    const eaveNum =
      typeof measurements.eaveLength === 'number'
        ? (measurements.eaveLength as number)
        : undefined;
    const rakeNum =
      typeof measurements.rakeLength === 'number'
        ? (measurements.rakeLength as number)
        : undefined;
    if (typeof eaveNum === 'number' && typeof rakeNum === 'number') {
      (measurements as any).dripEdgeTotal = eaveNum + rakeNum;
    }
    this.emit('measurements_complete', 85, 'Measurements parsed');

    // Phase 6: Verification – document-grounded audit
    this.emit('verify_start', 88, 'Verifying extracted fields against source');
    // Gather minimal context for verification
    const verification = await verifyExtractionAgainstDocuments({
      extracted: {
        rcv: totals.rcv,
        acv: totals.acv,
        netClaim: totals.netClaim,
        priceList: totals.priceList,
        estimateCompletedAt: totals.estimateCompletedAt,
      },
      pages: (doc?.documents?.flatMap(d => d.pages) || []).map(p => ({
        pageNumber: p.pageNumber,
        rawText: p.rawText || '',
      })),
    });

    // Persist v2 data into the latest extraction record (fresh fetch)
    const latestExtraction = await prisma.mistralExtraction.findFirst({
      where: { jobId: this.jobId },
      orderBy: { extractedAt: 'desc' },
    });
    if (latestExtraction) {
      const base = latestExtraction.extractedData as unknown as Record<
        string,
        unknown
      >;
      const merged = {
        ...base,
        v2: {
          totals,
          lineItems,
          measurements,
          verification,
        },
      } as unknown as Prisma.InputJsonValue;
      await prisma.mistralExtraction.update({
        where: { id: latestExtraction.id },
        data: { extractedData: merged },
      });
    }

    // Mirror key measurements to Job for quick access in UI/queries
    const ridgeHip =
      (typeof (measurements as any).totalRidgeHip === 'number'
        ? (measurements as any).totalRidgeHip
        : 0) ||
      (typeof (measurements as any).ridgeLength === 'number'
        ? (measurements as any).ridgeLength
        : 0) +
        (typeof (measurements as any).hipLength === 'number'
          ? (measurements as any).hipLength
          : 0);
    await prisma.job.update({
      where: { id: this.jobId },
      data: {
        roofSquares:
          typeof (measurements as any).squares === 'number'
            ? (measurements as any).squares
            : undefined,
        eaveLength:
          typeof (measurements as any).eaveLength === 'number'
            ? (measurements as any).eaveLength
            : undefined,
        rakeLength:
          typeof (measurements as any).rakeLength === 'number'
            ? (measurements as any).rakeLength
            : undefined,
        valleyLength:
          typeof (measurements as any).valleyLength === 'number'
            ? (measurements as any).valleyLength
            : undefined,
        ridgeHipLength: ridgeHip || undefined,
        roofSlope:
          typeof (measurements as any).pitch === 'string'
            ? ((measurements as any).pitch as string)
            : undefined,
        roofStories:
          typeof (measurements as any).stories === 'number'
            ? (measurements as any).stories
            : undefined,
      },
    });
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
