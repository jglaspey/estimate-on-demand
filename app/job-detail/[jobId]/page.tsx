'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Share,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OverviewPage } from '@/front-end-mockup/components/OverviewPage';
import { HipRidgeCapCard } from '@/components/rules/HipRidgeCapCard';
import { StarterStripCard } from '@/components/rules/StarterStripCard';
import { DripEdgeGutterApronCard } from '@/components/rules/DripEdgeGutterApronCard';
import { IceWaterBarrierCard } from '@/components/rules/IceWaterBarrierCard';
import { ContextualDocumentViewer } from '@/components/ContextualDocumentViewer';
import { JobDetailsCard } from '@/components/JobDetailsCard';

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
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [jobData, setJobData] = useState<JobData | null>(null);
  const [roofMeasurements, setRoofMeasurements] =
    useState<RoofMeasurements | null>(null);
  const [ruleAnalysis, setRuleAnalysis] = useState<RuleAnalysisResult[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        setLoading(true);

        // Fetch job data
        console.log('Fetching job with ID:', jobId);
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        console.log('Job response status:', jobResponse.status);
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
        const measurements: any = {
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

        // Mock business rule analysis based on real extraction data - temporarily disabled to show clean default state
        const mockRuleAnalysis: RuleAnalysisResult[] = [
          // {
          //   ruleName: 'ridge_cap',
          //   status: 'SUPPLEMENT_NEEDED',
          //   confidence: 0.95,
          //   reasoning: `Critical shortage detected: Estimate includes only 6 LF of ridge cap while analysis shows 119 ft total needed. Material type (Standard profile) is correct but quantity needs significant adjustment for customer ${transformedJob.customerName}.`,
          //   costImpact: 489.6,
          //   estimateQuantity: '6 LF',
          //   requiredQuantity: '119 LF',
          //   variance: '-113 LF',
          //   varianceType: 'shortage',
          //   materialStatus: 'compliant',
          //   currentSpecification: {
          //     code: 'RFG RIDGC',
          //     description: 'Hip/Ridge cap - Standard profile',
          //     quantity: '6.00 LF',
          //     rate: '$42.90/LF',
          //     total: '$257.40',
          //   },
          // },
          // {
          //   ruleName: 'starter_strip',
          //   status: 'SUPPLEMENT_NEEDED',
          //   confidence: 0.88,
          //   reasoning:
          //     'Universal starter strip required but not properly specified. Current estimate notes "Include eave starter course: Yes (included in waste)" but this does not account for the specific universal starter strip product required for laminate shingles.',
          //   costImpact: 513.0,
          // },
          // {
          //   ruleName: 'drip_edge',
          //   status: 'SUPPLEMENT_NEEDED',
          //   confidence: 0.82,
          //   reasoning:
          //     'Insufficient edge flashing coverage. Estimate includes drip edge for rake edges only (120 LF) but missing gutter apron required for eave edges (180 LF). Different components needed for different roof edges.',
          //   costImpact: 765.0,
          // },
          // {
          //   ruleName: 'ice_water_barrier',
          //   status: 'SUPPLEMENT_NEEDED',
          //   confidence: 0.91,
          //   reasoning:
          //     'Insufficient ice & water barrier coverage per IRC R905.1.2. Estimate includes 800 SF but calculation based on roof measurements requires 1,167 SF (180 LF eaves × 60.4" width ÷ 12). Shortage of 367 SF.',
          //   costImpact: 678.95,
          // },
        ];

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
  }, [jobId]);

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
                    className='h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                  >
                    <RefreshCw className='h-3.5 w-3.5 mr-1.5' />
                    Refresh
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
                  className='h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                >
                  <RefreshCw className='h-3.5 w-3.5 mr-1.5' />
                  Refresh
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
      <main className='h-[calc(100vh-4rem)] flex bg-zinc-50 dark:bg-zinc-950'>
        {/* Left Panel - Business Rules */}
        <div className='w-1/2 bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
          <div className='h-full overflow-auto'>
            <div className='p-6 space-y-6'>
              {/* Job Details Card */}
              <JobDetailsCard
                jobData={jobData}
                roofMeasurements={roofMeasurements || undefined}
                onUpdateField={handleFieldUpdate}
              />

              {/* Business Rule Card */}
              {ruleAnalysis.length > 0 &&
                renderRuleCard(ruleAnalysis[currentRuleIndex])}

              {/* Navigation between rules */}
              <div className='flex items-center justify-between pt-4'>
                <Button
                  variant='outline'
                  onClick={handlePreviousRule}
                  disabled={currentRuleIndex === 0}
                  className='flex items-center gap-2'
                >
                  <ChevronLeft className='h-4 w-4' />
                  Previous Rule
                </Button>

                <span className='text-sm text-zinc-500'>
                  Rule {currentRuleIndex + 1} of {ruleAnalysis.length}
                </span>

                <Button
                  variant='outline'
                  onClick={handleNextRule}
                  disabled={currentRuleIndex === ruleAnalysis.length - 1}
                  className='flex items-center gap-2'
                >
                  Next Rule
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Contextual Documents */}
        <div className='w-1/2 bg-zinc-50 dark:bg-zinc-950'>
          <div className='h-full p-6'>
            <ContextualDocumentViewer
              documents={documents}
              selectedRule={ruleAnalysis[currentRuleIndex]?.ruleName || null}
            />
          </div>
        </div>
      </main>

      {/* Sticky Footer with Summary */}
      <div className='fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 p-4'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <div className='text-sm'>
              <span className='text-zinc-500 dark:text-zinc-400'>
                Total Supplement Impact:
              </span>
              <span className='ml-2 font-semibold text-green-600 dark:text-green-400'>
                +${getSupplementTotal().toLocaleString()}
              </span>
            </div>
            <div className='text-sm'>
              <span className='text-zinc-500 dark:text-zinc-400'>
                Original Estimate:
              </span>
              <span className='ml-2 font-semibold'>
                ${jobData?.totalEstimateValue?.toLocaleString() || '0'}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {ruleAnalysis.map((rule, index) => {
              const isActive = index === currentRuleIndex;
              const IconComponent =
                rule.status === 'COMPLIANT'
                  ? CheckCircle
                  : rule.status === 'SUPPLEMENT_NEEDED'
                    ? AlertTriangle
                    : rule.status === 'INSUFFICIENT_DATA'
                      ? HelpCircle
                      : XCircle;

              return (
                <button
                  key={rule.ruleName}
                  onClick={() => setCurrentRuleIndex(index)}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 border-2 border-blue-300 dark:bg-blue-900/50 dark:border-blue-600'
                      : 'bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700'
                  }`}
                >
                  <IconComponent
                    className={`h-4 w-4 ${
                      rule.status === 'COMPLIANT'
                        ? 'text-green-600'
                        : rule.status === 'SUPPLEMENT_NEEDED'
                          ? 'text-red-600'
                          : 'text-orange-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
