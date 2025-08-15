'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Share, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { HipRidgeCapCard } from '@/components/rules/HipRidgeCapCard'; // Unused - using SimplifiedRidgeCapAnalysis instead
import { StarterStripCard } from '@/components/rules/StarterStripCard';
import { DripEdgeGutterApronCard } from '@/components/rules/DripEdgeGutterApronCard';
import { IceWaterBarrierCard } from '@/components/rules/IceWaterBarrierCard';
import { SimplifiedRidgeCapAnalysis } from '@/components/SimplifiedRidgeCapAnalysis';
// import { InteractiveRoofDiagram } from '@/components/InteractiveRoofDiagram';
import { EnhancedDocumentViewer } from '@/components/EnhancedDocumentViewer';
import { OverviewPage } from '@/components/OverviewPage';
// import { StickyFooter } from '@/components/StickyFooter'; // Removed - no longer using rule navigation

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

interface RidgeCapData {
  estimateQuantity?: string;
  estimateUnitPrice?: string;
  estimateTotal?: string;
  requiredQuantity?: string;
  ridgeLength?: number;
  hipLength?: number;
  variance?: string;
  varianceAmount?: number;
  costImpact?: number;
  confidence?: number;
  roofType?: string;
  ridgeCapType?: string;
  complianceStatus?: 'compliant' | 'non-compliant';
  lineItemCode?: string;
  lineItemDescription?: string;
  complianceText?: string;
  documentationNote?: string;
}

interface AnalysisResults {
  ridgeCap?: RidgeCapData;
  starterStrip?: any;
  dripEdge?: any;
  iceAndWater?: any;
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
  const [analysisResults, setAnalysisResults] =
    useState<AnalysisResults | null>(null);
  // Removed manual analysis state - now automatic
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  // Demo mode removed - now using real extracted data only
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  // createRuleAnalysisFunction removed - now using real analysis results only

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

        // Rule analysis now comes from real extraction results only
        // Initial empty state - will be populated by loadAnalysisResults
        setRuleAnalysis([]);

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
  }, [jobId]);

  // Load existing analysis results on mount
  useEffect(() => {
    const loadAnalysisResults = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/analyze`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.uiData) {
            setAnalysisResults(data.uiData);
            console.log('✅ Loaded existing analysis results:', data.uiData);
          }
        }
      } catch (error) {
        console.log('No existing analysis results found:', error);
      }
    };

    if (jobId) {
      loadAnalysisResults();
    }
  }, [jobId]);

  // Manual analysis function removed - analysis now automatic after document extraction

  // Map database job status to our interface
  const mapJobStatus = (dbStatus: string): JobData['status'] => {
    const statusMap: Record<string, JobData['status']> = {
      UPLOADED: 'uploading',
      TEXT_EXTRACTED: 'extracting',
      ANALYZING: 'analyzing',
      REVIEWING: 'reviewing',
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

  // Rule navigation removed - now showing actual analysis results only

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
        // Use real analysis results or show processing state
        let ridgeCapData;

        if (analysisResults?.ridgeCap) {
          // Analysis complete: use real data
          ridgeCapData = analysisResults.ridgeCap;
        } else {
          // Analysis in progress or pending: show processing state
          ridgeCapData = {
            estimateQuantity: 'Processing...',
            estimateUnitPrice: 'Analyzing...',
            estimateTotal: 'Analyzing...',
            requiredQuantity: 'Processing...',
            ridgeLength: 0,
            hipLength: 0,
            variance: 'Analysis in progress',
            varianceAmount: 0,
            costImpact: 0,
            confidence: 0,
            roofType: 'Analyzing document data...',
            ridgeCapType: 'Analyzing compliance...',
            complianceStatus: 'compliant' as const,
            lineItemCode: 'PROCESSING',
            lineItemDescription:
              'Automatic analysis in progress - extracting data from documents',
            complianceText:
              'Analyzing compliance against ASTM standards with Claude AI',
            documentationNote:
              "Automatic analysis is processing this job's documents. Results will appear shortly as the system analyzes document data and applies business rules.",
          };
        }

        return (
          <SimplifiedRidgeCapAnalysis
            key={rule.ruleName}
            ridgeCapData={ridgeCapData}
            onAddToSupplement={data => {
              onDecision('accepted', data.notes);
            }}
            onSkip={() => {
              onDecision('rejected', 'Skipped by user');
            }}
            onJumpToEvidence={(location, type) => {
              // Handle evidence navigation
              // In real implementation, this would scroll to or highlight the evidence
              console.warn('Jump to evidence:', location, type);
            }}
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

  const _getSupplementTotal = () => {
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
                  {/* Manual analysis removed - now automatic after document extraction */}
                  {/* Analysis progress removed - now handled automatically */}
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
              {/* Demo mode toggle removed - now using real extracted data only */}
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

      {/* Main Content - Split Screen with 1/3 - 2/3 layout */}
      <main className='h-[calc(100vh-8rem)] flex bg-zinc-50 dark:bg-zinc-950'>
        {/* Left Panel - Business Rules (1/3 width) */}
        <div className='w-1/3 bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
          <div className='h-full overflow-auto'>
            <div className='p-6 pb-24'>
              {/* Show enhanced business rule cards for all rules */}
              {ruleAnalysis.length > 0 ? (
                <div className='space-y-4'>
                  {/* Render the current rule card */}
                  {renderRuleCard(ruleAnalysis[0])}
                </div>
              ) : (
                <div className='text-center py-12'>
                  <p className='text-zinc-500'>No business rules to review</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Document Viewer (2/3 width) */}
        <div className='w-2/3 bg-zinc-50 dark:bg-zinc-950 flex'>
          <div className='flex-1 p-6 pb-6 flex flex-col min-h-0'>
            <EnhancedDocumentViewer
              jobId={jobId}
              selectedRule={ruleAnalysis[0]?.ruleName || null}
              reloadVersion={reloadVersion}
              busy={isReprocessing}
            />
          </div>
        </div>
      </main>

      {/* Rule navigation footer removed - now showing analysis results directly */}
    </div>
  );
}
