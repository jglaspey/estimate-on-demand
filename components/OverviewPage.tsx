import {
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  Building,
  ChevronRight,
  Clock,
  Play,
  Shield,
  ExternalLink,
  FileText,
  BarChart3,
  Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatBox } from '@/components/ChatBox';
import { JobData, RoofMeasurements, RuleAnalysisResult } from '@/types';

interface OverviewPageProps {
  jobData: JobData;
  roofMeasurements: RoofMeasurements;
  ruleAnalysis: RuleAnalysisResult[];
  _onFieldUpdate: (field: string, value: string | number) => void;
  onStartReview: () => void;
  discrepantFields?: string[];
  validationNotes?: string[];
}

export function OverviewPage({
  jobData,
  roofMeasurements,
  ruleAnalysis,
  _onFieldUpdate,
  onStartReview,
  discrepantFields = [],
  validationNotes = [],
}: OverviewPageProps) {
  const router = useRouter();

  // Handle document download
  const handleDownload = async (docType: string, docName: string) => {
    try {
      // Fetch the document from the API
      const response = await fetch(
        `/api/jobs/${jobData.id}/documents/${docType}/download`
      );

      if (!response.ok) {
        console.error('Download failed:', response.statusText);
        return;
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docName}.pdf`;

      // Trigger the download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Map rule names to URL slugs
  const getRuleSlug = (ruleName: string) => {
    const ruleSlugMap: Record<string, string> = {
      ridge_cap: 'hip-ridge-cap',
      drip_edge: 'drip-edge-gutter-apron',
      starter_strip: 'starter-strip',
      ice_water_barrier: 'ice-water-barrier',
    };
    return ruleSlugMap[ruleName] || ruleName;
  };

  const getComplianceStats = () => {
    const compliant = ruleAnalysis.filter(
      rule => rule.status === 'COMPLIANT'
    ).length;
    const needsSupplement = ruleAnalysis.filter(
      rule => rule.status === 'SUPPLEMENT_NEEDED'
    ).length;
    const insufficientData = ruleAnalysis.filter(
      rule => rule.status === 'INSUFFICIENT_DATA'
    ).length;

    return { compliant, needsSupplement, insufficientData };
  };

  const getSupplementTotal = () => {
    return ruleAnalysis
      .filter(rule => rule.status === 'SUPPLEMENT_NEEDED')
      .reduce((total, rule) => total + rule.costImpact, 0);
  };

  const stats = getComplianceStats();
  const supplementTotal = getSupplementTotal();

  // Get status badge configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'uploading':
        return {
          label: 'Uploading',
          color:
            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
          icon: Clock,
        };
      case 'extracting':
        return {
          label: 'Extracting Data',
          color:
            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
          icon: FileText,
        };
      case 'analyzing':
        return {
          label: 'Analyzing',
          color:
            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
          icon: BarChart3,
        };
      case 'reviewing':
        return {
          label: 'Ready for Review',
          color:
            'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
          icon: Play,
        };
      case 'complete':
        return {
          label: 'Complete',
          color:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
          icon: CheckCircle,
        };
      default:
        return {
          label: 'Processing',
          color:
            'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-950/50 dark:text-zinc-300 dark:border-zinc-800',
          icon: Clock,
        };
    }
  };

  // Get button configuration based on status
  const getButtonConfig = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
      case 'analyzing':
        return { label: 'Processing...', disabled: true };
      case 'reviewing':
        return { label: 'Start Review', disabled: false };
      case 'complete':
        return { label: 'View Report', disabled: false };
      default:
        return { label: 'Continue Review', disabled: false };
    }
  };

  const statusConfig = getStatusConfig(jobData.status);
  const buttonConfig = getButtonConfig(jobData.status);
  const StatusIcon = statusConfig.icon;

  // Mock document list - in real app this would come from props or API
  const documents = [
    { name: 'Estimate', pages: 11, type: 'estimate' },
    { name: 'Roof Report', pages: 12, type: 'roof_report' },
  ];

  return (
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-32 bg-zinc-50 dark:bg-zinc-950'>
      {/* Consolidated Header Section */}
      <div className='mb-8'>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2'>
            {jobData.customerName}
          </h1>
          <div className='flex items-center gap-2 text-zinc-500 dark:text-zinc-400'>
            <MapPin className='h-4 w-4' />
            <span>{jobData.propertyAddress}</span>
          </div>
        </div>

        {/* Single consolidated insurance & claim info section */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          {/* Insurance Information */}
          <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                <Building className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              </div>
              <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                Insurance Details
              </h3>
            </div>
            <div className='space-y-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Carrier:
                </span>
                <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                  {jobData.insuranceCarrier}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Claim Rep:
                </span>
                <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                  {jobData.claimRep}
                  {discrepantFields.includes('claimRep') ? ' *' : ''}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Estimator:
                </span>
                <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                  {jobData.estimator || '—'}
                  {discrepantFields.includes('estimator') ? ' *' : ''}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Claim #:
                </span>
                <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                  {jobData.claimNumber}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Policy #:
                </span>
                <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                  {jobData.policyNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Claim Information */}
          <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30'>
                <Calendar className='h-5 w-5 text-amber-600 dark:text-amber-400' />
              </div>
              <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                Claim Information
              </h3>
            </div>
            <div className='space-y-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Date of Loss:
                </span>
                <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                  {new Date(jobData.dateOfLoss).toLocaleDateString()}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Original Estimate:
                </span>
                <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                  ${jobData.totalEstimateValue.toLocaleString()}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Potential Supplement:
                </span>
                <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                  +${supplementTotal.toLocaleString()}
                </span>
              </div>
              <div className='flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Total Value:
                </span>
                <span className='font-bold text-zinc-900 dark:text-zinc-100'>
                  $
                  {(
                    jobData.totalEstimateValue + supplementTotal
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Analysis Status */}
          <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30'>
                  <Shield className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                </div>
                <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                  Analysis Status
                </h3>
              </div>
              <Badge className={statusConfig.color}>
                <StatusIcon className='w-3 h-3 mr-1.5' />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Document List */}
            <div className='mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700'>
              <h4 className='text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2'>
                Document Evidence
              </h4>
              <div className='space-y-2'>
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between text-sm'
                  >
                    <div className='flex items-center gap-2'>
                      <FileText className='h-4 w-4 text-zinc-400' />
                      <span className='text-zinc-700 dark:text-zinc-300'>
                        {doc.name}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-zinc-500 dark:text-zinc-400'>
                        {doc.pages} pages
                      </span>
                      <button
                        onClick={() => handleDownload(doc.type, doc.name)}
                        className='p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
                        title={`Download ${doc.name}`}
                      >
                        <Download className='h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-3 text-sm mb-4'>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Issues Found:
                </span>
                <span className='font-semibold text-red-600 dark:text-red-400'>
                  {stats.needsSupplement}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Compliant Rules:
                </span>
                <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                  {stats.compliant}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={onStartReview}
              disabled={buttonConfig.disabled}
              className='w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Play className='mr-2 h-4 w-4' />
              {buttonConfig.label}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left Column - Business Rules Analysis (Moved Up) */}
        <div className='lg:col-span-2 space-y-8'>
          <div className='rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
            <div className='px-6 py-5 border-b border-zinc-200 dark:border-zinc-800'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
                    Business Rules Analysis
                  </h2>
                  <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                    Review supplement recommendations and compliance issues
                  </p>
                </div>
                {/* Start Review button moved to Analysis Status card */}
              </div>
            </div>

            <div className='p-6'>
              <div className='space-y-4'>
                {ruleAnalysis.map(rule => {
                  const getRuleTitle = (ruleName: string) => {
                    const titles = {
                      ridge_cap: 'Hip/Ridge Cap Quality',
                      starter_strip: 'Starter Strip Quality',
                      drip_edge: 'Drip Edge & Gutter Apron',
                      ice_water_barrier: 'Ice & Water Barrier',
                    };
                    return titles[ruleName as keyof typeof titles] || ruleName;
                  };

                  const getStatusConfig = (ruleObj: RuleAnalysisResult) => {
                    const status = ruleObj.status;
                    const isIceWaterPartial =
                      ruleObj.ruleName === 'ice_water_barrier' &&
                      status === 'SUPPLEMENT_NEEDED' &&
                      Boolean(ruleObj.currentSpecification);

                    if (status === 'COMPLIANT') {
                      return {
                        icon: CheckCircle,
                        iconColor: 'text-emerald-600 dark:text-emerald-400',
                        bgClass:
                          'hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-l-4 border-l-emerald-400',
                      };
                    }

                    if (isIceWaterPartial) {
                      return {
                        icon: AlertTriangle,
                        iconColor: 'text-amber-600 dark:text-amber-400',
                        bgClass:
                          'hover:bg-amber-50 dark:hover:bg-amber-950/20 border-l-4 border-l-amber-400',
                      };
                    }

                    if (status === 'SUPPLEMENT_NEEDED') {
                      return {
                        icon: AlertTriangle,
                        iconColor: 'text-red-600 dark:text-red-400',
                        bgClass:
                          'hover:bg-red-50 dark:hover:bg-red-950/20 border-l-4 border-l-red-400',
                      };
                    }

                    return {
                      icon: Clock,
                      iconColor: 'text-amber-600 dark:text-amber-400',
                      bgClass:
                        'hover:bg-amber-50 dark:hover:bg-amber-950/20 border-l-4 border-l-amber-400',
                    };
                  };

                  const statusConfig = getStatusConfig(rule);
                  const StatusIcon = statusConfig.icon;

                  const ruleSlug = getRuleSlug(rule.ruleName);

                  return (
                    <div
                      key={rule.ruleName}
                      className={`flex items-center justify-between p-5 rounded-lg border border-zinc-200 transition-colors dark:border-zinc-700 ${statusConfig.bgClass}`}
                    >
                      <div className='flex items-center gap-4 min-w-0 flex-1'>
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                            rule.status === 'COMPLIANT'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : rule.status === 'SUPPLEMENT_NEEDED'
                                ? 'bg-red-100 dark:bg-red-900/30'
                                : 'bg-amber-100 dark:bg-amber-900/30'
                          }`}
                        >
                          <StatusIcon
                            className={`h-6 w-6 ${statusConfig.iconColor}`}
                          />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                              {getRuleTitle(rule.ruleName)}
                            </h3>
                            {rule.ruleName === 'ice_water_barrier' &&
                              rule.status === 'SUPPLEMENT_NEEDED' &&
                              Boolean(rule.currentSpecification) && (
                                <Badge className='bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'>
                                  Partial
                                </Badge>
                              )}
                          </div>
                          <p className='text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2'>
                            {rule.reasoning}
                          </p>
                          {rule.status === 'SUPPLEMENT_NEEDED' &&
                            rule.costImpact > 0 && (
                              <p className='text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2'>
                                +${rule.costImpact.toLocaleString()} supplement
                                opportunity
                              </p>
                            )}
                        </div>
                      </div>

                      <div className='flex items-center gap-3'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            router.push(`/job/${jobData.id}/${ruleSlug}`)
                          }
                          className='gap-2'
                        >
                          View Details
                          <ExternalLink className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Roof Measurements Summary */}
          <div className='rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
            <div className='px-6 py-4 border-b border-zinc-200 dark:border-zinc-800'>
              <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                📐 Roof Measurements
              </h3>
            </div>
            <div className='p-6'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6'>
                {/* Top Row */}
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Total Area
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {roofMeasurements.totalArea} SF
                  </div>
                </div>
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Squares
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {roofMeasurements.totalSquares}
                  </div>
                </div>
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Pitch
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {roofMeasurements.pitch}
                  </div>
                </div>
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Stories
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {roofMeasurements.stories}
                  </div>
                </div>

                {/* Bottom Row */}
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Drip Edge (total)
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {Number(roofMeasurements.eavesLength || 0) +
                      Number(roofMeasurements.rakesLength || 0)}{' '}
                    LF
                  </div>
                  <div className='text-xs text-zinc-500 mt-1'>
                    Eaves: {roofMeasurements.eavesLength ?? '—'} • Rakes:{' '}
                    {roofMeasurements.rakesLength ?? '—'}
                  </div>
                </div>
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Ridges/Hips (total)
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {roofMeasurements.ridgesLength} LF
                  </div>
                  {(roofMeasurements as any).ridgeLength !== undefined ||
                  (roofMeasurements as any).hipsLength !== undefined ? (
                    <div className='text-xs text-zinc-500 mt-1'>
                      Ridges: {(roofMeasurements as any).ridgeLength ?? '—'} •
                      Hips: {(roofMeasurements as any).hipsLength ?? '—'}
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className='text-sm text-zinc-500 dark:text-zinc-400 mb-1'>
                    Valleys
                  </div>
                  <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {roofMeasurements.valleysLength} LF
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Extraction Notes Card */}
          {validationNotes.length > 0 && (
            <div className='rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 mt-6'>
              <div className='px-6 py-4 border-b border-zinc-200 dark:border-zinc-800'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30'>
                    <svg
                      className='h-3 w-3 text-amber-600 dark:text-amber-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth={1.5}
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10'
                      />
                    </svg>
                  </div>
                  <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    📝 Extraction Notes
                  </h3>
                </div>
              </div>
              <div className='p-6'>
                <div className='space-y-3'>
                  {validationNotes.map((note, i) => {
                    // Clean up the note text
                    const cleanNote = note.replace(/^\*\s*/, '').trim();

                    // Check if it's a structured note (contains: colon pattern)
                    const isStructured = cleanNote.includes(': Phase ');

                    if (isStructured) {
                      // Parse structured notes like "customerName: Phase 1 = "GARRISON, MARY", Phase 2 = "Smith, Joe & Jane | Estimate: | 00-0000-000 |""
                      const [field, phases] = cleanNote.split(': ');
                      return (
                        <div key={i} className='text-sm'>
                          <div className='font-medium text-zinc-700 dark:text-zinc-300 mb-2'>
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                          </div>
                          <div className='ml-4 space-y-1'>
                            {phases.split(', Phase ').map((phase, j) => {
                              const cleanPhase =
                                j === 0 ? phase : 'Phase ' + phase;
                              return (
                                <div
                                  key={j}
                                  className='font-mono text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2 text-zinc-600 dark:text-zinc-400'
                                >
                                  {cleanPhase}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      // Simple note format
                      return (
                        <div
                          key={i}
                          className='flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400'
                        >
                          <div className='w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 mt-2 flex-shrink-0' />
                          <span>{cleanNote}</span>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Chat */}
        <div className='lg:col-span-1'>
          <ChatBox jobId={jobData.id} />
        </div>
      </div>
    </div>
  );
}
