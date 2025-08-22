import { useState } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

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

interface StarterStripCardProps {
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

export function StarterStripCardV2({
  ruleAnalysis,
  evidence = [],
  onDecision,
  onJumpToEvidence,
}: StarterStripCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');

  // Extract values from analysis
  const roofType = 'Laminate Composition Shingles';
  const currentNote = 'Include eave starter course: Yes (included in waste)';
  const totalEaves = '180 LF';
  const requiredRate = '$2.85';
  const additionalCost = ruleAnalysis.costImpact;

  // Dynamic supplement note
  const dynamicSupplementNote = `Universal starter strip is required for proper shingle installation and manufacturer warranty compliance. The current specification includes starter course "in waste" but does not account for the specific universal starter strip product required for laminate shingles. This provides proper adhesion and wind resistance at the eave edge. Total eaves: ${totalEaves} @ ${requiredRate}/LF.`;

  // Find relevant evidence
  const starterEvidence = evidence.find(
    e =>
      e.textMatch?.toLowerCase().includes('starter') ||
      e.label?.toLowerCase().includes('starter')
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
    return 'needs-supplement';
  };

  if (ruleAnalysis.status === 'COMPLIANT') {
    return (
      <div className='rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50'>
        <div className='p-6'>
          <div className='flex items-center gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30'>
              <CheckCircle className='h-6 w-6 text-emerald-600 dark:text-emerald-400' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-semibold text-emerald-900 dark:text-emerald-100'>
                Starter Strip Quality
              </h2>
              <p className='text-sm text-emerald-700 dark:text-emerald-300'>
                Current specification meets manufacturer requirements
              </p>
            </div>
            <RuleStatusBadge status='compliant' />
          </div>
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
              Starter Strip Analysis
            </h3>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              Universal starter strip requirement check
            </p>
          </div>
        </div>
        <RuleStatusBadge status={getRuleStatus()} />
      </div>

      <div className='px-6 pb-6 space-y-6'>
        {/* Business Rule Violation - Vertical Stack */}
        <div className='rounded-lg border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50'>
          <div className='p-4'>
            <div className='flex items-start gap-3'>
              <X className='h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
              <div className='flex-1 space-y-3'>
                <h3 className='font-semibold text-amber-900 dark:text-amber-100'>
                  Business Rule Violation
                </h3>

                {/* Stacked info instead of grid */}
                <div className='space-y-2 text-sm'>
                  <div>
                    <span className='text-amber-700 dark:text-amber-300'>
                      Roof Type:
                    </span>
                    <p className='font-medium text-amber-900 dark:text-amber-100'>
                      {roofType}
                    </p>
                  </div>
                  <div>
                    <span className='text-amber-700 dark:text-amber-300'>
                      Starter Strip:
                    </span>
                    <p className='font-medium text-amber-900 dark:text-amber-100'>
                      Included in waste ❌
                    </p>
                  </div>
                </div>

                <div className='p-3 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800'>
                  <p className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                    Rule: Laminate shingles require universal starter strip, not
                    cut shingles
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What's in the Estimate Now */}
        <div className='rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'>
          <div className='px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'>
            <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
              What&apos;s in the Estimate Now
            </h3>
          </div>
          <div className='p-4'>
            <div className='space-y-3'>
              <div className='text-sm'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Current Specification:
                </span>
                <p className='font-medium text-zinc-900 dark:text-zinc-100 mt-1'>
                  {currentNote}
                </p>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Total Eaves:
                </span>
                <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                  {totalEaves}
                </span>
              </div>
              <div className='flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700'>
                <div className='flex items-center gap-2'>
                  {onJumpToEvidence && starterEvidence ? (
                    <EvidenceChip
                      docType={starterEvidence.docType}
                      page={starterEvidence.page}
                      label='Page 2, Options'
                      onClick={() =>
                        onJumpToEvidence(
                          starterEvidence.docType,
                          starterEvidence.page,
                          starterEvidence.textMatch
                        )
                      }
                    />
                  ) : (
                    <span className='text-xs text-gray-400'>Evidence: ---</span>
                  )}
                </div>
                <span className='font-semibold text-red-700 dark:text-red-400'>
                  $0.00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Required Universal Starter Strip */}
        <div className='rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50'>
          <div className='px-4 py-3 border-b border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900/50'>
            <h3 className='font-semibold text-blue-900 dark:text-blue-100'>
              Required: Universal Starter Strip
            </h3>
          </div>
          <div className='p-4'>
            <div className='space-y-3'>
              <p className='text-sm text-blue-700 dark:text-blue-300'>
                Manufacturer warranty requires universal starter strip for
                laminate shingles
              </p>
              <div className='flex justify-between text-sm'>
                <span className='text-blue-600 dark:text-blue-400'>
                  Required Quantity:
                </span>
                <span className='font-mono text-blue-900 dark:text-blue-100'>
                  {totalEaves}
                </span>
              </div>
              <div className='flex justify-between items-center pt-3 border-t border-blue-200 dark:border-blue-800'>
                <span className='text-blue-600 dark:text-blue-400'>Rate:</span>
                <span className='font-mono text-blue-900 dark:text-blue-100'>
                  {requiredRate}/LF
                </span>
              </div>
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
