import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

import { EvidenceChip } from '../ui/evidence-chip';
import { SupplementNote } from '../ui/supplement-note';
import { RuleActionButtons } from '../ui/rule-action-buttons';
import { RuleStatusBadge } from '../ui/rule-status-badge';

// Define the interface to match existing pattern
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

interface Evidence {
  id?: string;
  label?: string;
  value?: string | number | null;
  docType: 'estimate' | 'report' | 'roof_report';
  page: number;
  textMatch?: string;
  score?: number;
}

interface DripEdgeGutterApronCardProps {
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

export function DripEdgeGutterApronCardV2({
  ruleAnalysis,
  evidence = [],
  onDecision,
  onJumpToEvidence,
}: DripEdgeGutterApronCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis?.userNotes || '');

  // Real values from analysis with sensible fallbacks
  const a = (ruleAnalysis as any) || {};
  const dripEdgePresent: boolean = Boolean(a.dripEdgePresent);
  const gutterApronPresent: boolean = Boolean(a.gutterApronPresent);
  const display = (v?: string | number | null) =>
    v === undefined || v === null || v === '' ? '---' : String(v);

  const dripEdgeQty: string = dripEdgePresent
    ? display(a.dripEdgeQuantity)
    : '---';
  const dripEdgePrice: string = dripEdgePresent
    ? display(a.dripEdgeUnitPrice)
    : '---';
  const dripEdgeTotal: string = dripEdgePresent
    ? display(a.dripEdgeTotal)
    : '---';
  const requiredRakeLength: string = display(a.requiredRakeLength);
  const requiredEaveLength: string = display(a.requiredEaveLength);
  const gutterApronPrice: string = display(a.gutterApronUnitPrice);
  const additionalCostValue =
    typeof ruleAnalysis.costImpact === 'number' && ruleAnalysis.costImpact > 0
      ? ruleAnalysis.costImpact
      : undefined;

  // Map status to our standardized badge types
  const getRuleStatus = () => {
    if (ruleAnalysis.status === 'COMPLIANT') return 'compliant';
    if (a.complianceStatus === 'partial') return 'partial';
    return 'needs-supplement';
  };

  // Dynamic supplement note based on the rule analysis
  const dynamicSupplementNote = `Drip edge quantity (${dripEdgeQty}) exceeds required rake length (${requiredRakeLength}), but gutter apron is ${
    gutterApronPresent ? 'present' : 'completely missing'
  } for required eave length of ${requiredEaveLength}. ${
    !gutterApronPresent
      ? 'Supplement needed for gutter apron installation.'
      : ''
  }`;

  // Find evidence for drip edge and gutter apron
  const dripEdgeEvidence = evidence.find(
    e =>
      e.textMatch?.toLowerCase().includes('drip edge') ||
      e.label?.toLowerCase().includes('drip edge')
  );

  const gutterApronEvidence = evidence.find(
    e =>
      e.textMatch?.toLowerCase().includes('gutter apron') ||
      e.label?.toLowerCase().includes('gutter apron')
  );

  const getStatusIcon = () => {
    if (ruleAnalysis.status === 'COMPLIANT') return CheckCircle;
    return AlertTriangle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className='border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900'>
      {/* Status Header */}
      <div className='flex items-start justify-between p-6 pb-4'>
        <div className='flex items-start gap-3'>
          <StatusIcon
            className={`h-5 w-5 mt-0.5 ${
              ruleAnalysis.status === 'SUPPLEMENT_NEEDED'
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          />
          <div>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
              Drip Edge & Gutter Apron
            </h3>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              Edge protection analysis for rakes and eaves
            </p>
          </div>
        </div>
        <RuleStatusBadge status={getRuleStatus()} />
      </div>

      <div className='px-6 pb-6 space-y-6'>
        {/* Current Analysis - Vertical Stack */}
        <div className='space-y-4'>
          {/* Drip Edge Section */}
          <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4'>
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                {dripEdgePresent ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <XCircle className='h-4 w-4 text-red-600' />
                )}
                <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                  Drip Edge ({dripEdgePresent ? 'Found' : 'Missing'})
                </span>
                {onJumpToEvidence && dripEdgeEvidence && (
                  <EvidenceChip
                    docType={dripEdgeEvidence.docType}
                    page={dripEdgeEvidence.page}
                    onClick={() =>
                      onJumpToEvidence(
                        dripEdgeEvidence.docType,
                        dripEdgeEvidence.page,
                        dripEdgeEvidence.textMatch
                      )
                    }
                  />
                )}
              </div>
              <div className='ml-6 space-y-1'>
                <div className='text-xs text-zinc-600 dark:text-zinc-400'>
                  • {dripEdgeQty} @ {dripEdgePrice} = {dripEdgeTotal}
                </div>
                <div className='text-xs text-zinc-600 dark:text-zinc-400'>
                  • Rake edges: {requiredRakeLength} ✓
                </div>
              </div>
            </div>
          </div>

          {/* Gutter Apron Section */}
          <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4'>
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                {gutterApronPresent ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <XCircle className='h-4 w-4 text-red-600' />
                )}
                <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                  Gutter Apron ({gutterApronPresent ? 'Found' : 'Missing'})
                </span>
                {onJumpToEvidence && gutterApronEvidence && (
                  <EvidenceChip
                    docType={gutterApronEvidence.docType}
                    page={gutterApronEvidence.page}
                    onClick={() =>
                      onJumpToEvidence(
                        gutterApronEvidence.docType,
                        gutterApronEvidence.page,
                        gutterApronEvidence.textMatch
                      )
                    }
                  />
                )}
              </div>
              <div className='ml-6 space-y-1'>
                <div className='text-xs text-red-600 dark:text-red-400'>
                  • Required for eave edges
                </div>
                <div className='text-xs text-red-600 dark:text-red-400'>
                  • Eave edges: {requiredEaveLength}{' '}
                  {gutterApronPresent ? '✓' : '❌'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4'>
          <p className='text-sm text-zinc-600 dark:text-zinc-300 mb-3'>
            {ruleAnalysis.reasoning}
          </p>

          {ruleAnalysis.status === 'SUPPLEMENT_NEEDED' && (
            <div className='bg-blue-100 dark:bg-blue-900/20 rounded p-3 border border-blue-200 dark:border-blue-800'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-blue-900 dark:text-blue-300'>
                  Recommended: Add Gutter Apron
                </span>
                <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                  {additionalCostValue
                    ? `+$${additionalCostValue.toFixed(2)}`
                    : '---'}
                </span>
              </div>
              <div className='text-xs text-blue-700 dark:text-blue-300 mt-1'>
                {requiredEaveLength} @ {gutterApronPrice}/LF
              </div>
            </div>
          )}
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
            {ruleAnalysis.userDecision === 'accepted' &&
              additionalCostValue && (
                <div className='mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                      Added to supplement:
                    </span>
                    <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                      +${additionalCostValue.toFixed(2)}
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
