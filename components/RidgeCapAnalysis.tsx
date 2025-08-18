import { useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Copy,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ValueHighlight } from './ui/value-highlight';

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
}

interface RidgeCapAnalysisProps {
  ruleNumber: number;
  totalRules: number;
  ridgeCapData?: RidgeCapData;
  showHighlighting?: boolean;
}

export function RidgeCapAnalysis({
  ruleNumber,
  totalRules,
  ridgeCapData,
  showHighlighting = true,
}: RidgeCapAnalysisProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  // Helper function to determine if a value is from live data or placeholder
  const hasLiveData = (value: any) =>
    value !== undefined && value !== null && value !== '';

  // Calculate values with clean fallbacks
  const estimateQty = ridgeCapData?.estimateQuantity || '93.32 LF';
  const requiredQty = ridgeCapData?.requiredQuantity || '93.32 LF';
  const variance = ridgeCapData?.variance || '0.00 LF';
  const costImpact = ridgeCapData?.costImpact || 113.0;
  const confidence = ridgeCapData?.confidence || 0.99;
  const ridgeLength = ridgeCapData?.ridgeLength || 37.77;
  const hipLength = ridgeCapData?.hipLength || 55.55;
  const unitPrice = ridgeCapData?.estimateUnitPrice || '$1.21';
  const roofType = ridgeCapData?.roofType || 'Laminate Composition';
  const ridgeCapType = ridgeCapData?.ridgeCapType || 'cut from 3 tab';
  const isCompliant = ridgeCapData?.complianceStatus === 'compliant';
  const lineItemCode = ridgeCapData?.lineItemCode || 'RFG HRSD';
  const lineItemDescription =
    ridgeCapData?.lineItemDescription ||
    'Hip/Ridge cap - cut from 3 tab - composition shingles';
  const documentationNote =
    ridgeCapData?.documentationNote ||
    'Cut-up 3-tab shingles used as hip & ridge caps are not independently tested or rated for wind resistance under ASTM D3161 or ASTM D7158, and therefore have no assignable wind rating when used in those applications.';

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
              Current Specification
            </div>
            <div className='space-y-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                    • {lineItemDescription}
                  </div>
                  <div className='text-xs text-zinc-600 dark:text-zinc-400 mt-1'>
                    • {estimateQty} @ {unitPrice} ={' '}
                    {ridgeCapData?.estimateTotal || '$112.94'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Required Measurement */}
          <div>
            <div className='text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3'>
              Required Ridge Cap
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                  Ridge Length from Roof Report:
                </span>
                <span className='ml-2 font-semibold text-zinc-900 dark:text-zinc-100'>
                  {requiredQty}
                </span>
              </div>
              {quantityMatch ? (
                <div className='flex items-center gap-1 text-green-600 dark:text-green-400'>
                  <CheckCircle className='h-4 w-4' />
                  <span className='text-xs font-medium'>Quantity matches</span>
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
                  Supplement: +${costImpact.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              onClick={() => {
                navigator.clipboard.writeText(documentationNote);
              }}
            >
              <Copy className='h-3.5 w-3.5 mr-1.5' />
              Copy Note
            </Button>
            <Button
              size='sm'
              className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'
            >
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Add to Supplement
            </Button>
          </div>
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
