import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Edit2,
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

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
}

interface SimplifiedRidgeCapAnalysisProps {
  ruleNumber: number;
  totalRules: number;
  ridgeCapData?: RidgeCapData;
  onAddToSupplement?: (data: Record<string, unknown>) => void;
  onSkip?: () => void;
  onJumpToEvidence?: (location: string, type: 'estimate' | 'roof_report') => void;
}

export function SimplifiedRidgeCapAnalysis({
  ruleNumber,
  totalRules,
  ridgeCapData,
  onAddToSupplement,
  onSkip,
  onJumpToEvidence,
}: SimplifiedRidgeCapAnalysisProps) {
  const [showCalculationTrace, setShowCalculationTrace] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [supplementQuantity, setSupplementQuantity] = useState('113 LF');
  const [supplementPrice, setSupplementPrice] = useState('$NaN/LF');
  const [documentationCopied, setDocumentationCopied] = useState(false);

  // Calculate values
  const estimateQty = ridgeCapData?.estimateQuantity || '6 LF';
  const requiredQty = ridgeCapData?.requiredQuantity || '119 LF';
  const _variance = ridgeCapData?.variance || '-113 LF';
  const varianceAmount = ridgeCapData?.varianceAmount || -113;
  const costImpact = ridgeCapData?.costImpact || 0;
  const confidence = ridgeCapData?.confidence || 0.95;
  const ridgeLength = ridgeCapData?.ridgeLength || 26;
  const hipLength = ridgeCapData?.hipLength || 93;
  const _isCompliant = ridgeCapData?.complianceStatus === 'compliant';
  const documentationNote = ridgeCapData?.documentationNote || 
    'Ridge cap shortage identified. EagleView report documents 119 LF total ridge/hip coverage required (Ridges: 26 LF + Hips: 93 LF). Current estimate includes only 6 LF, creating a shortage of 113 LF. Material type (Standard profile) is correctly specified and should be increased to match documented roof geometry. Additional coverage required: 113 LF @ $NaN/LF = $NaN.';

  const handleCopyDocumentation = () => {
    navigator.clipboard.writeText(documentationNote);
    setDocumentationCopied(true);
    setTimeout(() => setDocumentationCopied(false), 2000);
  };

  const handleAddToSupplement = () => {
    if (onAddToSupplement) {
      onAddToSupplement({
        quantity: supplementQuantity,
        price: supplementPrice,
        total: costImpact,
        notes: customNotes,
      });
    }
  };

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
          Ridge/Cap Analysis
        </h2>
        <span className='text-sm text-zinc-500 dark:text-zinc-400'>
          Rule {ruleNumber} of {totalRules}
        </span>
      </div>

      {/* Status Alert - Simplified */}
      <div className='flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-800'>
        <div className='flex items-center gap-3'>
          <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
          <span className='font-medium text-red-900 dark:text-red-100'>
            Shortage: +{Math.abs(varianceAmount)} LF needed
          </span>
          <Badge variant='outline' className='border-red-200 text-red-700 dark:border-red-800 dark:text-red-300'>
            {Math.round(confidence * 100)}% confidence
          </Badge>
          <button className='text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'>
            <HelpCircle className='h-3 w-3' />
          </button>
        </div>
      </div>

      {/* Coverage Summary - Simplified */}
      <Card className='p-4'>
        <div className='flex items-center gap-2 mb-3'>
          <div className='w-5 h-5 border border-zinc-300 rounded flex items-center justify-center'>
            <span className='text-xs'>📋</span>
          </div>
          <h3 className='text-sm font-medium'>Coverage Summary</h3>
        </div>
        
        <div className='flex items-center gap-2 mb-2'>
          <CheckCircle className='h-4 w-4 text-green-500' />
          <span className='text-sm'>Estimate is compliant</span>
        </div>

        <div className='p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg'>
          <p className='text-sm text-yellow-800 dark:text-yellow-200'>
            <strong>Note:</strong> estimate only requests {estimateQty} instead of recommended {requiredQty}.
          </p>
        </div>

        <div className='flex gap-2 mt-3'>
          <Button
            variant='outline'
            size='sm'
            className='flex-1'
            onClick={handleCopyDocumentation}
          >
            <Copy className='h-3 w-3 mr-1' />
            {documentationCopied ? 'Copied!' : 'Copy Note'}
          </Button>
          <Button
            size='sm'
            className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'
            onClick={handleAddToSupplement}
          >
            <Plus className='h-3 w-3 mr-1' />
            Add to Supplement
          </Button>
        </div>
      </Card>

      {/* Evidence Stack - Compact Design */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <div className='w-5 h-5 border border-zinc-300 rounded flex items-center justify-center'>
            <span className='text-xs'>👁</span>
          </div>
          <h3 className='text-sm font-medium'>Evidence Stack</h3>
          <Badge variant='outline' className='text-xs'>4 items</Badge>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          {/* Estimate Items */}
          <div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>ESTIMATE</p>
            <div className='space-y-2'>
              <button
                className='w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left'
                onClick={() => onJumpToEvidence?.('page-4-line-3b', 'estimate')}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                      Estimate ridge cap
                    </p>
                    <p className='text-xs text-zinc-500'>Page 4, Line 3b</p>
                  </div>
                  <div className='flex items-center gap-1'>
                    <span className='text-sm font-semibold'>{estimateQty}</span>
                    <ExternalLink className='h-3 w-3 text-zinc-400' />
                  </div>
                </div>
              </button>

              <button
                className='w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left'
                onClick={() => onJumpToEvidence?.('page-4-line-2', 'estimate')}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                      Shingle type
                    </p>
                    <p className='text-xs text-zinc-500'>Page 4, Line 2</p>
                  </div>
                  <div className='flex items-center gap-1'>
                    <span className='text-sm'>Laminated comp</span>
                    <ExternalLink className='h-3 w-3 text-zinc-400' />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Roof Report Items */}
          <div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>ROOF REPORT</p>
            <div className='space-y-2'>
              <button
                className='w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left'
                onClick={() => onJumpToEvidence?.('page-2-section-3', 'roof_report')}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-green-600 dark:text-green-400'>
                      Ridges
                    </p>
                    <p className='text-xs text-zinc-500'>Page 2, Section 3</p>
                  </div>
                  <div className='flex items-center gap-1'>
                    <span className='text-sm font-semibold'>{ridgeLength} LF</span>
                    <ExternalLink className='h-3 w-3 text-zinc-400' />
                  </div>
                </div>
              </button>

              <button
                className='w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left'
                onClick={() => onJumpToEvidence?.('page-2-section-3', 'roof_report')}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-green-600 dark:text-green-400'>
                      Hips
                    </p>
                    <p className='text-xs text-zinc-500'>Page 2, Section 3</p>
                  </div>
                  <div className='flex items-center gap-1'>
                    <span className='text-sm font-semibold'>{hipLength} LF</span>
                    <ExternalLink className='h-3 w-3 text-zinc-400' />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supplement Items - Editable */}
      <Card className='p-4'>
        <div className='flex items-center gap-2 mb-3'>
          <Plus className='h-4 w-4 text-blue-600' />
          <h3 className='text-sm font-medium'>Supplement Items:</h3>
        </div>

        <div className='space-y-3'>
          <div>
            <label className='text-xs text-zinc-500 dark:text-zinc-400'>
              Additional quantity:
            </label>
            <div className='flex items-center gap-2 mt-1'>
              {editingQuantity ? (
                <Input
                  value={supplementQuantity}
                  onChange={(e) => setSupplementQuantity(e.target.value)}
                  onBlur={() => setEditingQuantity(false)}
                  className='h-8 text-sm font-semibold text-blue-600'
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditingQuantity(true)}
                  className='flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700'
                >
                  {supplementQuantity}
                  <Edit2 className='h-3 w-3' />
                </button>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-xs text-zinc-500 dark:text-zinc-400'>
                Unit price:
              </label>
              <div className='flex items-center gap-2 mt-1'>
                {editingPrice ? (
                  <Input
                    value={supplementPrice}
                    onChange={(e) => setSupplementPrice(e.target.value)}
                    onBlur={() => setEditingPrice(false)}
                    className='h-8 text-sm'
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setEditingPrice(true)}
                    className='flex items-center gap-1 text-sm hover:text-zinc-700'
                  >
                    {supplementPrice}
                    <Edit2 className='h-3 w-3' />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className='text-xs text-zinc-500 dark:text-zinc-400'>
                Total addition:
              </label>
              <p className='text-lg font-bold text-blue-600 dark:text-blue-400 mt-1'>
                $NaN
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Calculation Trace - Collapsible */}
      <Card className='overflow-hidden'>
        <button
          className='w-full p-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors'
          onClick={() => setShowCalculationTrace(!showCalculationTrace)}
        >
          <div className='flex items-center gap-2'>
            <div className='w-5 h-5 border border-zinc-300 rounded flex items-center justify-center'>
              <span className='text-xs'>📊</span>
            </div>
            <h3 className='text-sm font-medium'>Calculation Trace</h3>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-zinc-500'>Show details</span>
            {showCalculationTrace ? (
              <ChevronUp className='h-4 w-4 text-zinc-400' />
            ) : (
              <ChevronDown className='h-4 w-4 text-zinc-400' />
            )}
          </div>
        </button>
        
        {showCalculationTrace && (
          <div className='p-4 pt-0 space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-zinc-600'>Roof report: Ridges =</span>
              <span className='font-medium'>{ridgeLength} LF</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-zinc-600'>Roof report: Hips =</span>
              <span className='font-medium'>{hipLength} LF</span>
            </div>
            <div className='border-t pt-2 flex justify-between font-medium'>
              <span>Total Required =</span>
              <span>{ridgeLength + hipLength} LF</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-zinc-600'>Current Estimate =</span>
              <span className='font-medium'>{estimateQty}</span>
            </div>
            <div className='border-t pt-2 flex justify-between font-medium text-red-600'>
              <span>Shortage =</span>
              <span>{Math.abs(varianceAmount)} LF</span>
            </div>
          </div>
        )}
      </Card>

      {/* Documentation Note */}
      <Card className='p-4'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div className='w-5 h-5 border border-zinc-300 rounded flex items-center justify-center'>
              <span className='text-xs'>📄</span>
            </div>
            <h3 className='text-sm font-medium'>Documentation Note</h3>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={handleCopyDocumentation}
          >
            <Copy className='h-3 w-3 mr-1' />
            Copy
          </Button>
        </div>
        
        <div className='p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300'>
          {documentationNote}
        </div>
        
        <div className='mt-3'>
          <label className='text-xs text-zinc-500 dark:text-zinc-400'>
            Additional Notes (Optional)
          </label>
          <Textarea
            placeholder='Add any custom notes for this analysis...'
            className='mt-1 resize-none text-sm'
            rows={3}
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
          />
        </div>
      </Card>

      {/* Action Buttons */}
      <div className='flex gap-3 pt-4'>
        <Button
          size='lg'
          className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'
          onClick={handleAddToSupplement}
        >
          <Plus className='h-4 w-4 mr-2' />
          Add to Supplement
        </Button>
        <Button
          size='lg'
          variant='outline'
          className='px-8'
          onClick={onSkip}
        >
          <X className='h-4 w-4 mr-2' />
          Skip
        </Button>
      </div>
    </div>
  );
}