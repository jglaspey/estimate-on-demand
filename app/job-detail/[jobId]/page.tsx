'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Share, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { HipRidgeCapCard } from '@/components/rules/HipRidgeCapCard'; // Unused - using RidgeCapAnalysis instead
import { StarterStripCard } from '@/components/rules/StarterStripCard';
import { DripEdgeGutterApronCard } from '@/components/rules/DripEdgeGutterApronCard';
import { IceWaterBarrierCard } from '@/components/rules/IceWaterBarrierCard';
import { RidgeCapAnalysis } from '@/components/RidgeCapAnalysis';
// import { InteractiveRoofDiagram } from '@/components/InteractiveRoofDiagram';
import {
  EnhancedDocumentViewer,
  type ViewerHandle,
} from '@/components/EnhancedDocumentViewer';
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
  // New fields for enhanced display
  roofShingleType?: 'laminate' | '3-tab' | 'other';
  ridgeCapSpecification?: 'purpose-built' | 'high-profile' | 'cut-from-3-tab';
  quantityMatch?: boolean;
  astmCompliance?: string;
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
  totalArea?: number;
  totalSquares?: number;
  pitch?: string;
  stories?: number;
  eavesLength?: number;
  rakesLength?: number;
  ridgesLength?: number;
  valleysLength?: number;
  totalRidgeHip?: number;
  ridgeLength?: number;
  hipsLength?: number;
  dripEdgeTotal?: number;
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
  const [validationNotes, setValidationNotes] = useState<string[]>([]);
  const [discrepantFields, setDiscrepantFields] = useState<string[]>([]);
  const hasInitializedRef = useRef(false);
  const viewerRef = useRef<ViewerHandle | null>(null);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        // Silent refresh after initial mount
        const isFirstLoad = !hasInitializedRef.current;
        if (isFirstLoad) setLoading(true);

        // Fetch job data
        const jobResponse = await fetch(`/api/jobs/${jobId}`, {
          cache: 'no-store',
        });
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

        // Base measurements from Job mirrors
        let baseMeasurements: RoofMeasurements = {
          totalArea: job.roofSquares ? job.roofSquares * 100 : 0,
          totalSquares: job.roofSquares || 0,
          pitch: job.roofSlope || 'Unknown',
          stories: job.roofStories || 0,
          eavesLength: job.eaveLength || 0,
          rakesLength: job.rakeLength || 0,
          ridgesLength: job.ridgeHipLength || 0,
          valleysLength: job.valleyLength || 0,
          totalRidgeHip: job.ridgeHipLength || 0,
        };

        // Try to enrich with latest v2 measurements
        try {
          const v2Res = await fetch(`/api/jobs/${jobId}/extract-v2`, {
            cache: 'no-store',
          });
          if (v2Res.ok) {
            const v2 = await v2Res.json();
            const m = v2?.v2?.measurements || {};
            const notes: string[] =
              v2?.v2?.validation?.notes || v2?.validation?.notes || [];
            setValidationNotes(Array.isArray(notes) ? notes : []);
            const fields = (Array.isArray(notes) ? notes : [])
              .map(n =>
                String(n)
                  .replace(/^\*\s*/, '')
                  .split(':')[0]
                  ?.trim()
              )
              .filter(Boolean) as string[];
            setDiscrepantFields(fields);
            const asNum = (v: unknown): number | undefined =>
              typeof v === 'number'
                ? v
                : typeof v === 'string' && v.trim() !== ''
                  ? Number(v.replace(/,/g, ''))
                  : undefined;
            baseMeasurements = {
              ...baseMeasurements,
              // prefer v2 values when present
              totalArea: asNum(m.totalArea) ?? baseMeasurements.totalArea,
              totalSquares: asNum(m.squares) ?? baseMeasurements.totalSquares,
              pitch:
                (m.roofSlope as string) ??
                (m.pitch as string) ??
                ((m as any).predominantPitch as string) ??
                baseMeasurements.pitch,
              stories:
                asNum(m.roofStories) ??
                asNum((m as any).stories) ??
                baseMeasurements.stories,
              eavesLength: asNum(m.eaveLength) ?? baseMeasurements.eavesLength,
              rakesLength: asNum(m.rakeLength) ?? baseMeasurements.rakesLength,
              valleysLength:
                asNum(m.valleyLength) ?? baseMeasurements.valleysLength,
              // include parts so UI can show sublabel
              ridgeLength: asNum((m as any).ridgeLength),
              hipsLength: asNum((m as any).hipLength),
              ridgesLength:
                asNum(m.totalRidgeHip) ??
                (asNum(m.ridgeLength) !== undefined ||
                asNum(m.hipLength) !== undefined
                  ? (asNum(m.ridgeLength) || 0) + (asNum(m.hipLength) || 0)
                  : baseMeasurements.ridgesLength),
              totalRidgeHip:
                asNum(m.totalRidgeHip) ?? baseMeasurements.totalRidgeHip,
              dripEdgeTotal:
                asNum(m.dripEdgeTotal) ??
                ((asNum(m.eaveLength) ?? baseMeasurements.eavesLength) || 0) +
                  ((asNum(m.rakeLength) ?? baseMeasurements.rakesLength) || 0),
            } as RoofMeasurements;

            // If pitch still missing, retry once shortly to avoid manual refresh
            const hasPitch = Boolean(
              (m as any).roofSlope ||
                (m as any).pitch ||
                (m as any).predominantPitch
            );
            if (!hasPitch) {
              setTimeout(() => setReloadVersion(v => v + 1), 1200);
            }
          }
        } catch {
          // Non-fatal; keep base measurements
        }

        setRoofMeasurements(baseMeasurements);

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
        hasInitializedRef.current = true;
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobData();
    }
  }, [jobId, reloadVersion]);

  // Track initial load for silent refresh control (declared above) and a polling timer
  // Note: hasInitializedRef is declared near the top of component; only pollingRef is defined here
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

            // Convert uiData to rule analysis format for display
            const rules: RuleAnalysisResult[] = [];

            if (data.uiData.ridgeCap) {
              rules.push({
                ...data.uiData.ridgeCap,
                ruleName: 'ridge_cap',
              });
            }

            // Add other rules as they become available
            // if (data.uiData.starterStrip) rules.push(data.uiData.starterStrip);
            // if (data.uiData.dripEdge) rules.push(data.uiData.dripEdge);
            // if (data.uiData.iceAndWater) rules.push(data.uiData.iceAndWater);

            setRuleAnalysis(rules);
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

  // Silent polling for missing critical fields (originalEstimate, pitch)
  useEffect(() => {
    if (!jobId || !jobData || !roofMeasurements) return;

    const missingOriginalEstimate =
      !jobData.totalEstimateValue || jobData.totalEstimateValue <= 0;
    const missingPitch =
      !roofMeasurements.pitch || roofMeasurements.pitch === 'Unknown';

    if (!missingOriginalEstimate && !missingPitch) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (pollingRef.current) return;

    let attempts = 0;
    const maxAttempts = 20; // ~30s at 1.5s
    pollingRef.current = setInterval(async () => {
      attempts++;
      let updated = false;
      try {
        if (missingOriginalEstimate) {
          const jobResponse = await fetch(`/api/jobs/${jobId}`, {
            cache: 'no-store',
          });
          if (jobResponse.ok) {
            const { job } = await jobResponse.json();
            if (job?.originalEstimate && job.originalEstimate > 0) {
              setJobData(prev =>
                prev
                  ? { ...prev, totalEstimateValue: job.originalEstimate }
                  : prev
              );
              updated = true;
            }
          }
        }
      } catch {}
      try {
        if (missingPitch) {
          const v2Res = await fetch(`/api/jobs/${jobId}/extract-v2`, {
            cache: 'no-store',
          });
          if (v2Res.ok) {
            const v2 = await v2Res.json();
            const m = v2?.v2?.measurements || {};
            const pitch =
              (m.roofSlope as string) ||
              (m.pitch as string) ||
              (m.predominantPitch as string);
            if (pitch && pitch !== 'Unknown') {
              setRoofMeasurements(prev => (prev ? { ...prev, pitch } : prev));
              updated = true;
            }
          }
        }
      } catch {}

      const stillMissing =
        !jobData?.totalEstimateValue ||
        jobData.totalEstimateValue <= 0 ||
        !roofMeasurements?.pitch ||
        roofMeasurements.pitch === 'Unknown';
      if (updated && !stillMissing) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else if (attempts >= maxAttempts) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 1500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobId, jobData, roofMeasurements]);

  const handleFieldUpdate = (field: string, value: string | number) => {
    if (jobData) {
      setJobData(prev => ({
        ...(prev as JobData),
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
        let ridgeCapData: RidgeCapData;

        if (rule.currentSpecification || analysisResults?.ridgeCap) {
          // Analysis complete: use real data from rule analysis
          // Map the rule analysis data to our enhanced RidgeCapData structure
          const description = rule.currentSpecification?.description || '';
          const reasoning = rule.reasoning || '';

          // Detect roof type from description or reasoning
          const isLaminate =
            description.toLowerCase().includes('laminate') ||
            reasoning.toLowerCase().includes('laminate') ||
            !description.toLowerCase().includes('3-tab');
          const isCutFrom3Tab =
            rule.currentSpecification?.description
              ?.toLowerCase()
              .includes('cut from 3 tab') ||
            rule.currentSpecification?.description
              ?.toLowerCase()
              .includes('cut from 3-tab');
          const isPurposeBuilt =
            rule.currentSpecification?.description
              ?.toLowerCase()
              .includes('purpose') ||
            rule.currentSpecification?.description
              ?.toLowerCase()
              .includes('standard profile');
          const isHighProfile = rule.currentSpecification?.description
            ?.toLowerCase()
            .includes('high profile');

          ridgeCapData = {
            estimateQuantity:
              rule.estimateQuantity ||
              rule.currentSpecification?.quantity ||
              '0 LF',
            estimateUnitPrice: rule.currentSpecification?.rate || '$0.00',
            estimateTotal: rule.currentSpecification?.total || '$0.00',
            requiredQuantity: rule.requiredQuantity || '0 LF',
            // Extract ridge and hip from reasoning if available
            ridgeLength: (() => {
              const match = reasoning.match(/Ridges\s*\(([\d.]+)\s*LF\)/i);
              return match
                ? parseFloat(match[1])
                : parseFloat(rule.requiredQuantity || '0') * 0.94;
            })(),
            hipLength: (() => {
              const match = reasoning.match(/Hips\s*\(([\d.]+)\s*LF\)/i);
              return match
                ? parseFloat(match[1])
                : parseFloat(rule.requiredQuantity || '0') * 0.06;
            })(),
            variance: rule.variance || '0 LF',
            varianceAmount: parseFloat(rule.variance || '0'),
            costImpact: rule.costImpact || 0,
            confidence: rule.confidence || 0,
            roofType: isLaminate ? 'Laminate Composition' : '3-Tab Shingle',
            ridgeCapType: isCutFrom3Tab
              ? 'cut from 3 tab'
              : isHighProfile
                ? 'high profile'
                : 'standard profile',
            complianceStatus:
              (rule.materialStatus as 'compliant' | 'non-compliant') ||
              (rule.status === 'COMPLIANT' ? 'compliant' : 'non-compliant'),
            lineItemCode: rule.currentSpecification?.code || 'RFG HRSD',
            lineItemDescription:
              rule.currentSpecification?.description ||
              'Hip/Ridge cap - composition shingles',
            complianceText:
              rule.materialStatus === 'compliant'
                ? 'Ridge cap specification meets ASTM D3161/D7158 requirements'
                : 'Cut-from-3-tab ridge caps do not meet ASTM wind resistance standards',
            documentationNote:
              'Cut-up 3-tab shingles used as hip & ridge caps are not independently tested or rated for wind resistance under ASTM D3161 or ASTM D7158, and therefore have no assignable wind rating when used in those applications.',
            // New enhanced fields
            roofShingleType: isLaminate ? 'laminate' : '3-tab',
            ridgeCapSpecification: isCutFrom3Tab
              ? 'cut-from-3-tab'
              : isHighProfile
                ? 'high-profile'
                : 'purpose-built',
            quantityMatch: rule.varianceType === 'adequate',
            astmCompliance: 'ASTM D3161/D7158',
          };
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
            // Default enhanced fields for processing state
            roofShingleType: 'laminate',
            ridgeCapSpecification: 'purpose-built',
            quantityMatch: false,
            astmCompliance: 'ASTM D3161/D7158',
          };
        }

        return (
          <RidgeCapAnalysis
            key={rule.ruleName}
            ruleNumber={1}
            totalRules={4}
            ridgeCapData={ridgeCapData}
            onJumpToEvidence={(location, type) => {
              const match = String(location || '').match(/page[-\s]?(\d+)/i);
              const page = match ? Math.max(1, parseInt(match[1], 10)) : 1;
              // Jump to evidence in document viewer
              const payload = {
                docType: type,
                page,
                rule: rule.ruleName,
                location,
              } as const;
              viewerRef.current?.jumpToEvidence(payload);
              // Fire a microtask after a tick to reinforce when switching tabs
              setTimeout(() => viewerRef.current?.jumpToEvidence(payload), 0);
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
        {/* Discrepancy Notes Footer */}
        {validationNotes.length > 0 && (
          <div className='border-t border-zinc-200 dark:border-zinc-800 mt-6'>
            <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4'>
              <div className='text-sm text-zinc-600 dark:text-zinc-300'>
                <div className='font-medium mb-1'>Notes</div>
                <ul className='list-disc ml-5 space-y-1'>
                  {validationNotes.map((n, i) => (
                    <li key={i} className='marker:text-zinc-400'>
                      <span className='mr-1'>*</span>
                      {n.replace(/^\*\s*/, '')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
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
                    {(jobData?.propertyAddress as string) ||
                      'Loading address...'}
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
            jobData={jobData as any}
            roofMeasurements={roofMeasurements as any}
            ruleAnalysis={ruleAnalysis as any}
            onStartReview={handleStartReview}
            _onFieldUpdate={handleFieldUpdate}
            discrepantFields={discrepantFields as any}
            validationNotes={validationNotes}
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
      <main className='h-[calc(100vh-4rem)] flex bg-zinc-50 dark:bg-zinc-950'>
        {/* Left Panel - Business Rules (1/3 width) */}
        <div className='w-1/3 bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
          <div className='h-full overflow-auto'>
            <div className='p-6'>
              <div className='space-y-4'>
                {/* Always show ridge cap analysis - either from real data or default state */}
                {renderRuleCard({
                  ruleName: 'ridge_cap',
                  status: 'SUPPLEMENT_NEEDED',
                  confidence: 0.95,
                  reasoning: 'Analysis in progress...',
                  costImpact: 0,
                  estimateQuantity: 'Processing...',
                  requiredQuantity: 'Processing...',
                  variance: 'Calculating...',
                  varianceType: 'shortage',
                })}

                {/* Render additional rules from analysis if available */}
                {ruleAnalysis
                  .filter(rule => rule.ruleName !== 'ridge_cap')
                  .map(rule => renderRuleCard(rule))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Document Viewer (2/3 width) */}
        <div className='w-2/3 bg-zinc-50 dark:bg-zinc-950 flex'>
          <div className='flex-1 p-6 pb-0 flex flex-col min-h-0'>
            <EnhancedDocumentViewer
              ref={viewerRef}
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
