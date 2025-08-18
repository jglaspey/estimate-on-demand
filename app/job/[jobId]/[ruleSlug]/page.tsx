'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Share,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getRuleBySlug,
  getNextRule,
  getPreviousRule,
  getRuleProgress,
  type RuleDefinition,
} from '@/lib/rules/rule-config';
import { RidgeCapAnalysis } from '@/components/RidgeCapAnalysis';
import { DripEdgeGutterApronCard } from '@/components/rules/DripEdgeGutterApronCard';
import { StarterStripCard } from '@/components/rules/StarterStripCard';
import { IceWaterBarrierCard } from '@/components/rules/IceWaterBarrierCard';
import {
  EnhancedDocumentViewer,
  type ViewerHandle,
} from '@/components/EnhancedDocumentViewer';

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
  roofShingleType?: 'laminate' | '3-tab' | 'other';
  ridgeCapSpecification?: 'purpose-built' | 'high-profile' | 'cut-from-3-tab';
  quantityMatch?: boolean;
  astmCompliance?: string;
  currentSpecification?: {
    code: string;
    description: string;
    quantity: string;
    rate: string;
    total: string;
  };
  reasoning?: string;
  materialStatus?: 'compliant' | 'non-compliant';
  varianceType?: 'shortage' | 'adequate' | 'excess';
}

interface AnalysisResults {
  ridgeCap?: RidgeCapData;
  starterStrip?: any;
  dripEdge?: any;
  iceAndWater?: any;
}

export default function RulePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const ruleSlug = params.ruleSlug as string;

  const [jobData, setJobData] = useState<JobData | null>(null);
  const [analysisResults, setAnalysisResults] =
    useState<AnalysisResults | null>(null);
  const [ruleAnalysis, setRuleAnalysis] = useState<RuleAnalysisResult | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const viewerRef = useRef<ViewerHandle | null>(null);

  // Get rule definition
  const ruleDefinition = getRuleBySlug(ruleSlug);
  const nextRule = getNextRule(ruleSlug);
  const previousRule = getPreviousRule(ruleSlug);
  const progress = getRuleProgress(ruleSlug);

  // Redirect if rule not found or not available
  useEffect(() => {
    if (!ruleDefinition) {
      setError('Rule not found');
      return;
    }
    if (!ruleDefinition.isAvailable) {
      setError('Rule not yet implemented');
      return;
    }
  }, [ruleDefinition]);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        setLoading(true);

        // Fetch job data
        const jobResponse = await fetch(`/api/jobs/${jobId}`, {
          cache: 'no-store',
        });
        if (!jobResponse.ok) {
          throw new Error(`Failed to fetch job data: ${jobResponse.status}`);
        }
        const response = await jobResponse.json();
        const job = response.job;

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
      } catch (err) {
        console.error('Failed to fetch job data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load job data'
        );
      } finally {
        setLoading(false);
      }
    };

    if (jobId && ruleDefinition?.isAvailable) {
      fetchJobData();
    }
  }, [jobId, ruleDefinition]);

  // Load analysis results
  useEffect(() => {
    const loadAnalysisResults = async () => {
      if (!ruleDefinition) return;

      try {
        const response = await fetch(`/api/jobs/${jobId}/analyze`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.uiData) {
            setAnalysisResults(data.uiData);

            // Convert to rule analysis format based on the rule type
            const analysisKey = ruleDefinition.analysisKey;
            const ruleData = data.uiData[analysisKey];

            if (ruleData) {
              const ruleAnalysis: RuleAnalysisResult = {
                ...ruleData,
                ruleName: ruleSlug,
              };
              setRuleAnalysis(ruleAnalysis);
            }
          }
        }
      } catch (error) {
        console.log('No existing analysis results found:', error);
      }
    };

    if (jobId && ruleDefinition?.isAvailable) {
      loadAnalysisResults();
    }
  }, [jobId, ruleSlug, ruleDefinition]);

  // Map database job status
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

  const handleRuleDecision = (
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => {
    setRuleAnalysis(prev =>
      prev ? { ...prev, userDecision: decision, userNotes: notes || '' } : prev
    );
  };

  // Render the appropriate rule component
  const renderRuleComponent = () => {
    if (!ruleAnalysis && !analysisResults) {
      return (
        <div className='flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-4'></div>
            <p className='text-sm text-zinc-500'>Loading analysis results...</p>
          </div>
        </div>
      );
    }

    const onDecision = (
      decision: 'accepted' | 'rejected' | 'modified',
      notes?: string
    ) => {
      handleRuleDecision(decision, notes);
    };

    switch (ruleDefinition?.component) {
      case 'RidgeCapAnalysis':
        // Create ridge cap data from analysis results
        let ridgeCapData: RidgeCapData;

        if (analysisResults?.ridgeCap || ruleAnalysis?.currentSpecification) {
          const currentSpec =
            analysisResults?.ridgeCap?.currentSpecification ||
            ruleAnalysis?.currentSpecification;
          const description = currentSpec?.description || '';
          const reasoning =
            analysisResults?.ridgeCap?.reasoning ||
            ruleAnalysis?.reasoning ||
            '';

          const isLaminate =
            description.toLowerCase().includes('laminate') ||
            reasoning.toLowerCase().includes('laminate') ||
            !description.toLowerCase().includes('3-tab');
          const isCutFrom3Tab =
            currentSpec?.description
              ?.toLowerCase()
              .includes('cut from 3 tab') ||
            currentSpec?.description?.toLowerCase().includes('cut from 3-tab');
          const isHighProfile = currentSpec?.description
            ?.toLowerCase()
            .includes('high profile');

          ridgeCapData = {
            estimateQuantity:
              analysisResults?.ridgeCap?.estimateQuantity ||
              ruleAnalysis?.estimateQuantity ||
              currentSpec?.quantity ||
              '0 LF',
            estimateUnitPrice: currentSpec?.rate || '$0.00',
            estimateTotal: currentSpec?.total || '$0.00',
            requiredQuantity:
              analysisResults?.ridgeCap?.requiredQuantity ||
              ruleAnalysis?.requiredQuantity ||
              '0 LF',
            ridgeLength: (() => {
              const match = reasoning.match(/Ridges\s*\(([\d.]+)\s*LF\)/i);
              return match
                ? parseFloat(match[1])
                : parseFloat(ruleAnalysis?.requiredQuantity || '0') * 0.94;
            })(),
            hipLength: (() => {
              const match = reasoning.match(/Hips\s*\(([\d.]+)\s*LF\)/i);
              return match
                ? parseFloat(match[1])
                : parseFloat(ruleAnalysis?.requiredQuantity || '0') * 0.06;
            })(),
            variance:
              analysisResults?.ridgeCap?.variance ||
              ruleAnalysis?.variance ||
              '0 LF',
            varianceAmount: parseFloat(
              analysisResults?.ridgeCap?.variance ||
                ruleAnalysis?.variance ||
                '0'
            ),
            costImpact:
              analysisResults?.ridgeCap?.costImpact ||
              ruleAnalysis?.costImpact ||
              0,
            confidence:
              analysisResults?.ridgeCap?.confidence ||
              ruleAnalysis?.confidence ||
              0,
            roofType: isLaminate ? 'Laminate Composition' : '3-Tab Shingle',
            ridgeCapType: isCutFrom3Tab
              ? 'cut from 3 tab'
              : isHighProfile
                ? 'high profile'
                : 'standard profile',
            complianceStatus:
              (analysisResults?.ridgeCap?.materialStatus as
                | 'compliant'
                | 'non-compliant') ||
              (ruleAnalysis?.materialStatus as 'compliant' | 'non-compliant') ||
              (ruleAnalysis?.status === 'COMPLIANT'
                ? 'compliant'
                : 'non-compliant'),
            lineItemCode: currentSpec?.code || 'RFG HRSD',
            lineItemDescription:
              currentSpec?.description ||
              'Hip/Ridge cap - composition shingles',
            complianceText:
              ruleAnalysis?.materialStatus === 'compliant'
                ? 'Ridge cap specification meets ASTM D3161/D7158 requirements'
                : 'Cut-from-3-tab ridge caps do not meet ASTM wind resistance standards',
            documentationNote:
              'Cut-up 3-tab shingles used as hip & ridge caps are not independently tested or rated for wind resistance under ASTM D3161 or ASTM D7158, and therefore have no assignable wind rating when used in those applications.',
            roofShingleType: isLaminate ? 'laminate' : '3-tab',
            ridgeCapSpecification: isCutFrom3Tab
              ? 'cut-from-3-tab'
              : isHighProfile
                ? 'high-profile'
                : 'purpose-built',
            quantityMatch:
              analysisResults?.ridgeCap?.varianceType === 'adequate' ||
              ruleAnalysis?.varianceType === 'adequate',
            astmCompliance: 'ASTM D3161/D7158',
          };
        } else {
          // Default loading state
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
            complianceStatus: 'compliant',
            lineItemCode: 'PROCESSING',
            lineItemDescription:
              'Automatic analysis in progress - extracting data from documents',
            complianceText:
              'Analyzing compliance against ASTM standards with Claude AI',
            documentationNote:
              "Automatic analysis is processing this job's documents. Results will appear shortly as the system analyzes document data and applies business rules.",
            roofShingleType: 'laminate',
            ridgeCapSpecification: 'purpose-built',
            quantityMatch: false,
            astmCompliance: 'ASTM D3161/D7158',
          };
        }

        return (
          <RidgeCapAnalysis
            ruleNumber={progress.current}
            totalRules={progress.total}
            ridgeCapData={ridgeCapData}
            onJumpToEvidence={(location, type) => {
              if (!viewerRef.current) return;

              const match = String(location || '').match(/page[-\s]?(\d+)/i);
              const page = match ? Math.max(1, parseInt(match[1], 10)) : 1;

              const payload = {
                docType: type === 'report' ? 'roof_report' : type,
                page,
                rule: ruleSlug,
                location,
              } as const;

              viewerRef.current.jumpToEvidence(payload);
            }}
            onDecision={onDecision}
          />
        );

      case 'DripEdgeGutterApronCard':
        return ruleAnalysis ? (
          <DripEdgeGutterApronCard
            ruleAnalysis={ruleAnalysis}
            onDecision={onDecision}
          />
        ) : null;

      case 'StarterStripCard':
        return ruleAnalysis ? (
          <StarterStripCard
            ruleAnalysis={ruleAnalysis}
            onDecision={onDecision}
          />
        ) : null;

      case 'IceWaterBarrierCard':
        return ruleAnalysis ? (
          <IceWaterBarrierCard
            ruleAnalysis={ruleAnalysis}
            onDecision={onDecision}
          />
        ) : null;

      default:
        return (
          <div className='text-center py-8'>
            <p className='text-zinc-500'>Rule component not implemented</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900'></div>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-4'>
            Loading rule analysis...
          </h2>
        </div>
      </div>
    );
  }

  if (error || !jobData || !ruleDefinition) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2'>
            {error || 'Rule not found'}
          </h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-4'>
            {error || 'The requested rule could not be loaded.'}
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

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
      {/* Header */}
      <header className='sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-zinc-200 dark:bg-zinc-950/95 dark:border-zinc-800'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-4'>
              <button
                onClick={() => router.push(`/job-detail/${jobId}`)}
                className='inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
              >
                <ArrowLeft className='h-4 w-4' />
                Back to Overview
              </button>

              <div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

              <div className='min-w-0'>
                <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate'>
                  {ruleDefinition.name}
                </h1>
                <p className='text-sm text-zinc-500 dark:text-zinc-400 truncate'>
                  {jobData.customerName} • {jobData.propertyAddress}
                </p>
              </div>

              <div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

              <Badge className='bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'>
                Rule {progress.current} of {progress.total}
              </Badge>
            </div>

            <div className='flex items-center gap-3'>
              {/* Rule Navigation */}
              <div className='flex items-center gap-1'>
                {previousRule && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      router.push(`/job/${jobId}/${previousRule.slug}`)
                    }
                    className='h-8 px-3 text-xs font-medium'
                  >
                    <ChevronLeft className='h-3.5 w-3.5 mr-1' />
                    {previousRule.shortName}
                  </Button>
                )}
                {nextRule && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      router.push(`/job/${jobId}/${nextRule.slug}`)
                    }
                    className='h-8 px-3 text-xs font-medium'
                  >
                    {nextRule.shortName}
                    <ChevronRight className='h-3.5 w-3.5 ml-1' />
                  </Button>
                )}
              </div>

              <div className='h-6 w-px bg-zinc-200 dark:bg-zinc-700' />

              {/* Share and Generate Report buttons removed */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className='h-[calc(100vh-4rem)] flex bg-zinc-50 dark:bg-zinc-950'>
        {/* Left Panel - Rule Analysis (1/3 width) */}
        <div className='w-1/3 bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
          <div className='h-full overflow-auto'>
            <div className='p-6'>{renderRuleComponent()}</div>
          </div>
        </div>

        {/* Right Panel - Document Viewer (2/3 width) */}
        <div className='w-2/3 bg-zinc-50 dark:bg-zinc-950 flex'>
          <div className='flex-1 p-6 pb-0 flex flex-col min-h-0'>
            <EnhancedDocumentViewer
              ref={viewerRef}
              jobId={jobId}
              selectedRule={ruleSlug}
              reloadVersion={reloadVersion}
              busy={isReprocessing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
