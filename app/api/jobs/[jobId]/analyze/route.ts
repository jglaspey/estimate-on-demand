import { NextRequest, NextResponse } from 'next/server';

import { AnalysisWorker } from '../../../../../lib/analysis/analysis-worker';
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
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });

    // Map business rule analyses to UI format
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

      ridgeCapUiData = ruleAnalysisResult;
    }

    // Map drip edge analysis to UI format
    let dripEdgeUiData = null;
    if (updatedJob && results.dripEdge) {
      const ruleAnalysisResult = {
        ruleName: 'drip_edge_gutter_apron',
        status: results.dripEdge.status,
        confidence: results.dripEdge.confidence,
        reasoning: results.dripEdge.reasoning,
        costImpact: results.dripEdge.costImpact,
        // Map drip edge specific fields to standard format
        estimateQuantity: results.dripEdge.dripEdgeQuantity || 'Not found',
        requiredQuantity: results.dripEdge.requiredRakeLength || 'Unknown',
        variance:
          results.dripEdge.rakeShortfall ||
          results.dripEdge.eaveShortfall ||
          'See analysis',
        varianceType:
          results.dripEdge.status === 'COMPLIANT' ? 'adequate' : 'shortage',
        materialStatus: results.dripEdge.complianceStatus || 'non-compliant',
        currentSpecification: {
          code:
            results.dripEdge.dripEdgeLineItem?.code ||
            results.dripEdge.gutterApronLineItem?.code ||
            null,
          description:
            results.dripEdge.dripEdgeLineItem?.description ||
            results.dripEdge.gutterApronLineItem?.description ||
            null,
          quantity:
            results.dripEdge.dripEdgeQuantity ||
            results.dripEdge.gutterApronQuantity ||
            null,
          rate:
            results.dripEdge.dripEdgeUnitPrice ||
            results.dripEdge.gutterApronUnitPrice ||
            null,
          total:
            results.dripEdge.dripEdgeTotal ||
            results.dripEdge.gutterApronTotal ||
            null,
        },
      };

      dripEdgeUiData = ruleAnalysisResult;
    }

    // Map ice & water barrier analysis to UI format
    let iceWaterUiData = null;
    if (updatedJob && results.iceAndWater) {
      const ruleAnalysisResult = {
        ruleName: 'ice_water_barrier',
        status: results.iceAndWater.status,
        confidence: results.iceAndWater.confidence,
        reasoning: results.iceAndWater.reasoning,
        costImpact: results.iceAndWater.costImpact,
        estimateQuantity: results.iceAndWater.estimateQuantity,
        requiredQuantity: results.iceAndWater.requiredQuantity,
        variance: results.iceAndWater.variance,
        varianceType: results.iceAndWater.varianceType,
        materialStatus: results.iceAndWater.materialStatus,
        currentSpecification: results.iceAndWater.currentSpecification,
        calculationDetails: results.iceAndWater.calculationDetails,
      };

      iceWaterUiData = ruleAnalysisResult;
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
        dripEdge: dripEdgeUiData,
        iceAndWater: iceWaterUiData,
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
      const findings = ridgeCapAnalysis.findings as any;
      const ruleAnalysisResult = {
        ruleName: 'ridge_cap',
        status: ridgeCapAnalysis.status,
        confidence: ridgeCapAnalysis.confidence || 0,
        reasoning: ridgeCapAnalysis.reasoning || '',
        costImpact: findings?.costImpact || 0,
        estimateQuantity: findings?.estimateQuantity || '',
        requiredQuantity: findings?.requiredQuantity || '',
        variance: findings?.variance || '',
        varianceType: findings?.varianceType || 'adequate',
        materialStatus: findings?.materialStatus || 'compliant',
        currentSpecification: findings?.currentSpecification || {},
      };

      ridgeCapUiData = ruleAnalysisResult;
    }

    // Map drip edge analysis
    let dripEdgeUiData = null;
    const dripEdgeAnalysis = job.ruleAnalyses.find(
      a => a.ruleType === 'DRIP_EDGE'
    );

    if (dripEdgeAnalysis) {
      const findings = dripEdgeAnalysis.findings as any;
      const ruleAnalysisResult = {
        ruleName: 'drip_edge_gutter_apron',
        status: dripEdgeAnalysis.status,
        confidence: dripEdgeAnalysis.confidence || 0,
        reasoning: dripEdgeAnalysis.reasoning || '',
        costImpact: findings?.costImpact || 0,
        // Map drip edge specific fields from database
        estimateQuantity:
          findings?.dripEdgeQuantity ||
          findings?.estimateQuantity ||
          'Not found',
        requiredQuantity:
          findings?.requiredRakeLength ||
          findings?.requiredQuantity ||
          'Unknown',
        variance:
          findings?.rakeShortfall ||
          findings?.eaveShortfall ||
          findings?.variance ||
          'See analysis',
        varianceType:
          findings?.status === 'COMPLIANT' ? 'adequate' : 'shortage',
        materialStatus:
          findings?.complianceStatus ||
          findings?.materialStatus ||
          'non-compliant',
        currentSpecification: findings?.currentSpecification || {
          code:
            findings?.dripEdgeLineItem?.code ||
            findings?.gutterApronLineItem?.code ||
            null,
          description:
            findings?.dripEdgeLineItem?.description ||
            findings?.gutterApronLineItem?.description ||
            null,
          quantity:
            findings?.dripEdgeQuantity || findings?.gutterApronQuantity || null,
          rate:
            findings?.dripEdgeUnitPrice ||
            findings?.gutterApronUnitPrice ||
            null,
          total: findings?.dripEdgeTotal || findings?.gutterApronTotal || null,
        },
      };

      dripEdgeUiData = ruleAnalysisResult;
    }

    // Map ice & water barrier analysis
    let iceWaterUiData = null;
    const iceWaterAnalysis = job.ruleAnalyses.find(
      a => a.ruleType === 'ICE_WATER_BARRIER'
    );

    if (iceWaterAnalysis) {
      const findings = iceWaterAnalysis.findings as any;
      const ruleAnalysisResult = {
        ruleName: 'ice_water_barrier',
        status: iceWaterAnalysis.status,
        confidence: iceWaterAnalysis.confidence || 0,
        reasoning: iceWaterAnalysis.reasoning || '',
        costImpact: findings?.costImpact || 0,
        estimateQuantity: findings?.estimateQuantity || '',
        requiredQuantity: findings?.requiredQuantity || '',
        variance: findings?.variance || '',
        varianceType: findings?.varianceType || 'adequate',
        materialStatus: findings?.materialStatus || 'compliant',
        currentSpecification: findings?.currentSpecification || {},
        calculationDetails: findings?.calculationDetails || {},
      };

      iceWaterUiData = ruleAnalysisResult;
    }

    return NextResponse.json({
      success: true,
      jobId,
      isAnalysisComplete: isComplete,
      progress,
      uiData: {
        ridgeCap: ridgeCapUiData,
        dripEdge: dripEdgeUiData,
        iceAndWater: iceWaterUiData,
      },
      analyses: job.ruleAnalyses.map(analysis => {
        const findings = analysis.findings as any;
        return {
          ruleType: analysis.ruleType,
          status: analysis.status,
          confidence: analysis.confidence,
          costImpact: findings?.costImpact || 0,
          analyzedAt: analysis.analyzedAt,
        };
      }),
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
