import { NextRequest, NextResponse } from 'next/server';

import { AnalysisWorker } from '../../../../../lib/analysis/analysis-worker';
import { mapDatabaseToRidgeCapData } from '../../../../../lib/ridge-cap-data-mapper';
import { prisma } from '../../../../../lib/database/client';

/**
 * POST /api/jobs/[jobId]/analyze
 *
 * Runs business rule analysis for a job using the Analysis Worker.
 * Returns real-time progress updates and final results.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    console.log(`🚀 Starting business rule analysis for job ${jobId}`);

    // Check if job exists and has extraction data
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.mistralExtractions || job.mistralExtractions.length === 0) {
      return NextResponse.json(
        {
          error:
            'No extraction data found for job. Please run document extraction first.',
        },
        { status: 400 }
      );
    }

    // Create analysis worker with progress tracking
    const progressUpdates: any[] = [];

    const worker = new AnalysisWorker({
      jobId,
      onProgress: progress => {
        progressUpdates.push(progress);
        console.log(
          `📊 ${progress.ruleName}: ${progress.status} (${progress.progress}%) - ${progress.message}`
        );
      },
      enableRealTimeUpdates: true,
    });

    // Run all business rule analyses
    const results = await worker.runAllBusinessRules();

    // Load updated job data with rule analyses
    const updatedJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
        ruleAnalyses: {
          where: { ruleType: 'HIP_RIDGE_CAP' },
          orderBy: { analyzedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Map ridge cap analysis to UI format
    let ridgeCapUiData = null;
    if (updatedJob && results.ridgeCap) {
      const ruleAnalysisResult = {
        ruleName: 'ridge_cap',
        status: results.ridgeCap.status,
        confidence: results.ridgeCap.confidence,
        reasoning: results.ridgeCap.reasoning,
        costImpact: results.ridgeCap.costImpact,
        estimateQuantity: results.ridgeCap.estimateQuantity,
        requiredQuantity: results.ridgeCap.requiredQuantity,
        variance: results.ridgeCap.variance,
        varianceType: results.ridgeCap.varianceType,
        materialStatus: results.ridgeCap.materialStatus,
        currentSpecification: results.ridgeCap.currentSpecification,
      };

      ridgeCapUiData = mapDatabaseToRidgeCapData(
        updatedJob as any,
        ruleAnalysisResult as any
      );
    }

    console.log(`✅ Business rule analysis completed for job ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      results: {
        ridgeCap: results.ridgeCap,
        starterStrip: results.starterStrip,
        dripEdge: results.dripEdge,
        iceAndWater: results.iceAndWater,
      },
      uiData: {
        ridgeCap: ridgeCapUiData,
      },
      progressUpdates,
      summary: {
        totalRules: 4,
        completedRules: Object.values(results).filter(r => r !== null).length,
        supplementsNeeded: Object.values(results).filter(
          r => r && r.status === 'SUPPLEMENT_NEEDED'
        ).length,
        totalCostImpact: Object.values(results).reduce(
          (sum, r) => sum + (r?.costImpact || 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error('❌ Analysis failed:', error);

    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development'
            ? (error as Error)?.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/[jobId]/analyze
 *
 * Gets current analysis status and results for a job.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Check if analysis is complete
    const isComplete = await AnalysisWorker.isAnalysisComplete(jobId);

    // Get analysis progress
    const progress = await AnalysisWorker.getAnalysisProgress(jobId);

    // Load job with analysis results
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
        ruleAnalyses: {
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Map existing results to UI format
    let ridgeCapUiData = null;
    const ridgeCapAnalysis = job.ruleAnalyses.find(
      a => a.ruleType === 'HIP_RIDGE_CAP'
    );

    if (ridgeCapAnalysis) {
      const analysisData = ridgeCapAnalysis.analysisData as any;
      const ruleAnalysisResult = {
        ruleName: 'ridge_cap',
        status: analysisData.status,
        confidence: analysisData.confidence,
        reasoning: analysisData.reasoning,
        costImpact: analysisData.costImpact,
        estimateQuantity: analysisData.estimateQuantity,
        requiredQuantity: analysisData.requiredQuantity,
        variance: analysisData.variance,
        varianceType: analysisData.varianceType,
        materialStatus: analysisData.materialStatus,
        currentSpecification: analysisData.currentSpecification,
      };

      ridgeCapUiData = mapDatabaseToRidgeCapData(
        job as any,
        ruleAnalysisResult as any
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      isAnalysisComplete: isComplete,
      progress,
      uiData: {
        ridgeCap: ridgeCapUiData,
      },
      analyses: job.ruleAnalyses.map(analysis => ({
        ruleType: analysis.ruleType,
        status: analysis.status,
        confidence: analysis.confidence,
        costImpact: analysis.costImpact,
        analyzedAt: analysis.analyzedAt,
      })),
    });
  } catch (error) {
    console.error('❌ Failed to get analysis status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get analysis status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
