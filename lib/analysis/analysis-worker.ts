/**
 * Analysis Worker
 * 
 * Coordinates business rule processing with real-time progress updates.
 * Runs all business rules (Ridge Cap, Starter Strip, Drip Edge, Ice & Water) 
 * and provides progress updates via WebSocket/callback mechanism.
 */

import { ridgeCapAnalyzer, RidgeCapAnalysisInput, RidgeCapAnalysisResult } from './ridge-cap-analyzer';
import { prisma } from '../database/client';

// Progress update interface
export interface AnalysisProgress {
  jobId: string;
  ruleName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  result?: Record<string, unknown>;
  error?: string;
  timestamp: Date;
}

// Analysis worker configuration
export interface AnalysisWorkerConfig {
  jobId: string;
  onProgress?: (progress: AnalysisProgress) => void;
  enableRealTimeUpdates?: boolean;
}

// Business rule analysis results
export interface BusinessRuleResults {
  ridgeCap: RidgeCapAnalysisResult | null;
  starterStrip: Record<string, unknown> | null; // Future implementation
  dripEdge: Record<string, unknown> | null; // Future implementation
  iceAndWater: Record<string, unknown> | null; // Future implementation
}

export class AnalysisWorker {
  private jobId: string;
  private onProgress?: (progress: AnalysisProgress) => void;
  private enableRealTimeUpdates: boolean;

  constructor(config: AnalysisWorkerConfig) {
    this.jobId = config.jobId;
    this.onProgress = config.onProgress;
    this.enableRealTimeUpdates = config.enableRealTimeUpdates ?? true;
  }

  /**
   * Run all business rule analyses for the job
   */
  async runAllBusinessRules(): Promise<BusinessRuleResults> {
    console.warn(`🔄 Starting business rule analysis for job ${this.jobId}`);
    
    const results: BusinessRuleResults = {
      ridgeCap: null,
      starterStrip: null,
      dripEdge: null,
      iceAndWater: null
    };

    try {
      // Step 1: Load job data with extractions
      this.updateProgress('data_loading', 'running', 10, 'Loading job data and extractions...');
      
      const jobData = await this.loadJobWithExtractions();
      if (!jobData) {
        throw new Error('Job data not found or incomplete');
      }

      this.updateProgress('data_loading', 'completed', 20, 'Job data loaded successfully');

      // Step 2: Run Ridge Cap Analysis
      this.updateProgress('ridge_cap', 'running', 30, 'Analyzing ridge cap compliance...');
      
      try {
        results.ridgeCap = await this.runRidgeCapAnalysis(jobData);
        
        // Save ridge cap analysis to database
        await this.saveRuleAnalysis('HIP_RIDGE_CAP', results.ridgeCap);
        
        this.updateProgress('ridge_cap', 'completed', 50, 
          `Ridge cap analysis: ${results.ridgeCap.status} - ${results.ridgeCap.costImpact > 0 ? `$${results.ridgeCap.costImpact.toFixed(2)} supplement` : 'compliant'}`);
      } catch (error) {
        this.updateProgress('ridge_cap', 'failed', 50, 'Ridge cap analysis failed', error);
        results.ridgeCap = null;
      }

      // Step 3: Run Starter Strip Analysis (placeholder)
      this.updateProgress('starter_strip', 'running', 60, 'Analyzing starter strip coverage...');
      
      try {
        // Future implementation
        results.starterStrip = await this.runStarterStripAnalysis(jobData);
        this.updateProgress('starter_strip', 'completed', 70, 'Starter strip analysis completed');
      } catch (error) {
        this.updateProgress('starter_strip', 'failed', 70, 'Starter strip analysis failed', error);
        results.starterStrip = null;
      }

      // Step 4: Run Drip Edge Analysis (placeholder)
      this.updateProgress('drip_edge', 'running', 80, 'Analyzing drip edge coverage...');
      
      try {
        // Future implementation
        results.dripEdge = await this.runDripEdgeAnalysis(jobData);
        this.updateProgress('drip_edge', 'completed', 90, 'Drip edge analysis completed');
      } catch (error) {
        this.updateProgress('drip_edge', 'failed', 90, 'Drip edge analysis failed', error);
        results.dripEdge = null;
      }

      // Step 5: Run Ice & Water Analysis (placeholder)
      this.updateProgress('ice_water', 'running', 95, 'Analyzing ice & water barrier coverage...');
      
      try {
        // Future implementation
        results.iceAndWater = await this.runIceAndWaterAnalysis(jobData);
        this.updateProgress('ice_water', 'completed', 100, 'All business rule analyses completed');
      } catch (error) {
        this.updateProgress('ice_water', 'failed', 100, 'Ice & water analysis failed', error);
        results.iceAndWater = null;
      }

      console.warn(`✅ Business rule analysis completed for job ${this.jobId}`);
      return results;

    } catch (error) {
      console.error(`❌ Business rule analysis failed for job ${this.jobId}:`, error);
      this.updateProgress('analysis', 'failed', 0, 'Analysis failed', error);
      throw error;
    }
  }

  /**
   * Run Ridge Cap analysis specifically
   */
  async runRidgeCapAnalysis(_jobData: Record<string, unknown>): Promise<RidgeCapAnalysisResult> {
    const extraction = jobData.mistralExtractions[0];
    const extractedData = extraction.extractedData as Record<string, unknown>;

    // Prepare analysis input
    const analysisInput: RidgeCapAnalysisInput = {
      lineItems: extractedData.lineItems || [],
      ridgeCapItems: extractedData.ridgeCapItems || [],
      roofMeasurements: extractedData.roofMeasurements || {
        ridgeLength: null,
        hipLength: null,
        totalRidgeHip: null,
        confidence: 0.5,
        sourcePages: [],
        extractedFrom: 'other' as const
      },
      roofType: extractedData.roofType || {
        roofType: 'laminated' as const,
        confidence: 0.5,
        reasoning: 'Default assumption',
        evidence: []
      },
      jobId: this.jobId
    };

    return await ridgeCapAnalyzer.analyzeRidgeCapCompliance(analysisInput);
  }

  /**
   * Run Starter Strip analysis (placeholder for future implementation)
   */
  async runStarterStripAnalysis(_jobData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      status: 'COMPLIANT',
      reasoning: 'Starter strip analysis not yet implemented',
      costImpact: 0
    };
  }

  /**
   * Run Drip Edge analysis (placeholder for future implementation)
   */
  async runDripEdgeAnalysis(_jobData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      status: 'COMPLIANT',
      reasoning: 'Drip edge analysis not yet implemented',
      costImpact: 0
    };
  }

  /**
   * Run Ice & Water analysis (placeholder for future implementation)
   */
  async runIceAndWaterAnalysis(_jobData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      status: 'COMPLIANT',
      reasoning: 'Ice & water analysis not yet implemented',
      costImpact: 0
    };
  }

  /**
   * Load job data with all extractions
   */
  private async loadJobWithExtractions() {
    const job = await prisma.job.findUnique({
      where: { id: this.jobId },
      include: {
        documents: {
          include: {
            pages: { orderBy: { pageNumber: 'asc' } }
          }
        },
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1
        },
        ruleAnalyses: {
          orderBy: { analyzedAt: 'desc' }
        }
      }
    });

    if (!job || !job.mistralExtractions[0]) {
      throw new Error(`Job ${this.jobId} not found or missing extraction data`);
    }

    return job;
  }

  /**
   * Save rule analysis result to database
   */
  private async saveRuleAnalysis(ruleType: string, result: Record<string, unknown>) {
    try {
      await prisma.ruleAnalysis.create({
        data: {
          jobId: this.jobId,
          ruleType,
          status: result.status,
          confidence: result.confidence,
          reasoning: result.reasoning,
          costImpact: result.costImpact,
          findings: result as any, // Required field for legacy compatibility
          analysisData: result as any,
          analyzedAt: new Date()
        }
      });
      console.warn(`💾 Saved ${ruleType} analysis to database`);
    } catch (error) {
      console.error(`❌ Failed to save ${ruleType} analysis:`, error);
    }
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress(
    ruleName: string, 
    status: 'pending' | 'running' | 'completed' | 'failed',
    progress: number,
    message: string,
    error?: string | Error
  ) {
    const progressUpdate: AnalysisProgress = {
      jobId: this.jobId,
      ruleName,
      status,
      progress,
      message,
      error: error?.message,
      timestamp: new Date()
    };

    console.warn(`📊 ${ruleName}: ${status} (${progress}%) - ${message}`);

    if (this.onProgress) {
      this.onProgress(progressUpdate);
    }

    // In a real implementation, this would also emit via WebSocket
    if (this.enableRealTimeUpdates) {
      // TODO: Emit via WebSocket to frontend
      // websocketService.emit(`job:${this.jobId}:progress`, progressUpdate);
    }
  }

  /**
   * Get analysis progress for a job (static method)
   */
  static async getAnalysisProgress(jobId: string) {
    const analyses = await prisma.ruleAnalysis.findMany({
      where: { jobId },
      orderBy: { analyzedAt: 'desc' }
    });

    return analyses.map(analysis => ({
      ruleName: analysis.ruleType,
      status: analysis.status,
      confidence: analysis.confidence,
      costImpact: analysis.costImpact,
      analyzedAt: analysis.analyzedAt
    }));
  }

  /**
   * Check if analysis is complete for a job
   */
  static async isAnalysisComplete(jobId: string): Promise<boolean> {
    const analyses = await prisma.ruleAnalysis.findMany({
      where: { jobId }
    });

    // For now, we only check ridge cap analysis
    const ridgeCapAnalysis = analyses.find(a => a.ruleType === 'HIP_RIDGE_CAP');
    return !!ridgeCapAnalysis;
  }
}

// Factory function for easy instantiation
export function createAnalysisWorker(config: AnalysisWorkerConfig): AnalysisWorker {
  return new AnalysisWorker(config);
}

// Export analysis worker instance
export { AnalysisWorker as default };