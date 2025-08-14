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

interface RidgeCapAnalysisProps {
  ruleNumber: number;
  totalRules: number;
}

export function RidgeCapAnalysis({
  ruleNumber,
  totalRules,
}: RidgeCapAnalysisProps) {
  const [showCalculationTrace, setShowCalculationTrace] = useState(false);
  const [customNotes, setCustomNotes] = useState('');

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
            Ridge/Cap Analysis
          </h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
            Skim → confirm → fix-in-place → move on
          </p>
        </div>
        <div className='text-sm text-zinc-500 dark:text-zinc-400'>
          Rule {ruleNumber} of {totalRules}
        </div>
      </div>

      {/* Status Alert */}
      <div className='flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-800'>
        <div className='flex items-center gap-2'>
          <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
          <span className='font-medium text-red-900 dark:text-red-100'>
            Shortage: +113 LF needed
          </span>
          <span className='text-sm text-red-700 dark:text-red-300'>
            95% confidence
          </span>
          <button className='text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'>
            <HelpCircle className='h-4 w-4' />
          </button>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' className='h-7 text-xs'>
            <Copy className='h-3 w-3 mr-1' />
            Copy Note
          </Button>
          <Button
            size='sm'
            className='h-7 text-xs bg-blue-600 hover:bg-blue-700'
          >
            <Plus className='h-3 w-3 mr-1' />
            Add to Supplement
          </Button>
        </div>
      </div>

      {/* Coverage Summary */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm font-medium flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 border border-zinc-300 rounded flex items-center justify-center'>
                <CheckCircle className='w-3 h-3 text-zinc-400' />
              </div>
              Coverage Summary
            </div>
            <span className='text-xs text-zinc-500 dark:text-zinc-400'>
              Click any value to see the source
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
                Estimate LF:
              </div>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>6 LF</span>
                <button className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1'>
                  <ExternalLink className='h-3 w-3' />
                  Estimate p.4
                </button>
              </div>
            </div>
            <div>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
                Required LF:
              </div>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>119 LF</span>
                <button className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1'>
                  <ExternalLink className='h-3 w-3' />
                  Report p.2
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
              Variance:
            </div>
            <div className='text-red-600 dark:text-red-400 font-semibold'>
              -113 LF
            </div>
          </div>

          <div className='mt-3 p-2 bg-zinc-50 dark:bg-zinc-800 rounded'>
            <button
              className='flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              onClick={() => setShowCalculationTrace(!showCalculationTrace)}
            >
              <span>Required LF = Ridges + Hips</span>
              {showCalculationTrace ? (
                <ChevronUp className='h-3 w-3' />
              ) : (
                <ChevronDown className='h-3 w-3' />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Type Compliance */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <div className='w-4 h-4 border border-zinc-300 rounded flex items-center justify-center'>
              <CheckCircle className='w-3 h-3 text-green-500' />
            </div>
            Type Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
                Roof type detected:
              </div>
              <div className='font-medium'>Laminated</div>
            </div>
            <div>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
                Ridge cap type in estimate:
              </div>
              <div className='font-medium'>Purpose-built Standard</div>
            </div>
          </div>

          <div>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
              Compliance result:
            </div>
            <div className='text-green-600 dark:text-green-400 font-medium'>
              Compliant
            </div>
          </div>

          <div className='p-3 bg-green-50 dark:bg-green-950/20 rounded-lg'>
            <div className='flex items-center gap-2 text-green-800 dark:text-green-200'>
              <CheckCircle className='h-4 w-4' />
              <span className='text-xs font-medium'>
                Purpose-built ridge caps meet ASTM D3161/D7158 wind resistance
                standards
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quantity and Rate to Add */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <Plus className='w-4 h-4 text-blue-600' />
            Quantity and Rate to Add
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
              Additional quantity:
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-blue-600 dark:text-blue-400'>
                113 LF
              </span>
              <button className='p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded'>
                <ExternalLink className='h-3 w-3 text-zinc-400' />
              </button>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
                Unit price:
              </div>
              <div className='font-medium'>$42.90/LF</div>
            </div>
            <div>
              <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-1'>
                Total addition:
              </div>
              <div className='font-bold text-blue-600 dark:text-blue-400 text-lg'>
                $4847.70
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Trace */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <div className='w-4 h-4 border border-zinc-300 rounded flex items-center justify-center'>
                <CheckCircle className='w-3 h-3 text-zinc-400' />
              </div>
              Calculation Trace
            </CardTitle>
            <button
              className='text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              onClick={() => setShowCalculationTrace(!showCalculationTrace)}
            >
              {showCalculationTrace ? 'Hide details' : 'Show details'}
            </button>
          </div>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>
                Roof report: Ridges =
              </span>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>26 LF</span>
                <button className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400'>
                  <ExternalLink className='h-3 w-3' />
                  Jump
                </button>
              </div>
            </div>

            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>
                Roof report: Hips =
              </span>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>93 LF</span>
                <button className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400'>
                  <ExternalLink className='h-3 w-3' />
                  Jump
                </button>
              </div>
            </div>

            <Separator />

            <div className='flex justify-between font-medium'>
              <span>Sum =</span>
              <span>119 LF</span>
            </div>

            <div className='mt-3 p-2 bg-zinc-50 dark:bg-zinc-800 rounded'>
              <div className='text-xs text-zinc-600 dark:text-zinc-400 mb-1'>
                Estimate ridge-cap lines found:
              </div>
              <div className='flex items-center justify-between text-sm'>
                <div>
                  <div className='font-medium'>
                    RFG RIDGC – Hip/Ridge cap – Standard profile
                  </div>
                  <div className='text-xs text-zinc-500'>
                    6.00 LF @ $42.90/LF = $257.40
                  </div>
                </div>
                <button className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400'>
                  <ExternalLink className='h-3 w-3' />
                  Jump
                </button>
              </div>
            </div>

            <div className='mt-3 space-y-1'>
              <div className='text-xs text-zinc-600 dark:text-zinc-400'>
                Validation checks:
              </div>
              <div className='flex items-center gap-2 text-xs'>
                <CheckCircle className='h-3 w-3 text-green-500' />
                <span className='text-green-700 dark:text-green-300'>
                  Unit consistency: LF expected for ridge cap
                </span>
              </div>
              <div className='flex items-center gap-2 text-xs'>
                <CheckCircle className='h-3 w-3 text-green-500' />
                <span className='text-green-700 dark:text-green-300'>
                  Reasonableness: ridge/hip LF (119) &lt; perimeter
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Note */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <div className='w-4 h-4 border border-zinc-300 rounded flex items-center justify-center text-xs'>
                📄
              </div>
              Documentation Note
            </CardTitle>
            <Button variant='outline' size='sm' className='h-7 text-xs'>
              <Copy className='h-3 w-3 mr-1' />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 mb-3'>
            Ridge cap shortage identified. EagleView report documents 119 LF
            total ridge/hip coverage required (Ridges: 26 LF + Hips: 93 LF).
            Current estimate includes only 6 LF, creating a shortage of 113 LF.
            Material type (Standard profile) is correctly specified and should
            be increased to match documented roof geometry. Additional coverage
            required: 113 LF @ $42.90/LF = $4847.70.
          </div>

          <div>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 mb-2'>
              Additional Notes (Optional)
            </div>
            <textarea
              placeholder='Add any custom notes for this analysis...'
              className='w-full p-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 resize-none'
              rows={3}
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Action */}
      <div className='flex items-center justify-between pt-4'>
        <Button
          size='sm'
          className='bg-blue-600 hover:bg-blue-700 text-white px-6'
        >
          <Plus className='h-4 w-4 mr-2' />
          Add to Supplement (+$4847.70)
        </Button>
        <Button variant='outline' size='sm' className='px-6'>
          <X className='h-4 w-4 mr-2' />
          Skip
        </Button>
      </div>
    </div>
  );
}
