import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  X,
  Calculator,
  ChevronRight,
} from 'lucide-react';

import { RuleAnalysisResult } from '../../types';
import { EvidenceChip } from '../ui/evidence-chip';
import { SupplementNote } from '../ui/supplement-note';
import { RuleActionButtons } from '../ui/rule-action-buttons';
import { RuleStatusBadge } from '../ui/rule-status-badge';

interface Evidence {
  id?: string;
  label?: string;
  value?: string | number | null;
  docType: 'estimate' | 'report' | 'roof_report';
  page: number;
  textMatch?: string;
  score?: number;
}

interface IceWaterBarrierCardProps {
  ruleAnalysis: RuleAnalysisResult;
  evidence?: Evidence[];
  onDecision: (
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => void;
  onJumpToEvidence?: (
    docType: 'estimate' | 'roof_report' | 'report',
    page: number,
    textMatch?: string
  ) => void;
}

export function IceWaterBarrierCardV2({
  ruleAnalysis,
  evidence = [],
  onDecision,
  onJumpToEvidence,
}: IceWaterBarrierCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');
  const [showCalculation, setShowCalculation] = useState(true);
  const [expandedCompliant, setExpandedCompliant] = useState(false);

  // Helper for safe display (no mock values)
  const display = (v?: string | number | null) =>
    v === undefined || v === null || v === '' ? '---' : String(v);
  const num = (v?: number | null, unit?: string) =>
    v === undefined || v === null || isNaN(Number(v))
      ? '---'
      : `${Number(v).toLocaleString()}${unit ? ` ${unit}` : ''}`;

  // Estimate fields from analysis
  const analysisData = ruleAnalysis as any;
  const currentCode = display(analysisData?.currentSpecification?.code);
  const currentDesc = display(analysisData?.currentSpecification?.description);
  const currentQuantity = display(
    analysisData?.currentSpecification?.quantity ||
      analysisData?.estimateQuantity
  );
  const currentRate = display(analysisData?.currentSpecification?.rate);
  const currentTotal = display(analysisData?.currentSpecification?.total);

  // Calculation details (dynamic from analyzer)
  const calc = analysisData?.calculationDetails || {};
  const totalEaves = num(calc.totalEaves, 'LF');
  const soffitDepth = display(
    calc.soffitDepth !== undefined && calc.soffitDepth !== null
      ? `${calc.soffitDepth}"`
      : undefined
  );
  const wallThickness = display(
    calc.wallThickness !== undefined && calc.wallThickness !== null
      ? `${calc.wallThickness}"`
      : undefined
  );
  const roofPitch = display(calc.roofPitch);
  const calculatedWidth = display(
    calc.requiredWidth !== undefined && calc.requiredWidth !== null
      ? `${calc.requiredWidth}"`
      : undefined
  );
  const requiredQuantity = num(calc.calculatedCoverage, 'SF');
  const unitPrice = analysisData?.unitPrice as number | null | undefined;
  const additionalCost = ruleAnalysis.costImpact;
  const recommendation = display(analysisData?.supplementRecommendation);
  const documentationNote = display(analysisData?.documentationNote);

  // Dynamic supplement note
  const dynamicSupplementNote =
    documentationNote !== '---'
      ? documentationNote
      : `Ice & Water barrier is required per IRC R905.1.2 for proper protection at eaves and valleys. Current specification ${
          currentDesc !== '---'
            ? `includes ${currentDesc}`
            : 'does not include adequate coverage'
        }. Required coverage: ${requiredQuantity} at eaves based on ${totalEaves} total eave length.`;

  // Find relevant evidence
  const iceWaterEvidence = evidence.find(
    e =>
      e.textMatch?.toLowerCase().includes('ice') ||
      e.textMatch?.toLowerCase().includes('water barrier') ||
      e.label?.toLowerCase().includes('ice & water')
  );

  const getStatusIcon = () => {
    return ruleAnalysis.status === 'SUPPLEMENT_NEEDED'
      ? AlertTriangle
      : CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  // Map status to our standardized badge types
  const getRuleStatus = () => {
    if (ruleAnalysis.status === 'COMPLIANT') return 'compliant';
    const hasCurrentSpec = Boolean(analysisData?.currentSpecification);
    if (ruleAnalysis.status === 'SUPPLEMENT_NEEDED' && hasCurrentSpec)
      return 'partial';
    return 'needs-supplement';
  };

  if (ruleAnalysis.status === 'COMPLIANT') {
    return (
      <div className='rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50'>
        <div className='p-6'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-start gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30'>
                <CheckCircle className='h-6 w-6 text-emerald-600 dark:text-emerald-400' />
              </div>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-emerald-900 dark:text-emerald-100'>
                  Ice & Water Barrier
                </h2>
                <p className='text-sm text-emerald-700 dark:text-emerald-300'>
                  Coverage meets IRC R905.1.2 requirements
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <RuleStatusBadge status='compliant' />
            </div>
          </div>

          {
            <div className='mt-4 pt-4 border-t border-emerald-200/70 dark:border-emerald-800/70 space-y-4'>
              {/* Evidence */}
              <div>
                <div className='text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1'>
                  Evidence
                </div>
                <div className='flex flex-wrap gap-2'>
                  {Array.isArray(evidence) && evidence.length > 0 ? (
                    evidence.map((ev, idx) => (
                      <EvidenceChip
                        key={idx}
                        docType={(ev?.docType as any) || 'estimate'}
                        page={Number(ev?.page) || 1}
                        label={ev?.label}
                        onClick={() =>
                          onJumpToEvidence?.(
                            (ev?.docType as any) || 'estimate',
                            Number(ev?.page) || 1,
                            ev?.textMatch
                          )
                        }
                      />
                    ))
                  ) : (
                    <span className='text-xs text-emerald-700/80 dark:text-emerald-300/80'>
                      ---
                    </span>
                  )}
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <div className='text-xs text-emerald-700 dark:text-emerald-300 mb-1'>
                  Reasoning
                </div>
                <div className='text-sm text-emerald-900 dark:text-emerald-100'>
                  {display((ruleAnalysis as any)?.reasoning)}
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    );
  }

  return (
    <div className='border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900'>
      {/* Header */}
      <div className='flex items-start justify-between p-6 pb-4'>
        <div className='flex items-start gap-3'>
          <StatusIcon className='h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400' />
          <div>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
              Ice & Water Barrier Analysis
            </h3>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              Code compliance verification for eave protection
            </p>
          </div>
        </div>
        <RuleStatusBadge status={getRuleStatus()} />
      </div>

      <div className='px-6 pb-6 space-y-6'>
        {/* Code Requirement */}
        <div className='rounded-lg border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50'>
          <div className='p-4'>
            <div className='flex items-start gap-3'>
              <X className='h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
              <div className='flex-1 space-y-3'>
                <h3 className='font-semibold text-amber-900 dark:text-amber-100'>
                  Code Requirement
                </h3>
                <p className='text-sm text-amber-800 dark:text-amber-200'>
                  IRC R905.1.2: Ice barrier required from eave edge to 24&quot;
                  inside exterior wall
                </p>
                <p className='text-sm text-amber-700 dark:text-amber-300'>
                  {ruleAnalysis.reasoning}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Specification */}
        {currentDesc !== '---' && (
          <div className='rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'>
              <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                Current Specification
              </h3>
            </div>
            <div className='p-4'>
              <div className='space-y-3'>
                <div className='text-sm'>
                  <div className='flex items-center justify-between'>
                    <span className='text-zinc-500 dark:text-zinc-400'>
                      Code:
                    </span>
                    <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                      {currentCode}
                    </span>
                  </div>
                  <p className='font-medium text-zinc-900 dark:text-zinc-100 mt-1'>
                    {currentDesc}
                  </p>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-zinc-500 dark:text-zinc-400'>
                    Quantity:
                  </span>
                  <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                    {currentQuantity}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-zinc-500 dark:text-zinc-400'>
                    Rate:
                  </span>
                  <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                    {currentRate}
                  </span>
                </div>
                <div className='flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700'>
                  <div className='flex items-center gap-2'>
                    {onJumpToEvidence && iceWaterEvidence ? (
                      <EvidenceChip
                        docType={iceWaterEvidence.docType}
                        page={iceWaterEvidence.page}
                        onClick={() =>
                          onJumpToEvidence(
                            iceWaterEvidence.docType,
                            iceWaterEvidence.page,
                            iceWaterEvidence.textMatch
                          )
                        }
                      />
                    ) : (
                      <span className='text-xs text-gray-400'>
                        Evidence: ---
                      </span>
                    )}
                  </div>
                  <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {currentTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculation Details */}
        <div className='rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50'>
          <div className='px-4 py-3 border-b border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900/50'>
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold text-blue-900 dark:text-blue-100'>
                Required Coverage Calculation
              </h3>
              <button
                onClick={() => setShowCalculation(!showCalculation)}
                className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 flex items-center gap-1'
              >
                <Calculator className='h-4 w-4' />
                {showCalculation ? 'Hide' : 'Show'} Details
              </button>
            </div>
          </div>
          <div className='p-4'>
            {showCalculation ? (
              <div className='space-y-3 text-sm'>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-blue-600 dark:text-blue-400'>
                      Total Eaves:
                    </span>
                    <span className='font-mono text-blue-900 dark:text-blue-100'>
                      {totalEaves}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-blue-600 dark:text-blue-400'>
                      Soffit Depth:
                    </span>
                    <span className='font-mono text-blue-900 dark:text-blue-100'>
                      {soffitDepth}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-blue-600 dark:text-blue-400'>
                      Wall Thickness:
                    </span>
                    <span className='font-mono text-blue-900 dark:text-blue-100'>
                      {wallThickness}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-blue-600 dark:text-blue-400'>
                      Roof Pitch:
                    </span>
                    <span className='font-mono text-blue-900 dark:text-blue-100'>
                      {roofPitch}
                    </span>
                  </div>
                  <div className='flex justify-between font-medium pt-2 border-t border-blue-200 dark:border-blue-700'>
                    <span className='text-blue-700 dark:text-blue-300'>
                      Required Width:
                    </span>
                    <span className='font-mono text-blue-900 dark:text-blue-100'>
                      {calculatedWidth}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className='space-y-3'>
                <p className='text-sm text-blue-700 dark:text-blue-300'>
                  {recommendation !== '---'
                    ? recommendation
                    : 'Ice & Water barrier required per code'}
                </p>
                <div className='flex justify-between text-sm'>
                  <span className='text-blue-600 dark:text-blue-400'>
                    Required Coverage:
                  </span>
                  <span className='font-mono text-blue-900 dark:text-blue-100'>
                    {requiredQuantity}
                  </span>
                </div>
                {unitPrice !== undefined && unitPrice !== null && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-blue-600 dark:text-blue-400'>
                      Unit Price:
                    </span>
                    <span className='font-mono text-blue-900 dark:text-blue-100'>
                      ${unitPrice.toFixed(2)}/SF
                    </span>
                  </div>
                )}
                <div className='pt-3 border-t border-blue-200 dark:border-blue-800'>
                  <div className='flex justify-between items-center'>
                    <span className='font-semibold text-blue-900 dark:text-blue-100'>
                      Additional Cost:
                    </span>
                    <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                      +${additionalCost ? additionalCost.toFixed(2) : '---'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decision Section */}
        {!ruleAnalysis.userDecision ? (
          <div className='space-y-4'>
            <SupplementNote
              value={notes}
              onChange={setNotes}
              dynamicNote={dynamicSupplementNote}
            />

            <RuleActionButtons
              onReject={() => onDecision('rejected', notes)}
              onApprove={() => onDecision('accepted', notes)}
            />
          </div>
        ) : (
          <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                Decision Recorded
              </span>
              <span
                className={`text-sm font-medium ${
                  ruleAnalysis.userDecision === 'accepted'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {ruleAnalysis.userDecision === 'accepted'
                  ? 'Accepted'
                  : 'Rejected'}
              </span>
            </div>
            {ruleAnalysis.userNotes && (
              <p className='text-sm text-zinc-600 dark:text-zinc-400 italic'>
                &quot;{ruleAnalysis.userNotes}&quot;
              </p>
            )}
            {ruleAnalysis.userDecision === 'accepted' && additionalCost && (
              <div className='mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                    Added to supplement:
                  </span>
                  <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                    +${additionalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
