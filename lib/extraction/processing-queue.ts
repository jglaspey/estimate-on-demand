import { mistralService } from './mistral-service';
import { simpleProcessor } from './simple-processor';
import { prisma } from '@/lib/database/client';
import { wsManager, type JobProgressEvent } from '@/lib/websocket/socket-handler';

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
    console.log(`Adding job ${jobId} to processing queue with ${paths.length} file(s)`);
    
    const processingJob: ProcessingJob = {
      jobId,
      filePaths: paths,
      status: 'pending',
      attempts: 0
    };
    
    this.processingQueue.set(jobId, processingJob);
    
    // Update job status in database
    await prisma.job.update({
      where: { id: jobId },
      data: { 
        status: 'QUEUED',
        updatedAt: new Date()
      }
    });
    
    // Emit WebSocket event
    this.emitJobProgress(jobId, 'QUEUED', 'queued', 20, 'Document queued for processing');
    
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
        const pendingJobs = Array.from(this.processingQueue.values())
          .filter(job => job.status === 'pending');
        
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
   * Process a single job
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    console.log(`Processing job ${job.jobId}, attempt ${job.attempts + 1}`);
    
    try {
      // Mark as processing
      job.status = 'processing';
      job.attempts++;
      
      await prisma.job.update({
        where: { id: job.jobId },
        data: { 
          status: 'PROCESSING',
          updatedAt: new Date()
        }
      });

      // Emit WebSocket event
      this.emitJobProgress(job.jobId, 'PROCESSING', 'processing', 40, 'Extracting text and data from document...');
      
      // Process with Mistral OCR service - handle multiple documents
      const extractedData = await mistralService.processDocuments(
        job.filePaths, 
        job.jobId
      );
      
      // Mark as completed
      job.status = 'completed';
      this.processingQueue.delete(job.jobId);
      
      await prisma.job.update({
        where: { id: job.jobId },
        data: { 
          status: 'ANALYSIS_READY',
          updatedAt: new Date()
        }
      });

      // Emit completion WebSocket event
      const extractedSummary = {
        documentType: extractedData.classification?.type,
        hasCustomer: !!extractedData.customerInfo,
        hasClaim: !!extractedData.claimInfo,
        hasRoofing: !!extractedData.roofingData,
        lineItemCount: extractedData.lineItems?.length || 0
      };
      
      this.emitJobProgress(job.jobId, 'ANALYSIS_READY', 'completed', 100, 'Document processing complete', extractedSummary);
      
      console.log(`Successfully processed job ${job.jobId}`);
      
      // Trigger business rule analysis
      await this.triggerBusinessRuleAnalysis(job.jobId, extractedData);
      
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
            updatedAt: new Date()
          }
        });

        // Emit error WebSocket event
        wsManager.emitJobError(job.jobId, job.lastError || 'Processing failed after maximum attempts');
        
        console.error(`Job ${job.jobId} failed after ${job.attempts} attempts`);
      }
    }
  }
  
  /**
   * Trigger business rule analysis after extraction
   */
  private async triggerBusinessRuleAnalysis(jobId: string, extractedData: any): Promise<void> {
    try {
      console.log(`Starting business rule analysis for job ${jobId}`);
      
      // This will be implemented later - for now just log
      console.log(`Business rule analysis queued for job ${jobId}`);
      console.log('Extracted data summary:', {
        docType: extractedData.classification.type,
        hasCustomer: !!extractedData.customerInfo,
        hasClaim: !!extractedData.claimInfo,
        hasRoofing: !!extractedData.roofingData,
        lineItemCount: extractedData.lineItems.length
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
      total: jobs.length
    };
  }
  
  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.processingQueue.get(jobId) || null;
  }

  /**
   * Emit WebSocket progress event
   */
  private emitJobProgress(jobId: string, status: string, stage: string, progress: number, message: string, extractedSummary?: any) {
    const event: JobProgressEvent = {
      jobId,
      status,
      stage,
      progress,
      message,
      timestamp: Date.now(),
      extractedSummary
    };

    wsManager.emitJobProgress(event);
  }
}

// Singleton instance
export const processingQueue = new DocumentProcessingQueue();