import { useState } from 'react';
import { CheckCircle, AlertTriangle, X, ChevronRight } from 'lucide-react';

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

interface RidgeCapCardProps {
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

export function RidgeCapCardV2({
  ruleAnalysis,
  evidence = [],
  onDecision,
  onJumpToEvidence,
}: RidgeCapCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');
  // Always expanded; collapse UI removed

  const getRuleStatus = () => {
    if (ruleAnalysis.status === 'COMPLIANT') return 'compliant';
    // No partial state used for ridge cap today; use needs-supplement when not compliant
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
                  Hip/Ridge Cap Quality
                </h2>
                <p className='text-sm text-emerald-700 dark:text-emerald-300'>
                  Current specification meets ASTM wind resistance requirements
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <RuleStatusBadge status='compliant' />
            </div>
          </div>

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
                {ruleAnalysis.reasoning || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-compliant (needs supplement)
  return (
    <div className='border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900'>
      {/* Header */}
      <div className='flex items-start justify-between p-6 pb-4'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400' />
          <div>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
              Hip/Ridge Cap Analysis
            </h3>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              ASTM D3161/D7158 compliance and quantity verification
            </p>
          </div>
        </div>
        <RuleStatusBadge status={getRuleStatus()} />
      </div>

      <div className='px-6 pb-6 space-y-6'>
        {/* Summary with value verification */}
        <div className='rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/30'>
          <div className='p-4'>
            <p className='text-sm text-zinc-600 dark:text-zinc-300 mb-2'>
              {ruleAnalysis.reasoning || '—'}
            </p>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Current:
                </span>
                <p className='font-medium text-zinc-900 dark:text-zinc-100'>
                  {(ruleAnalysis as any)?.estimateQuantity ||
                    (ruleAnalysis as any)?.currentSpecification?.quantity ||
                    '—'}
                </p>
              </div>
              <div>
                <span className='text-zinc-500 dark:text-zinc-400'>
                  Required:
                </span>
                <p className='font-medium text-zinc-900 dark:text-zinc-100'>
                  {(ruleAnalysis as any)?.requiredQuantity || '—'}
                </p>
              </div>
            </div>
            <div className='mt-2 text-xs text-zinc-600 dark:text-zinc-400'>
              {(() => {
                const cur = String(
                  (ruleAnalysis as any)?.estimateQuantity ||
                    (ruleAnalysis as any)?.currentSpecification?.quantity ||
                    ''
                )
                  .replace(/[^\d.]/g, '')
                  .trim();
                const req = String(
                  (ruleAnalysis as any)?.requiredQuantity || ''
                )
                  .replace(/[^\d.]/g, '')
                  .trim();
                if (!cur || !req) return 'Values: ---';
                const curNum = Number(cur);
                const reqNum = Number(req);
                if (isNaN(curNum) || isNaN(reqNum)) return 'Values: ---';
                if (curNum >= reqNum)
                  return 'Values match or exceed requirement ✓';
                return 'Values insufficient ❌';
              })()}
            </div>
          </div>
        </div>

        {/* What’s in the Estimate Now */}
        {Boolean((ruleAnalysis as any)?.currentSpecification) && (
          <div className='rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'>
              <h3 className='font-semibold text-zinc-900 dark:text-zinc-100'>
                What&apos;s in the Estimate Now
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
                      {(ruleAnalysis as any)?.currentSpecification?.code || '—'}
                    </span>
                  </div>
                  <p className='font-medium text-zinc-900 dark:text-zinc-100 mt-1'>
                    {(ruleAnalysis as any)?.currentSpecification?.description ||
                      '—'}
                  </p>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-zinc-500 dark:text-zinc-400'>
                    Quantity & Rate:
                  </span>
                  <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                    {(ruleAnalysis as any)?.currentSpecification?.quantity ||
                      '—'}{' '}
                    × {(ruleAnalysis as any)?.currentSpecification?.rate || '—'}
                  </span>
                </div>
                <div className='flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700'>
                  <div className='flex items-center gap-2'>
                    {Array.isArray(evidence) && evidence.length > 0 ? (
                      <EvidenceChip
                        docType={(evidence[0]?.docType as any) || 'estimate'}
                        page={Number(evidence[0]?.page) || 1}
                        label={evidence[0]?.label || 'Estimate'}
                        onClick={() =>
                          onJumpToEvidence?.(
                            (evidence[0]?.docType as any) || 'estimate',
                            Number(evidence[0]?.page) || 1,
                            evidence[0]?.textMatch
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
                    {(ruleAnalysis as any)?.currentSpecification?.total || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Decision Section */}
        {!ruleAnalysis.userDecision ? (
          <div className='space-y-4'>
            <SupplementNote
              value={notes}
              onChange={setNotes}
              dynamicNote={
                (ruleAnalysis as any)?.documentationNote ||
                'Ridge cap specification appears non-compliant with ASTM wind resistance standards. Replace with purpose-built ridge cap product to ensure compliance.'
              }
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
          </div>
        )}
      </div>
    </div>
  );
}
