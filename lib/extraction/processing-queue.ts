import { prisma } from '@/lib/database/client';
import {
  wsManager,
  type JobProgressEvent,
} from '@/lib/websocket/socket-handler';

// import { mistralService } from './mistral-service'; // Not currently used in dual-phase workflow
import { smartExtractionService } from './smart-extraction-service';
import { executeUploadExtraction } from './upload-integration';

export interface ProcessingJob {
  jobId: string;
  filePaths: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
}

/**
 * Document Processing Queue
 * Handles asynchronous document processing with retry logic
 */
export class DocumentProcessingQueue {
  private processingQueue: Map<string, ProcessingJob> = new Map();
  private isProcessing = false;

  /**
   * Add a document to the processing queue
   */
  async addToQueue(jobId: string, filePaths: string | string[]): Promise<void> {
    // Handle both single file and multiple files
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    console.log(
      `Adding job ${jobId} to processing queue with ${paths.length} file(s)`
    );

    const processingJob: ProcessingJob = {
      jobId,
      filePaths: paths,
      status: 'pending',
      attempts: 0,
    };

    this.processingQueue.set(jobId, processingJob);

    // Update job status in database
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        updatedAt: new Date(),
      },
    });

    // Emit WebSocket event
    this.emitJobProgress(
      jobId,
      'QUEUED',
      'queued',
      20,
      'Document queued for processing'
    );

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('Starting document processing queue...');

    try {
      while (this.processingQueue.size > 0) {
        const pendingJobs = Array.from(this.processingQueue.values()).filter(
          job => job.status === 'pending'
        );

        if (pendingJobs.length === 0) break;

        const job = pendingJobs[0];
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      console.log('Document processing queue stopped');
    }
  }

  /**
   * Process a single job using NEW dual-phase approach
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    console.log(
      `🚀 Starting dual-phase processing for job ${job.jobId}, attempt ${job.attempts + 1}`
    );

    try {
      // Mark as processing
      job.status = 'processing';
      job.attempts++;

      await prisma.job.update({
        where: { id: job.jobId },
        data: {
          status: 'PROCESSING',
          updatedAt: new Date(),
        },
      });

      this.emitJobProgress(
        job.jobId,
        'PROCESSING',
        'phase1_starting',
        20,
        'Starting fast core info extraction...'
      );

      // ⚡ PHASE 1: Lightning-fast core info extraction using Claude direct PDF (5-10 seconds)
      console.log(`⚡ PHASE 1: Fast core extraction for job ${job.jobId}`);
      
      // Use first file for primary extraction (usually estimate)
      const primaryFilePath = job.filePaths[0];
      const fileName = primaryFilePath.split('/').pop() || 'document';
      
      const phase1Result = await executeUploadExtraction({
        jobId: job.jobId,
        filePath: primaryFilePath,
        fileName,
        websocket: undefined, // We'll use our own progress events
        fallbackToOCR: false,
        skipExtraction: false
      });

      console.log(`✅ PHASE 1 complete for job ${job.jobId}:`, phase1Result);
      
      // Update database with Phase 1 fields
      await this.updateJobWithPhase1Fields(job.jobId, phase1Result);
      
      // Emit progress with extracted fields
      this.emitJobProgress(
        job.jobId,
        'PHASE1_COMPLETE',
        'phase1_complete',
        45,
        `Phase 1 extraction complete: ${phase1Result.metadata.fieldsFound}/8 fields found (${phase1Result.metadata.confidence} confidence)`,
        {
          fieldsFound: phase1Result.metadata.fieldsFound,
          extractionRate: phase1Result.metadata.extractionRate,
          confidence: phase1Result.metadata.confidence,
          fields: phase1Result.fields
        }
      );

      // 🔄 PHASE 2: Full document extraction (parallel, in background)
      // This runs in parallel and doesn't block the user
      console.log(
        `🔄 PHASE 2: Starting background full extraction for job ${job.jobId}`
      );

      // Don't await this - let it run in background
      smartExtractionService
        .extractFullDocumentData(job.filePaths, job.jobId)
        .then(() => {
          console.log(`✅ PHASE 2 complete for job ${job.jobId}`);
          // Phase 2 emits its own progress events and updates job status
        })
        .catch(error => {
          console.error(`❌ PHASE 2 failed for job ${job.jobId}:`, error);
        });

      // Mark phase 1 as completed - user can see data immediately
      job.status = 'completed';
      this.processingQueue.delete(job.jobId);

      console.log(
        `✅ Job ${job.jobId} ready for user review (Phase 2 continuing in background)`
      );
    } catch (error) {
      console.error(`Job ${job.jobId} processing failed:`, error);

      job.lastError = error instanceof Error ? error.message : 'Unknown error';

      // Retry logic - up to 3 attempts
      if (job.attempts < 3) {
        job.status = 'pending';
        console.log(`Retrying job ${job.jobId} (attempt ${job.attempts}/3)`);

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, job.attempts * 2000));
      } else {
        // Max attempts reached
        job.status = 'failed';
        this.processingQueue.delete(job.jobId);

        await prisma.job.update({
          where: { id: job.jobId },
          data: {
            status: 'FAILED',
            error: job.lastError || 'Processing failed after maximum attempts',
            updatedAt: new Date(),
          },
        });

        // Emit error WebSocket event
        wsManager.emitJobError(
          job.jobId,
          job.lastError || 'Processing failed after maximum attempts'
        );

        console.error(`Job ${job.jobId} failed after ${job.attempts} attempts`);
      }
    }
  }

  /**
   * Trigger business rule analysis after extraction
   */
  private async triggerBusinessRuleAnalysis(
    jobId: string,
    extractedData: any
  ): Promise<void> {
    try {
      console.log(`Starting business rule analysis for job ${jobId}`);

      // This will be implemented later - for now just log
      console.log(`Business rule analysis queued for job ${jobId}`);
      console.log('Extracted data summary:', {
        docType: extractedData.classification.type,
        hasCustomer: !!extractedData.customerInfo,
        hasClaim: !!extractedData.claimInfo,
        hasRoofing: !!extractedData.roofingData,
        lineItemCount: extractedData.lineItems.length,
      });
    } catch (error) {
      console.error(`Business rule analysis failed for job ${jobId}:`, error);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; processing: number; total: number } {
    const jobs = Array.from(this.processingQueue.values());
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      total: jobs.length,
    };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.processingQueue.get(jobId) || null;
  }

  /**
   * Update job record with Phase 1 extracted fields
   */
  private async updateJobWithPhase1Fields(jobId: string, phase1Result: any): Promise<void> {
    try {
      const { fields, metadata } = phase1Result;
      
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'TEXT_EXTRACTED',
          customerName: fields.customerName,
          customerAddress: fields.propertyAddress,
          carrier: fields.carrier,
          claimNumber: fields.claimNumber,
          policyNumber: fields.policyNumber,
          claimRep: fields.claimRep,
          estimator: fields.estimator,
          dateOfLoss: fields.dateOfLoss ? new Date(fields.dateOfLoss) : null,
          extractionConfidence: metadata.confidence,
          extractionRate: metadata.extractionRate,
          phase1ProcessingTime: metadata.processingTimeMs,
          updatedAt: new Date(),
        },
      });
      
      console.log(`Updated job ${jobId} with Phase 1 fields (${metadata.fieldsFound}/8 fields)`);
    } catch (error) {
      console.error(`Failed to update job ${jobId} with Phase 1 fields:`, error);
      throw error;
    }
  }

  /**
   * Emit WebSocket progress event
   */
  private emitJobProgress(
    jobId: string,
    status: string,
    stage: string,
    progress: number,
    message: string,
    extractedSummary?: any
  ) {
    const event: JobProgressEvent = {
      jobId,
      status,
      stage,
      progress,
      message,
      timestamp: Date.now(),
      extractedSummary,
    };

    wsManager.emitJobProgress(event);
  }
}

// Singleton instance
export const processingQueue = new DocumentProcessingQueue();
