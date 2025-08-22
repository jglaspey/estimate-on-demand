import {
  AlertTriangle,
  ExternalLink,
  Copy,
  Plus,
  ChevronDown,
  CheckCircle,
  X,
  Edit,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

interface RidgeCapData {
  // Existing fields
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
  // Decision tracking
  userDecision?: 'accepted' | 'rejected' | 'modified';
  userNotes?: string;
}

interface RidgeCapAnalysisProps {
  ruleNumber: number;
  totalRules: number;
  ridgeCapData?: RidgeCapData;
  showHighlighting?: boolean;
  evidenceReferences?: string[];
  evidence?: Array<{
    id?: string;
    label?: string;
    value?: string | number | null;
    docType: 'estimate' | 'report' | 'roof_report';
    page: number;
    textMatch?: string;
    score?: number;
  }>;
  onJumpToEvidence?: (
    docType: 'estimate' | 'roof_report' | 'report',
    page: number,
    textMatch?: string
  ) => void;
  onDecision?: (
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => void;
}

export function RidgeCapAnalysis({
  ruleNumber,
  totalRules,
  ridgeCapData,
  showHighlighting = true,
  evidenceReferences = [],
  evidence = [],
  onJumpToEvidence,
  onDecision,
}: RidgeCapAnalysisProps) {
  const [notes, setNotes] = useState(ridgeCapData?.userNotes || '');
  const [justificationCopied, setJustificationCopied] = useState(false);

  // Evidence helpers parsed from provided references (prefer typed evidence)
  const findEstimatePage = (): { page: number | null; text?: string } => {
    const typed = (evidence || []).find(
      e => e.docType === 'estimate' || e.docType === 'report'
    );
    if (typed?.page) return { page: typed.page, text: typed.textMatch };
    const list = Array.isArray(evidenceReferences) ? evidenceReferences : [];
    const ref =
      list.find(r => /ridge cap line item/i.test(String(r))) ||
      list.find(
        r => /estimate/i.test(String(r)) && /page\s*\d+/i.test(String(r))
      ) ||
      null;
    if (!ref) return { page: null, text: undefined };
    const m = String(ref).match(/page\s*(\d+)/i);
    return {
      page: m ? Math.max(1, parseInt(m[1], 10)) : null,
      text: undefined,
    };
  };

  const findReportPages = (): {
    ridges: { page: number | null; text?: string };
    hips: { page: number | null; text?: string };
  } => {
    const pages = {
      ridges: {
        page: null as number | null,
        text: undefined as string | undefined,
      },
      hips: {
        page: null as number | null,
        text: undefined as string | undefined,
      },
    };
    const typedRidge = (evidence || []).find(
      e =>
        (e.docType === 'roof_report' || e.docType === 'report') &&
        /ridge/i.test(String(e.label))
    );
    const typedHip = (evidence || []).find(
      e =>
        (e.docType === 'roof_report' || e.docType === 'report') &&
        /hip/i.test(String(e.label))
    );

    if (typedRidge)
      pages.ridges = { page: typedRidge.page, text: typedRidge.textMatch };
    if (typedHip)
      pages.hips = { page: typedHip.page, text: typedHip.textMatch };
    const list = Array.isArray(evidenceReferences) ? evidenceReferences : [];
    const rr = list.filter(
      r =>
        /roof|eagleview|report/i.test(String(r)) ||
        /measurements/i.test(String(r))
    );
    rr.forEach(r => {
      const m = String(r).match(/page\s*(\d+)/i);
      const p = m ? Math.max(1, parseInt(m[1], 10)) : null;
      if (/ridge/i.test(String(r)) && p && pages.ridges.page == null)
        pages.ridges = { page: p, text: undefined };
      if (/hip/i.test(String(r)) && p && pages.hips.page == null)
        pages.hips = { page: p, text: undefined };
      if (!/ridge|hip/i.test(String(r)) && p && pages.ridges.page == null)
        pages.ridges = { page: p, text: undefined }; // fallback
    });
    return pages;
  };

  const { page: estimatePage, text: estimateMatch } = findEstimatePage();
  const { ridges: reportRidge, hips: reportHip } = findReportPages();
  const reportRidgePage = reportRidge.page;
  const reportHipPage = reportHip.page;

  // Copy justification to clipboard
  const copyJustification = async () => {
    try {
      await navigator.clipboard.writeText(documentationNote);
      setJustificationCopied(true);
      setTimeout(() => setJustificationCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Calculate values with clean fallbacks (no mock numbers)
  const display = (v?: string | number | null, fallback: string = '---') =>
    v === undefined || v === null || v === ''
      ? fallback
      : typeof v === 'number'
        ? String(v)
        : v;
  const estimateQty = display(ridgeCapData?.estimateQuantity);
  const requiredQty = display(ridgeCapData?.requiredQuantity);
  const variance = display(ridgeCapData?.variance);
  const costImpact =
    typeof ridgeCapData?.costImpact === 'number'
      ? ridgeCapData!.costImpact
      : undefined;
  const ridgeLength =
    typeof ridgeCapData?.ridgeLength === 'number'
      ? ridgeCapData!.ridgeLength
      : 0;
  const hipLength =
    typeof ridgeCapData?.hipLength === 'number' ? ridgeCapData!.hipLength : 0;
  const unitPrice = display(ridgeCapData?.estimateUnitPrice);
  const isCompliant = ridgeCapData?.complianceStatus === 'compliant';
  const lineItemCode = display(ridgeCapData?.lineItemCode);
  const lineItemDescription = display(ridgeCapData?.lineItemDescription);
  const documentationNote = display(ridgeCapData?.documentationNote);

  // Enhanced display values
  const roofShingleType = ridgeCapData?.roofShingleType || 'laminate';
  const ridgeCapSpecification =
    ridgeCapData?.ridgeCapSpecification || 'cut-from-3-tab';
  const quantityMatch = ridgeCapData?.quantityMatch !== false;
  const astmCompliance = ridgeCapData?.astmCompliance || 'ASTM D3161/D7158';

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
            Ridge/Cap Analysis
          </h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
            Verify compliance and quantity requirements
          </p>
        </div>
        <div className='text-sm text-zinc-500 dark:text-zinc-400'>
          Rule {ruleNumber} of {totalRules}
        </div>
      </div>

      {/* Main Analysis Card */}
      <Card className='border-zinc-200 dark:border-zinc-700'>
        <CardContent className='p-6 space-y-6'>
          {/* Roof Type Identification */}
          <div className='pb-4 border-b border-zinc-200 dark:border-zinc-700'>
            <div className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
              Roof Type:{' '}
              <span className='font-semibold text-blue-600 dark:text-blue-400'>
                {roofShingleType === 'laminate'
                  ? 'Laminate Composition'
                  : '3-Tab Shingle'}
              </span>
            </div>
          </div>

          {/* Current Specification */}
          <div>
            <div className='text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3'>
              Current Estimate Specification
            </div>
            <div className='space-y-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                    • {lineItemDescription}
                  </div>
                  <div className='text-xs text-zinc-600 dark:text-zinc-400 mt-1'>
                    • {estimateQty} @ {unitPrice} ={' '}
                    {display(ridgeCapData?.estimateTotal)}
                  </div>
                </div>
                {onJumpToEvidence && estimatePage ? (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const estimateEvidence = (evidence || []).find(
                        e => e.docType === 'estimate'
                      );
                      onJumpToEvidence(
                        'estimate',
                        estimatePage,
                        estimateEvidence?.textMatch || 'Hip / Ridge cap'
                      );
                    }}
                    className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 ml-2 whitespace-nowrap cursor-pointer'
                    type='button'
                  >
                    <ExternalLink className='h-3 w-3' />
                    {`Estimate p.${estimatePage}`}
                  </button>
                ) : (
                  <span className='text-xs text-gray-400'>Evidence: ---</span>
                )}
              </div>
            </div>
          </div>

          {/* Required Measurement with breakdown */}
          <div>
            <div className='text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3'>
              Required Ridge Cap from Roof Report
            </div>
            <div className='space-y-3'>
              {/* Ridge and Hip breakdown */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-zinc-600 dark:text-zinc-400'>
                    Ridges:
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                      {ridgeLength ? `${ridgeLength.toFixed(2)} LF` : '---'}
                    </span>
                    {onJumpToEvidence && reportRidgePage ? (
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          const ridgeEvidence = (evidence || []).find(
                            e =>
                              (e.docType === 'roof_report' ||
                                e.docType === 'report') &&
                              /ridge/i.test(String(e.label))
                          );
                          onJumpToEvidence(
                            'roof_report',
                            reportRidgePage,
                            ridgeEvidence?.textMatch || 'Ridges'
                          );
                        }}
                        className='text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer'
                        title={`Jump to roof report page ${reportRidgePage} - Ridge measurements`}
                        type='button'
                      >
                        <ExternalLink className='h-3 w-3' />
                      </button>
                    ) : (
                      <span className='text-xs text-gray-400'>---</span>
                    )}
                  </div>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-zinc-600 dark:text-zinc-400'>
                    Hips:
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                      {hipLength ? `${hipLength.toFixed(2)} LF` : '---'}
                    </span>
                    {onJumpToEvidence && reportHipPage ? (
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          const hipEvidence = (evidence || []).find(
                            e =>
                              (e.docType === 'roof_report' ||
                                e.docType === 'report') &&
                              /hip/i.test(String(e.label))
                          );
                          onJumpToEvidence(
                            'roof_report',
                            reportHipPage,
                            hipEvidence?.textMatch || 'Hips'
                          );
                        }}
                        className='text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer'
                        title={`Jump to roof report page ${reportHipPage} - Hip measurements`}
                        type='button'
                      >
                        <ExternalLink className='h-3 w-3' />
                      </button>
                    ) : (
                      <span className='text-xs text-gray-400'>---</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total with comparison */}
              <div className='pt-2 border-t border-zinc-200 dark:border-zinc-700'>
                <div className='flex items-center justify-between'>
                  <div>
                    <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                      Total Required:
                    </span>
                    <span className='ml-2 font-semibold text-zinc-900 dark:text-zinc-100'>
                      {requiredQty}
                    </span>
                  </div>
                  {quantityMatch ? (
                    <div className='flex items-center gap-1 text-green-600 dark:text-green-400'>
                      <CheckCircle className='h-4 w-4' />
                      <span className='text-xs font-medium'>
                        Quantity matches
                      </span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-1 text-amber-600 dark:text-amber-400'>
                      <AlertTriangle className='h-4 w-4' />
                      <span className='text-xs font-medium'>
                        Shortage: {variance}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Status */}
          <div
            className={`p-4 rounded-lg border ${
              isCompliant
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}
          >
            <div className='flex items-start gap-3'>
              {isCompliant ? (
                <CheckCircle className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5' />
              ) : (
                <AlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400 mt-0.5' />
              )}
              <div className='flex-1'>
                <div
                  className={`font-semibold mb-1 ${
                    isCompliant
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}
                >
                  {isCompliant ? 'Compliant' : 'COMPLIANCE ISSUE'}
                </div>
                {!isCompliant &&
                  roofShingleType === 'laminate' &&
                  ridgeCapSpecification === 'cut-from-3-tab' && (
                    <div className='text-sm text-red-700 dark:text-red-300'>
                      Laminate roofs require purpose-built ridge caps (
                      {astmCompliance})
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Supplement Calculation (when non-compliant) */}
          {!isCompliant && (
            <div className='bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
              <div className='text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3'>
                Recommended Change
              </div>
              <div className='space-y-2'>
                <div className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                  • Purpose-built ridge cap
                </div>
                <div className='text-sm text-zinc-600 dark:text-zinc-400'>
                  • {requiredQty}
                </div>
                <div className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                  {costImpact !== undefined
                    ? `Supplement: +$${costImpact.toFixed(2)}`
                    : 'Supplement: ---'}
                </div>
              </div>
            </div>
          )}

          {/* Decision Section */}
          {!ridgeCapData?.userDecision ? (
            <>
              {/* Notes Section */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                  Additional Notes (Optional)
                </label>
                <Textarea
                  placeholder='Add any custom notes for this supplement...'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className='min-h-[60px] text-sm border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                />
              </div>

              {/* Decision Buttons */}
              <div className='flex gap-2 pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='flex-1'
                  onClick={copyJustification}
                >
                  <Copy className='h-3.5 w-3.5 mr-1.5' />
                  {justificationCopied ? 'Copied!' : 'Copy Note'}
                </Button>
                {onDecision && (
                  <>
                    <Button
                      size='sm'
                      className='flex-1 bg-green-600 hover:bg-green-700 text-white'
                      onClick={() => onDecision('accepted', notes)}
                    >
                      <CheckCircle className='h-3.5 w-3.5 mr-1.5' />
                      Accept
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
                      onClick={() => onDecision('rejected', notes)}
                    >
                      <X className='h-3.5 w-3.5 mr-1.5' />
                      Reject
                    </Button>
                    <Button
                      size='sm'
                      className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'
                      onClick={() => onDecision('modified', notes)}
                    >
                      <Edit className='h-3.5 w-3.5 mr-1.5' />
                      Modify
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Decision Made */
            <div className='rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/50'>
              <div className='flex items-center gap-3'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50'>
                  <CheckCircle className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-indigo-900 dark:text-indigo-100'>
                    Decision:{' '}
                    {ridgeCapData.userDecision.charAt(0).toUpperCase() +
                      ridgeCapData.userDecision.slice(1)}
                  </p>
                  {ridgeCapData.userNotes && (
                    <p className='text-sm text-indigo-700 dark:text-indigo-300 mt-1'>
                      {ridgeCapData.userNotes}
                    </p>
                  )}
                  {ridgeCapData.userDecision === 'accepted' &&
                    costImpact !== undefined && (
                      <p className='text-sm text-indigo-700 dark:text-indigo-300 mt-1'>
                        Added +${costImpact.toFixed(2)} to supplement
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Stack Section - Expandable details */}
      <details className='group'>
        <summary className='cursor-pointer flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors'>
          <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
            Evidence Stack
          </span>
          <ChevronDown className='h-4 w-4 text-zinc-500 group-open:rotate-180 transition-transform' />
        </summary>
        <div className='mt-2 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-4'>
          {/* Calculation details */}
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>
                Roof report: Ridges
              </span>
              <span className='font-medium'>{ridgeLength.toFixed(2)} LF</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>
                Roof report: Hips
              </span>
              <span className='font-medium'>{hipLength.toFixed(2)} LF</span>
            </div>
            <Separator className='my-2' />
            <div className='flex justify-between font-semibold'>
              <span>Total Required</span>
              <span>{(ridgeLength + hipLength).toFixed(2)} LF</span>
            </div>
          </div>

          {/* Estimate line item details */}
          <div className='pt-2 border-t border-zinc-200 dark:border-zinc-700'>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
              Estimate Line Item
            </div>
            <div className='text-sm font-mono text-zinc-700 dark:text-zinc-300'>
              {lineItemCode} - {lineItemDescription}
            </div>
          </div>

          {/* ASTM Note */}
          <div className='pt-2 border-t border-zinc-200 dark:border-zinc-700'>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
              Documentation Note
            </div>
            <div className='text-sm text-zinc-600 dark:text-zinc-400 italic'>
              {documentationNote}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
