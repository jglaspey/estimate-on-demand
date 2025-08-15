'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Share,
  RefreshCw,
  Calculator,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HipRidgeCapCard } from '@/components/rules/HipRidgeCapCard';
import { StarterStripCard } from '@/components/rules/StarterStripCard';
import { DripEdgeGutterApronCard } from '@/components/rules/DripEdgeGutterApronCard';
import { IceWaterBarrierCard } from '@/components/rules/IceWaterBarrierCard';
// import { InteractiveRoofDiagram } from '@/components/InteractiveRoofDiagram';
import { EnhancedDocumentViewer } from '@/components/EnhancedDocumentViewer';
import { OverviewPage } from '@/components/OverviewPage';
import { StickyFooter } from '@/components/StickyFooter';

// Types based on our current extraction data structure
interface JobData {
  id: string;
  customerName: string;
  propertyAddress: string;
  insuranceCarrier: string;
  claimNumber: string;
  dateOfLoss: string;
  claimRep?: string;
  estimator?: string;
  policyNumber: string;
  totalEstimateValue: number;
  status: 'uploading' | 'extracting' | 'analyzing' | 'reviewing' | 'complete';
  createdAt: string;
  updatedAt: string;
}

interface RuleAnalysisResult {
  ruleName: string;
  status: 'COMPLIANT' | 'SUPPLEMENT_NEEDED' | 'INSUFFICIENT_DATA';
  confidence: number;
  reasoning: string;
  costImpact: number;
  userDecision?: 'accepted' | 'rejected' | 'modified';
  userNotes?: string;
  estimateQuantity?: string;
  requiredQuantity?: string;
  variance?: string;
  varianceType?: 'shortage' | 'adequate' | 'excess';
  materialStatus?: 'compliant' | 'non-compliant';
  currentSpecification?: {
    code: string;
    description: string;
    quantity: string;
    rate: string;
    total: string;
  };
}

interface DocumentData {
  id: string;
  fileName: string;
  fileType: 'estimate' | 'roof_report';
  uploadDate: string;
  pageCount: number;
}

interface RoofMeasurements {
  totalRoofArea?: number;
  numberOfSquares?: number;
  predominantPitch?: string;
  numberOfStories?: number;
  totalEaves?: number;
  totalRakes?: number;
  totalRidges?: number;
  totalValleys?: number;
  [key: string]: unknown; // Allow additional properties
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [jobData, setJobData] = useState<JobData | null>(null);
  const [roofMeasurements, setRoofMeasurements] =
    useState<RoofMeasurements | null>(null);
  const [ruleAnalysis, setRuleAnalysis] = useState<RuleAnalysisResult[]>([]);
  const [_documents, setDocuments] = useState<DocumentData[]>([]);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  const [showDemoMode, setShowDemoMode] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [createRuleAnalysisFunction, setCreateRuleAnalysisFunction] = useState<
    ((demoMode: boolean) => RuleAnalysisResult[]) | null
  >(null);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        setLoading(true);

        // Fetch job data
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        if (!jobResponse.ok) {
          const errorText = await jobResponse.text();
          console.error('API Error:', errorText);
          throw new Error(
            `Failed to fetch job data: ${jobResponse.status} - ${errorText}`
          );
        }
        const response = await jobResponse.json();
        const job = response.job; // Extract job from API response

        // Transform the database job to our interface
        const transformedJob: JobData = {
          id: job.id,
          customerName: job.customerName || 'Unknown Customer',
          propertyAddress: job.customerAddress || 'Address not available',
          insuranceCarrier: job.carrier || 'Unknown Carrier',
          claimNumber: job.claimNumber || 'N/A',
          dateOfLoss: job.dateOfLoss
            ? new Date(job.dateOfLoss).toISOString().split('T')[0]
            : '2024-01-01',
          claimRep: job.claimRep || 'N/A',
          estimator: job.estimator || 'N/A',
          policyNumber: job.policyNumber || 'N/A',
          totalEstimateValue: job.originalEstimate || 0,
          status: mapJobStatus(job.status),
          createdAt: job.uploadedAt,
          updatedAt: job.updatedAt,
        };

        setJobData(transformedJob);

        // Extract roof measurements from job data - match OverviewPage field names
        const measurements: RoofMeasurements = {
          // Primary measurements for OverviewPage display
          totalArea: job.roofSquares ? job.roofSquares * 100 : 0,
          totalSquares: job.roofSquares || 0,
          pitch: job.roofSlope || 'Unknown',
          stories: job.roofStories || 0,
          eavesLength: job.eaveLength || 0,
          rakesLength: job.rakeLength || 0,
          ridgesLength: job.ridgeHipLength || 0,
          valleysLength: job.valleyLength || 0,
          // Additional detailed measurements (fallback values)
          roofArea: job.roofSquares ? job.roofSquares * 100 : 0,
          ridgeLength: job.ridgeHipLength || 0,
          hipsLength: 0,
          totalRidgeHip: job.ridgeHipLength || 0,
          soffitDepth: '12"', // Default value
          wallThickness: '6"', // Default value
          // Additional fields for JobDetailsCard compatibility
          totalRoofArea: job.roofSquares ? job.roofSquares * 100 : 0,
          numberOfSquares: job.roofSquares || 0,
          predominantPitch: job.roofSlope || 'Unknown',
          numberOfStories: job.roofStories || 0,
          totalEaves: job.eaveLength || 0,
          totalRakes: job.rakeLength || 0,
          totalRidges: job.ridgeHipLength || 0,
          totalValleys: job.valleyLength || 0,
        };
        setRoofMeasurements(measurements);

        // Create rule analysis with different data based on demo mode
        const createRuleAnalysis = (
          demoMode: boolean
        ): RuleAnalysisResult[] => [
          {
            ruleName: 'ridge_cap',
            status: 'SUPPLEMENT_NEEDED',
            confidence: demoMode ? 0.95 : 0.85,
            reasoning: `Critical shortage detected: Estimate includes only 6 LF of ridge cap while analysis shows 119 ft total needed. Material type (Standard profile) is correct but quantity needs significant adjustment for customer ${transformedJob.customerName}.`,
            costImpact: demoMode ? 4847.7 : undefined,
            // In demo mode, provide real data. In live mode, simulate missing extractions
            estimateQuantity: demoMode ? '6 LF' : undefined,
            requiredQuantity: demoMode ? '119 LF' : undefined,
            variance: demoMode ? '-113 LF' : undefined,
            varianceType: demoMode ? 'shortage' : undefined,
            materialStatus: demoMode ? 'compliant' : undefined,
            currentSpecification: demoMode
              ? {
                  code: 'RFG RIDGC',
                  description: 'Hip/Ridge cap - Standard profile',
                  quantity: '6.00 LF',
                  rate: '$42.90/LF',
                  total: '$257.40',
                }
              : undefined,
          },
        ];

        // Store the createRuleAnalysis function for later use
        setCreateRuleAnalysisFunction(() => createRuleAnalysis);

        // Initialize with demo mode data (this will update when toggle changes)
        const mockRuleAnalysis = createRuleAnalysis(showDemoMode);

        setRuleAnalysis(mockRuleAnalysis);

        // Mock documents based on job
        const mockDocuments: DocumentData[] = [
          {
            id: 'doc-estimate-001',
            fileName: `${transformedJob.customerName.replace(' ', '_')}_Estimate_${transformedJob.claimNumber}.pdf`,
            fileType: 'estimate',
            uploadDate: transformedJob.createdAt,
            pageCount: 6,
          },
          {
            id: 'doc-report-001',
            fileName: 'EagleView_Roof_Report.pdf',
            fileType: 'roof_report',
            uploadDate: transformedJob.createdAt,
            pageCount: 12,
          },
        ];

        setDocuments(mockDocuments);
      } catch (err) {
        console.error('Failed to fetch job data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load job data'
        );
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobData();
    }
  }, [jobId, showDemoMode]);

  // Update rule analysis when demo mode changes
  useEffect(() => {
    if (createRuleAnalysisFunction) {
      const updatedRuleAnalysis = createRuleAnalysisFunction(showDemoMode);
      setRuleAnalysis(updatedRuleAnalysis);
    }
  }, [showDemoMode, createRuleAnalysisFunction]);

  // Map database job status to our interface
  const mapJobStatus = (dbStatus: string): JobData['status'] => {
    const statusMap: Record<string, JobData['status']> = {
      UPLOADED: 'uploading',
      TEXT_EXTRACTED: 'extracting',
      ANALYZING: 'analyzing',
      REVIEW: 'reviewing',
      COMPLETED: 'complete',
    };
    return statusMap[dbStatus] || 'extracting';
  };

  const handleFieldUpdate = (field: string, value: string | number) => {
    if (jobData) {
      setJobData(prev => ({
        ...prev,
        [field]: value,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const handleRuleDecision = (
    ruleName: string,
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => {
    setRuleAnalysis(prev =>
      prev.map(rule =>
        rule.ruleName === ruleName
          ? { ...rule, userDecision: decision, userNotes: notes || '' }
          : rule
      )
    );
  };

  const handlePreviousRule = () => {
    setCurrentRuleIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextRule = () => {
    setCurrentRuleIndex(prev => Math.min(ruleAnalysis.length - 1, prev + 1));
  };

  const handleStartReview = () => {
    setIsReviewMode(true);
  };

  const renderRuleCard = (rule: RuleAnalysisResult) => {
    const onDecision = (
      decision: 'accepted' | 'rejected' | 'modified',
      notes?: string
    ) => {
      handleRuleDecision(rule.ruleName, decision, notes);
    };

    switch (rule.ruleName) {
      case 'ridge_cap':
        return (
          <HipRidgeCapCard
            key={rule.ruleName}
            ruleAnalysis={rule}
            onDecision={onDecision}
            onJumpToEvidence={(location, type) => {
              // Handle evidence navigation
              // In real implementation, this would scroll to or highlight the evidence
              console.warn('Jump to evidence:', location, type);
            }}
            showHighlighting={!showDemoMode} // Show highlighting in Live Data mode
          />
        );
      case 'starter_strip':
        return (
          <StarterStripCard
            key={rule.ruleName}
            ruleAnalysis={rule}
            onDecision={onDecision}
          />
        );
      case 'drip_edge':
        return (
          <DripEdgeGutterApronCard
            key={rule.ruleName}
            ruleAnalysis={rule}
            onDecision={onDecision}
          />
        );
      case 'ice_water_barrier':
        return (
          <IceWaterBarrierCard
            key={rule.ruleName}
            ruleAnalysis={rule}
            onDecision={onDecision}
          />
        );
      default:
        return null;
    }
  };

  const getSupplementTotal = () => {
    return ruleAnalysis
      .filter(rule => rule.userDecision === 'accepted')
      .reduce((total, rule) => total + rule.costImpact, 0);
  };

  // Simple polling util: wait until job status matches one of the targets
  async function pollForJobStatus(
    id: string,
    targets: Array<'ANALYSIS_READY' | 'COMPLETED'>
  ): Promise<void> {
    const timeoutMs = 60_000; // 60s cap
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          const status = data?.job?.status;
          if (targets.includes(status)) return;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900'></div>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-4'>
            Loading job details...
          </h2>
        </div>
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2'>
            {error || 'Job not found'}
          </h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-4'>
            The requested job could not be loaded.
          </p>
          <Button
            onClick={() => router.push('/dashboard-real')}
            variant='outline'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If not in review mode, show the overview page
  if (!isReviewMode) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
        {/* Header */}
        <header className='sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-zinc-200 dark:bg-zinc-950/95 dark:border-zinc-800'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='flex h-16 items-center justify-between'>
              <div className='flex items-center gap-4'>
                <button
                  onClick={() => router.push('/dashboard-real')}
                  className='inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
                >
                  <ArrowLeft className='h-4 w-4' />
                  Back to Dashboard
                </button>

                <div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

                <div className='min-w-0'>
                  <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate'>
                    {jobData?.customerName || 'Loading...'}
                  </h1>
                  <p className='text-sm text-zinc-500 dark:text-zinc-400 truncate'>
                    {jobData?.propertyAddress || 'Loading address...'}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <Badge
                  variant='secondary'
                  className='bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                >
                  Job #
                  {jobData?.id?.split('-')[1] ||
                    jobData?.id?.slice(-4) ||
                    'Loading...'}
                </Badge>

                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={isReprocessing}
                    className={`h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${isReprocessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={async () => {
                      setIsReprocessing(true);
                      try {
                        const res = await fetch(
                          `/api/jobs/${jobId}/reprocess`,
                          { method: 'POST' }
                        );
                        if (!res.ok) {
                          const t = await res.text();
                          throw new Error(t || 'Failed to queue re-run');
                        }
                        // Poll until analysis-ready, then reload data
                        await pollForJobStatus(jobId, [
                          'ANALYSIS_READY',
                          'COMPLETED',
                        ]);
                        setReloadVersion(v => v + 1);
                      } catch (err) {
                        console.error('Re-run failed', err);
                      } finally {
                        setIsReprocessing(false);
                      }
                    }}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1.5 ${isReprocessing ? 'animate-spin' : ''}`}
                    />
                    {isReprocessing ? 'Re-Running…' : 'Re-Run'}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                  >
                    <Share className='h-3.5 w-3.5 mr-1.5' />
                    Share
                  </Button>
                  <Button
                    size='sm'
                    className='h-8 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900'
                  >
                    <Download className='h-3.5 w-3.5 mr-1.5' />
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Overview Page Content */}
        {jobData && roofMeasurements ? (
          <OverviewPage
            jobData={jobData}
            roofMeasurements={roofMeasurements}
            ruleAnalysis={ruleAnalysis}
            onFieldUpdate={handleFieldUpdate}
            onStartReview={handleStartReview}
          />
        ) : (
          <div className='min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900 mx-auto'></div>
              <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-4'>
                Loading job details...
              </h2>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Review mode - show split-pane interface
  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
      {/* Header */}
      <header className='sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-zinc-200 dark:bg-zinc-950/95 dark:border-zinc-800'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-4'>
              <button
                onClick={() => setIsReviewMode(false)}
                className='inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
              >
                <ArrowLeft className='h-4 w-4' />
                Back to Overview
              </button>

              <div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

              <div className='min-w-0'>
                <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate'>
                  {jobData?.customerName || 'Loading...'}
                </h1>
                <p className='text-sm text-zinc-500 dark:text-zinc-400 truncate'>
                  {jobData?.propertyAddress || 'Loading address...'}
                </p>
              </div>

              <div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />
              <Badge className='bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'>
                Review Mode
              </Badge>
              <Button
                variant={showDemoMode ? 'default' : 'outline'}
                size='sm'
                className={`h-7 text-xs ml-4 ${
                  showDemoMode
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800'
                }`}
                onClick={() => setShowDemoMode(!showDemoMode)}
              >
                {showDemoMode ? '🟢 Demo Mode' : '🔴 Live Data'}
              </Button>
            </div>

            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isReprocessing}
                  className={`h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${isReprocessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={async () => {
                    setIsReprocessing(true);
                    try {
                      const res = await fetch(`/api/jobs/${jobId}/reprocess`, {
                        method: 'POST',
                      });
                      if (!res.ok) {
                        const t = await res.text();
                        throw new Error(t || 'Failed to queue re-run');
                      }
                      await pollForJobStatus(jobId, [
                        'ANALYSIS_READY',
                        'COMPLETED',
                      ]);
                      setReloadVersion(v => v + 1);
                    } catch (err) {
                      console.error('Re-run failed', err);
                    } finally {
                      setIsReprocessing(false);
                    }
                  }}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1.5 ${isReprocessing ? 'animate-spin' : ''}`}
                  />
                  {isReprocessing ? 'Re-Running…' : 'Re-Run'}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                >
                  <Share className='h-3.5 w-3.5 mr-1.5' />
                  Share
                </Button>
                <Button
                  size='sm'
                  className='h-8 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900'
                >
                  <Download className='h-3.5 w-3.5 mr-1.5' />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className='h-[calc(100vh-8rem)] flex bg-zinc-50 dark:bg-zinc-950'>
        {/* Left Panel - Business Rules */}
        <div className='w-1/2 bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
          <div className='h-full overflow-auto'>
            <div className='p-8 pb-24'>
              {/* Show enhanced business rule cards for all rules */}
              {ruleAnalysis.length > 0 ? (
                <div className='space-y-6'>
                  {/* Measurement Comparison for Ridge Cap */}
                  {ruleAnalysis[currentRuleIndex]?.ruleName === 'ridge_cap' && (
                    <div className='px-6 py-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20 dark:border-red-800'>
                      <div className='flex items-center gap-2 mb-3'>
                        <Calculator className='h-4 w-4 text-red-600 dark:text-red-400' />
                        <h4 className='text-sm font-medium text-red-900 dark:text-red-100'>
                          Measurement Comparison
                        </h4>
                      </div>
                      <div className='grid grid-cols-2 gap-4 text-xs'>
                        <div className='p-3 bg-white border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800'>
                          <div className='font-medium text-red-900 dark:text-red-100 mb-2'>
                            From Estimate:
                          </div>
                          <div className='space-y-1 text-red-700 dark:text-red-300'>
                            <div>• Ridge cap: 6.00 LF</div>
                            <div>• Type: Standard profile ✓</div>
                            <div>• Rate: $42.90/LF</div>
                          </div>
                        </div>
                        <div className='p-3 bg-white border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800'>
                          <div className='font-medium text-red-900 dark:text-red-100 mb-2'>
                            From EagleView:
                          </div>
                          <div className='space-y-1 text-red-700 dark:text-red-300'>
                            <div>• Total: 119 ft</div>
                            <div>• Ridges: 26 ft, Hips: 93 ft</div>
                            <div>• Shortage: 113 LF (95% short)</div>
                          </div>
                        </div>
                      </div>
                      <div className='mt-3 p-2 bg-red-200 border border-red-300 rounded text-center dark:bg-red-800 dark:border-red-700'>
                        <span className='text-sm font-semibold text-red-900 dark:text-red-100'>
                          💰 Supplement Impact: 113 LF × $4.50 = $508.50
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Business Rule Card */}
                  {renderRuleCard(ruleAnalysis[currentRuleIndex])}
                </div>
              ) : (
                <div className='text-center py-12'>
                  <p className='text-zinc-500'>No business rules to review</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Document Viewer (PDF / Extracted with fullscreen) */}
        <div className='w-1/2 bg-zinc-50 dark:bg-zinc-950 flex'>
          <div className='flex-1 p-8 pb-8 flex flex-col min-h-0'>
            <EnhancedDocumentViewer
              jobId={jobId}
              selectedRule={ruleAnalysis[currentRuleIndex]?.ruleName || null}
              reloadVersion={reloadVersion}
              busy={isReprocessing}
            />
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <StickyFooter
        currentRule={currentRuleIndex}
        totalRules={ruleAnalysis.length}
        ruleAnalysis={ruleAnalysis}
        onPrevious={handlePreviousRule}
        onNext={handleNextRule}
        onRuleSelect={index => setCurrentRuleIndex(index)}
        mode='review'
        supplementTotal={getSupplementTotal()}
        originalTotal={jobData?.totalEstimateValue || 0}
      />
    </div>
  );
}
