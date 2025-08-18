import {
  AlertTriangle,
  ExternalLink,
  Copy,
  Plus,
  ChevronDown,
  CheckCircle,
  X,
  Edit,
  XCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

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

interface DripEdgeGutterApronCardProps {
  ruleAnalysis: RuleAnalysisResult;
  onDecision: (
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => void;
}

export function DripEdgeGutterApronCard({
  ruleAnalysis,
  onDecision,
}: DripEdgeGutterApronCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis?.userNotes || '');
  const [justificationCopied, setJustificationCopied] = useState(false);

  // Mock data based on the business rule (similar to StarterStripCard)
  const dripEdgePresent = true;
  const gutterApronPresent = false;
  const dripEdgeQty = '45.2 LF';
  const dripEdgePrice = '$2.85';
  const dripEdgeTotal = '$128.82';
  const requiredRakeLength = '45.2 LF';
  const requiredEaveLength = '178.6 LF';
  const additionalCost = ruleAnalysis.costImpact;

  const standardJustification =
    'Drip edge and gutter apron are both essential components in a roofing system. Drip edge protects rakes (side edges) while gutter apron protects eaves (bottom edges) and directs water into gutters. Both are required for proper water management and code compliance.';

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
        <Badge
          className={`${
            ruleAnalysis.status === 'SUPPLEMENT_NEEDED'
              ? 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
          }`}
        >
          {ruleAnalysis.status === 'SUPPLEMENT_NEEDED'
            ? 'Supplement Needed'
            : 'Compliant'}
        </Badge>
      </div>

      <div className='px-6 pb-6 space-y-6'>
        {/* Analysis Content */}
        <div className='space-y-4'>
          {/* Current Analysis */}
          <div className='bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Drip Edge Status */}
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='h-4 w-4 text-green-600' />
                  <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                    Drip Edge (Found)
                  </span>
                </div>
                <div className='text-xs text-zinc-600 dark:text-zinc-400 ml-6'>
                  • {dripEdgeQty} @ {dripEdgePrice} = {dripEdgeTotal}
                </div>
                <div className='text-xs text-zinc-600 dark:text-zinc-400 ml-6'>
                  • Rake edges: {requiredRakeLength} ✓
                </div>
              </div>

              {/* Gutter Apron Status */}
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <XCircle className='h-4 w-4 text-red-600' />
                  <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                    Gutter Apron (Missing)
                  </span>
                </div>
                <div className='text-xs text-red-600 dark:text-red-400 ml-6'>
                  • Required for eave edges
                </div>
                <div className='text-xs text-red-600 dark:text-red-400 ml-6'>
                  • Eave edges: {requiredEaveLength} ❌
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
                    +${additionalCost.toFixed(2)}
                  </span>
                </div>
                <div className='text-xs text-blue-700 dark:text-blue-300 mt-1'>
                  {requiredEaveLength} @ $3.15/LF
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decision Section */}
        {!ruleAnalysis.userDecision ? (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2'>
                Additional Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Add any custom notes for this supplement...'
                className='w-full'
              />
            </div>

            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={copyJustification}
                className='flex-1'
              >
                <Copy className='h-4 w-4 mr-2' />
                {justificationCopied ? 'Copied!' : 'Copy Note'}
              </Button>
              <Button
                onClick={() => onDecision('accepted', notes)}
                className='flex-1 bg-green-600 hover:bg-green-700 text-white'
              >
                <CheckCircle className='h-4 w-4 mr-2' />
                Accept
              </Button>
              <Button
                variant='outline'
                onClick={() => onDecision('rejected', notes)}
                className='flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
              >
                <X className='h-4 w-4 mr-2' />
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800'>
            <div className='flex items-start gap-3'>
              <CheckCircle className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5' />
              <div>
                <p className='text-sm font-semibold text-green-900 dark:text-green-100'>
                  Decision:{' '}
                  {ruleAnalysis.userDecision.charAt(0).toUpperCase() +
                    ruleAnalysis.userDecision.slice(1)}
                </p>
                {ruleAnalysis.userNotes && (
                  <p className='text-sm text-green-700 dark:text-green-300 mt-1'>
                    {ruleAnalysis.userNotes}
                  </p>
                )}
                {ruleAnalysis.userDecision === 'accepted' && (
                  <p className='text-sm text-green-700 dark:text-green-300 mt-1'>
                    Added +${additionalCost.toFixed(2)} to supplement
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
