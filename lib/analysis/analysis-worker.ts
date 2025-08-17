/**
 * Analysis Worker
 *
 * Coordinates business rule processing with real-time progress updates.
 * Runs all business rules (Ridge Cap, Starter Strip, Drip Edge, Ice & Water)
 * and provides progress updates via WebSocket/callback mechanism.
 */

import { prisma, RuleType, RuleStatus } from '../database/client';

import {
  ridgeCapAnalyzer,
  RidgeCapAnalysisInput,
  RidgeCapAnalysisResult,
} from './ridge-cap-analyzer';

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
      iceAndWater: null,
    };

    try {
      // Step 1: Load job data with extractions
      this.updateProgress(
        'data_loading',
        'running',
        10,
        'Loading job data and extractions...'
      );

      const jobData = await this.loadJobWithExtractions();
      if (!jobData) {
        throw new Error('Job data not found or incomplete');
      }

      this.updateProgress(
        'data_loading',
        'completed',
        20,
        'Job data loaded successfully'
      );

      // Step 2: Run Ridge Cap Analysis
      this.updateProgress(
        'ridge_cap',
        'running',
        30,
        'Analyzing ridge cap compliance...'
      );

      try {
        results.ridgeCap = await this.runRidgeCapAnalysis(jobData);

        // Save ridge cap analysis to database
        await this.saveRuleAnalysis('HIP_RIDGE_CAP', results.ridgeCap as unknown as Record<string, unknown>);

        this.updateProgress(
          'ridge_cap',
          'completed',
          50,
          `Ridge cap analysis: ${results.ridgeCap.status} - ${results.ridgeCap.costImpact > 0 ? `$${results.ridgeCap.costImpact.toFixed(2)} supplement` : 'compliant'}`
        );
      } catch (error) {
        this.updateProgress(
          'ridge_cap',
          'failed',
          50,
          'Ridge cap analysis failed',
          error as Error
        );
        results.ridgeCap = null;
      }

      // Step 3: Run Starter Strip Analysis (placeholder)
      this.updateProgress(
        'starter_strip',
        'running',
        60,
        'Analyzing starter strip coverage...'
      );

      try {
        // Future implementation
        results.starterStrip = await this.runStarterStripAnalysis(jobData);
        this.updateProgress(
          'starter_strip',
          'completed',
          70,
          'Starter strip analysis completed'
        );
      } catch (error) {
        this.updateProgress(
          'starter_strip',
          'failed',
          70,
          'Starter strip analysis failed',
          error as Error
        );
        results.starterStrip = null;
      }

      // Step 4: Run Drip Edge Analysis (placeholder)
      this.updateProgress(
        'drip_edge',
        'running',
        80,
        'Analyzing drip edge coverage...'
      );

      try {
        // Future implementation
        results.dripEdge = await this.runDripEdgeAnalysis(jobData);
        this.updateProgress(
          'drip_edge',
          'completed',
          90,
          'Drip edge analysis completed'
        );
      } catch (error) {
        this.updateProgress(
          'drip_edge',
          'failed',
          90,
          'Drip edge analysis failed',
          error as Error
        );
        results.dripEdge = null;
      }

      // Step 5: Run Ice & Water Analysis (placeholder)
      this.updateProgress(
        'ice_water',
        'running',
        95,
        'Analyzing ice & water barrier coverage...'
      );

      try {
        // Future implementation
        results.iceAndWater = await this.runIceAndWaterAnalysis(jobData);
        this.updateProgress(
          'ice_water',
          'completed',
          100,
          'All business rule analyses completed'
        );
      } catch (error) {
        this.updateProgress(
          'ice_water',
          'failed',
          100,
          'Ice & water analysis failed',
          error as Error
        );
        results.iceAndWater = null;
      }

      console.warn(`✅ Business rule analysis completed for job ${this.jobId}`);
      return results;
    } catch (error) {
      console.error(
        `❌ Business rule analysis failed for job ${this.jobId}:`,
        error
      );
      this.updateProgress('analysis', 'failed', 0, 'Analysis failed', error as Error);
      throw error;
    }
  }

  /**
   * Run Ridge Cap analysis specifically
   */
  async runRidgeCapAnalysis(
    jobData: Record<string, unknown>
  ): Promise<RidgeCapAnalysisResult> {
    const extractions = jobData.mistralExtractions as any[];
    if (!extractions || !Array.isArray(extractions) || extractions.length === 0) {
      throw new Error('No mistral extractions found in job data');
    }
    
    const extraction = extractions[0];
    const extractedData = extraction.extractedData as Record<string, unknown>;

    // Prepare analysis input with proper type casting
    const analysisInput: RidgeCapAnalysisInput = {
      lineItems: (extractedData.lineItems as any[]) || [],
      ridgeCapItems: (extractedData.ridgeCapItems as any[]) || [],
      roofMeasurements: (extractedData.roofMeasurements as any) || {
        ridgeLength: null,
        hipLength: null,
        totalRidgeHip: null,
        confidence: 0.5,
        sourcePages: [],
        extractedFrom: 'other' as const,
        // Add required fields from RoofMeasurements interface
        totalArea: 0,
        totalSquares: 0,
        pitch: 'Unknown',
        stories: 1,
        eavesLength: 0,
        rakesLength: 0,
        ridgesLength: 0,
        valleysLength: 0,
        roofArea: 0,
        hipsLength: 0,
        soffitDepth: 'Unknown',
        wallThickness: 'Unknown',
        totalRoofArea: 0,
        numberOfSquares: 0,
        predominantPitch: 'Unknown',
        numberOfStories: 1,
        totalEaves: 0,
        totalRakes: 0,
        totalRidges: 0,
        totalValleys: 0,
      },
      roofType: (extractedData.roofType as any) || {
        roofType: 'laminated' as const,
        confidence: 0.5,
        reasoning: 'Default assumption',
        evidence: [],
      },
      jobId: this.jobId,
    };

    return await ridgeCapAnalyzer.analyzeRidgeCapCompliance(analysisInput);
  }

  /**
   * Run Starter Strip analysis (placeholder for future implementation)
   */
  async runStarterStripAnalysis(
    _jobData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      status: 'COMPLIANT',
      reasoning: 'Starter strip analysis not yet implemented',
      costImpact: 0,
    };
  }

  /**
   * Run Drip Edge analysis (placeholder for future implementation)
   */
  async runDripEdgeAnalysis(
    _jobData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      status: 'COMPLIANT',
      reasoning: 'Drip edge analysis not yet implemented',
      costImpact: 0,
    };
  }

  /**
   * Run Ice & Water analysis (placeholder for future implementation)
   */
  async runIceAndWaterAnalysis(
    _jobData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      status: 'COMPLIANT',
      reasoning: 'Ice & water analysis not yet implemented',
      costImpact: 0,
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
            pages: { orderBy: { pageNumber: 'asc' } },
          },
        },
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
        ruleAnalyses: {
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });

    if (!job || !job.mistralExtractions[0]) {
      throw new Error(`Job ${this.jobId} not found or missing extraction data`);
    }

    return job;
  }

  /**
   * Save rule analysis result to database
   */
  private async saveRuleAnalysis(
    ruleType: string,
    result: Record<string, unknown>
  ) {
    try {
      await prisma.ruleAnalysis.create({
        data: {
          jobId: this.jobId,
          ruleType: ruleType as RuleType,
          status: (result.status as RuleStatus) || undefined,
          confidence: (result.confidence as number) || null,
          reasoning: (result.reasoning as string) || null,
          findings: result as any, // Contains costImpact and all analysis data
          analyzedAt: new Date(),
        },
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
      error: typeof error === 'string' ? error : error?.message,
      timestamp: new Date(),
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
      orderBy: { analyzedAt: 'desc' },
    });

    return analyses.map(analysis => ({
      ruleName: analysis.ruleType,
      status: analysis.status,
      confidence: analysis.confidence,
      costImpact: (analysis.findings as any)?.costImpact || 0,
      analyzedAt: analysis.analyzedAt,
    }));
  }

  /**
   * Check if analysis is complete for a job
   */
  static async isAnalysisComplete(jobId: string): Promise<boolean> {
    const analyses = await prisma.ruleAnalysis.findMany({
      where: { jobId },
    });

    // For now, we only check ridge cap analysis
    const ridgeCapAnalysis = analyses.find(a => a.ruleType === 'HIP_RIDGE_CAP');
    return !!ridgeCapAnalysis;
  }
}

// Factory function for easy instantiation
export function createAnalysisWorker(
  config: AnalysisWorkerConfig
): AnalysisWorker {
  return new AnalysisWorker(config);
}

// Export analysis worker instance
export { AnalysisWorker as default };
