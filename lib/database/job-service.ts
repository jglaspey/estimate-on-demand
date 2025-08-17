/**
 * Job Service - Database operations for job management
 * 
 * Handles CRUD operations for jobs, extractions, and rule analyses
 * Provides high-level business logic for job lifecycle management
 */

import { prisma, type Job, type JobStatus, type MistralExtraction, type RuleAnalysis, type RuleType } from './client';
import type { ExtractionResult, ExtractionMetrics } from '../extraction/haiku-extraction-engine';

export interface CreateJobData {
  fileName: string;
  fileSize: number;
  filePath?: string;
  fileHash?: string;
  userId?: string;
}

export interface JobWithDetails extends Job {
  documents: any[];
  extractions: MistralExtraction[];
  ruleAnalyses: RuleAnalysis[];
}

export class JobService {
  /**
   * Create a new job record
   */
  static async createJob(data: CreateJobData): Promise<Job> {
    return await prisma.job.create({
      data: {
        fileName: data.fileName,
        fileSize: data.fileSize,
        filePath: data.filePath,
        fileHash: data.fileHash,
        userId: data.userId,
        status: 'UPLOADED',
      },
    });
  }

  /**
   * Get job by ID with all related data
   */
  static async getJobWithDetails(jobId: string): Promise<JobWithDetails | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: true,
        mistralExtractions: true,
        ruleAnalyses: true,
      },
    });
    
    if (!job) return null;
    
    // Map mistralExtractions to extractions for backwards compatibility
    return {
      ...job,
      extractions: job.mistralExtractions
    };
  }

  /**
   * Update job status
   */
  static async updateJobStatus(jobId: string, status: JobStatus, error?: string): Promise<Job> {
    const updateData: any = { status };
    
    if (status === 'PROCESSING' && !error) {
      updateData.processedAt = new Date();
    } else if (status === 'COMPLETED' && !error) {
      updateData.completedAt = new Date();
    } else if (error) {
      updateData.error = error;
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Save extraction results to database
   */
  static async saveExtraction(
    jobId: string,
    extractionResult: ExtractionResult,
    metrics: ExtractionMetrics,
    engineUsed: string = 'haiku-3.5'
  ): Promise<MistralExtraction> {
    // Calculate validation metrics
    const fields = [
      extractionResult.hipRidgeCap,
      extractionResult.starterStrip,
      extractionResult.dripEdge,
      extractionResult.gutterApron,
      extractionResult.iceWaterBarrier,
    ];
    
    const fieldsFound = fields.filter(field => field.found).length;
    const completionScore = (fieldsFound / fields.length) * 100;
    const hasGutterApron = extractionResult.gutterApron.found;
    const hasLocationData = !!(
      extractionResult.dripEdge.location || 
      extractionResult.gutterApron.location
    );

    return await prisma.mistralExtraction.create({
      data: {
        jobId,
        mistralModel: engineUsed,
        processingTime: metrics.processingTime,
        tokenUsage: metrics.tokenUsage,
        cost: metrics.cost,
        success: metrics.success,
        error: metrics.error,
        extractedData: {
          hipRidgeCap: extractionResult.hipRidgeCap,
          starterStrip: extractionResult.starterStrip,
          dripEdge: extractionResult.dripEdge,
          gutterApron: extractionResult.gutterApron,
          iceWaterBarrier: extractionResult.iceWaterBarrier,
          metrics: {
            completionScore,
            fieldsFound,
            hasGutterApron,
            hasLocationData,
          }
        }
      },
    });
  }

  /**
   * Create rule analysis records for all business rules
   */
  static async createRuleAnalyses(jobId: string): Promise<RuleAnalysis[]> {
    const ruleTypes: RuleType[] = [
      'HIP_RIDGE_CAP',
      'STARTER_STRIP', 
      'DRIP_EDGE',
      'GUTTER_APRON',
      'ICE_WATER_BARRIER'
    ];

    const analyses: RuleAnalysis[] = [];
    
    for (const ruleType of ruleTypes) {
      const analysis = await prisma.ruleAnalysis.create({
        data: {
          jobId,
          ruleType,
          status: 'PENDING',
          findings: {},
        },
      });
      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Get the latest extraction for a job
   */
  static async getLatestExtraction(jobId: string): Promise<MistralExtraction | null> {
    return await prisma.mistralExtraction.findFirst({
      where: { jobId },
      orderBy: { extractedAt: 'desc' },
    });
  }

  /**
   * Get all jobs for a user (optional userId filter)
   */
  static async getJobs(userId?: string, limit: number = 50): Promise<Job[]> {
    return await prisma.job.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            mistralExtractions: true,
            ruleAnalyses: true,
          },
        },
      },
    });
  }

  /**
   * Delete a job and all related data (CASCADE will handle relations)
   */
  static async deleteJob(jobId: string): Promise<void> {
    await prisma.job.delete({
      where: { id: jobId },
    });
  }

  /**
   * Get job processing statistics
   */
  static async getJobStats(userId?: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    avgProcessingTime: number | null;
    totalCost: number;
  }> {
    const where = userId ? { userId } : undefined;
    
    const [
      total,
      completed,
      failed,
      inProgress,
      metrics
    ] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.job.count({ where: { ...where, status: 'FAILED' } }),
      prisma.job.count({ 
        where: { 
          ...where, 
          status: { in: ['PROCESSING', 'ANALYZING', 'REVIEWING', 'GENERATING'] } 
        } 
      }),
      prisma.mistralExtraction.aggregate({
        where: userId ? { job: { userId } } : undefined,
        _avg: { processingTime: true },
        _sum: { cost: true },
      }),
    ]);

    return {
      total,
      completed,
      failed,
      inProgress,
      avgProcessingTime: metrics._avg.processingTime,
      totalCost: metrics._sum.cost || 0,
    };
  }

  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default JobService;