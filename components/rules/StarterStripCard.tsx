import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  X,
  MapPin,
  Copy,
  ExternalLink,
  Plus,
  ChevronRight,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { RuleAnalysisResult } from '../../types';
import { EvidenceChip } from '../ui/evidence-chip';

interface StarterStripCardProps {
  ruleAnalysis: RuleAnalysisResult;
  onDecision: (
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => void;
  onJumpToEvidence?: (
    docType: 'estimate' | 'roof_report',
    page: number,
    textMatch?: string
  ) => void;
}

export function StarterStripCard({
  ruleAnalysis,
  onDecision,
  onJumpToEvidence,
}: StarterStripCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');
  const [justificationCopied, setJustificationCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Mock data based on the business rule
  const roofType = 'Laminate Composition Shingles';
  const currentNote = 'Include eave starter course: Yes (included in waste)';
  const totalEaves = '180 LF';
  const requiredRate = '$2.85';
  const additionalCost = ruleAnalysis.costImpact;

  const standardJustification = `Universal starter strip is required for proper shingle installation and manufacturer warranty compliance. The current specification includes starter course "in waste" but does not account for the specific universal starter strip product required for laminate shingles, which provides proper adhesion and wind resistance at the eave edge.`;

  const copyJustification = async () => {
    try {
      await navigator.clipboard.writeText(standardJustification);
      setJustificationCopied(true);
      setTimeout(() => setJustificationCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getStatusIcon = () => {
    return ruleAnalysis.status === 'SUPPLEMENT_NEEDED'
      ? AlertTriangle
      : CheckCircle;
  };

  const StatusIcon = getStatusIcon();

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
                  Starter Strip Quality
                </h2>
                <p className='text-sm text-emerald-700 dark:text-emerald-300'>
                  Current specification meets manufacturer requirements
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge className='bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'>
                Compliant
              </Badge>
              <button
                type='button'
                onClick={() => setExpanded(v => !v)}
                className='inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900 dark:text-emerald-300'
              >
                {expanded ? 'Hide details' : 'Show details'}
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>
            </div>
          </div>

          {expanded && (
            <div className='mt-4 pt-4 border-t border-emerald-200/70 dark:border-emerald-800/70 space-y-4'>
              {/* Evidence */}
              <div>
                <div className='text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1'>
                  Evidence
                </div>
                <div className='flex flex-wrap gap-2'>
                  {Array.isArray((ruleAnalysis as any).evidence) &&
                  (ruleAnalysis as any).evidence.length > 0 ? (
                    (ruleAnalysis as any).evidence.map(
                      (ev: any, idx: number) => (
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
                      )
                    )
                  ) : (
                    <span className='text-xs text-emerald-700/80 dark:text-emerald-300/80'>
                      ---
                    </span>
                  )}
                </div>
              </div>

              {/* Current Specification */}
              {Boolean((ruleAnalysis as any)?.currentSpecification) && (
                <div className='grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm'>
                  <div>
                    <div className='text-xs text-emerald-700 dark:text-emerald-300'>
                      Code
                    </div>
                    <div className='font-medium text-emerald-900 dark:text-emerald-100'>
                      {(ruleAnalysis as any)?.currentSpecification?.code || '—'}
                    </div>
                  </div>
                  <div className='sm:col-span-2'>
                    <div className='text-xs text-emerald-700 dark:text-emerald-300'>
                      Description
                    </div>
                    <div className='font-medium text-emerald-900 dark:text-emerald-100'>
                      {(ruleAnalysis as any)?.currentSpecification
                        ?.description || '—'}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-emerald-700 dark:text-emerald-300'>
                      Qty • Rate • Total
                    </div>
                    <div className='font-medium text-emerald-900 dark:text-emerald-100'>
                      {(ruleAnalysis as any)?.currentSpecification?.quantity ||
                        '—'}
                      {' • '}
                      {(ruleAnalysis as any)?.currentSpecification?.rate || '—'}
                      {' • '}
                      {(ruleAnalysis as any)?.currentSpecification?.total ||
                        '—'}
                    </div>
                  </div>
                </div>
              )}

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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-start gap-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30'>
            <StatusIcon className='h-6 w-6 text-amber-600 dark:text-amber-400' />
          </div>
          <div>
            <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
              Starter Strip Analysis
            </h2>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              Supplement needed
            </p>
          </div>
        </div>
      </div>

      {/* Business Rule Violation */}
      <div className='rounded-lg border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50'>
        <div className='p-4'>
          <div className='flex items-start gap-3'>
            <X className='h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
            <div className='flex-1'>
              <h3 className='font-semibold text-amber-900 dark:text-amber-100 mb-2'>
                Business Rule Violation
              </h3>
              <div className='grid grid-cols-2 gap-4 text-sm'>
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
              <div className='mt-3 p-3 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800'>
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
                <MapPin className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                <button className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium flex items-center gap-1'>
                  Page 2, Options
                  <ExternalLink className='h-3 w-3' />
                </button>
              </div>
              <span className='font-semibold text-red-700 dark:text-red-400'>
                $0.00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Required Correction */}
      <div className='rounded-lg border border-emerald-200 bg-white dark:border-emerald-700 dark:bg-zinc-900'>
        <div className='px-4 py-3 border-b border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'>
          <h3 className='font-semibold text-emerald-900 dark:text-emerald-100'>
            Required Correction
          </h3>
        </div>
        <div className='p-4'>
          <div className='space-y-3'>
            <div className='flex justify-between text-sm'>
              <span className='text-zinc-500 dark:text-zinc-400'>Code:</span>
              <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                RFG START
              </span>
            </div>
            <div className='text-sm'>
              <span className='text-zinc-500 dark:text-zinc-400'>
                Description:
              </span>
              <p className='font-medium text-zinc-900 dark:text-zinc-100 mt-1'>
                Starter strip - Universal
              </p>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-zinc-500 dark:text-zinc-400'>
                Quantity & Rate:
              </span>
              <span className='font-mono text-zinc-900 dark:text-zinc-100'>
                {totalEaves} × {requiredRate}
              </span>
            </div>
            <div className='flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700'>
              <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                $513.00
              </span>
            </div>
          </div>

          <div className='mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-800'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500'>
                  <Plus className='h-3 w-3 text-white' />
                </div>
                <span className='font-semibold text-emerald-900 dark:text-emerald-100'>
                  Additional Cost
                </span>
              </div>
              <span className='text-lg font-semibold text-emerald-700 dark:text-emerald-300'>
                +${additionalCost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Carrier Justification */}
      <div className='rounded-lg border border-blue-200 bg-white dark:border-blue-700 dark:bg-zinc-900'>
        <div className='px-4 py-3 border-b border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'>
          <div className='flex items-center justify-between'>
            <h3 className='font-semibold text-blue-900 dark:text-blue-100'>
              Carrier Justification
            </h3>
            <Button
              variant='outline'
              size='sm'
              onClick={copyJustification}
              className='h-7 px-2 text-xs border-blue-200 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900/30'
            >
              <Copy className='h-3 w-3 mr-1.5' />
              {justificationCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className='p-4'>
          <div className='bg-blue-50 border border-blue-200 rounded p-3 dark:bg-blue-950/20 dark:border-blue-800'>
            <p className='text-sm text-blue-900 dark:text-blue-100 leading-relaxed'>
              {standardJustification}
            </p>
          </div>
        </div>
      </div>

      {/* Decision Section */}
      <div className='space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-700'>
        {!ruleAnalysis.userDecision ? (
          <>
            <div className='flex gap-3'>
              <Button
                onClick={() => onDecision('accepted', notes)}
                className='flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
              >
                <Plus className='h-4 w-4 mr-2' />
                Add to Supplement
              </Button>
              <Button
                variant='outline'
                onClick={() => onDecision('rejected', notes)}
                className='px-8 h-12 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
              >
                <X className='h-4 w-4 mr-2' />
                Skip
              </Button>
            </div>

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
                  {ruleAnalysis.userDecision.charAt(0).toUpperCase() +
                    ruleAnalysis.userDecision.slice(1)}
                </p>
                {ruleAnalysis.userNotes && (
                  <p className='text-sm text-indigo-700 dark:text-indigo-300 mt-1'>
                    {ruleAnalysis.userNotes}
                  </p>
                )}
                {ruleAnalysis.userDecision === 'accepted' && (
                  <p className='text-sm text-indigo-700 dark:text-indigo-300 mt-1'>
                    Added +${additionalCost.toLocaleString()} to supplement
                  </p>
                )}
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setNotes('');
                }}
                className='text-xs border-indigo-200 hover:bg-indigo-100 dark:border-indigo-700 dark:hover:bg-indigo-900/30'
              >
                Change
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
