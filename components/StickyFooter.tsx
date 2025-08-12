'use client';

import { Button } from './button';
import { Badge } from './badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Clock
} from 'lucide-react';
import { RuleAnalysisResult } from '../types';

interface StickyFooterProps {
  currentRule: number;
  totalRules: number;
  ruleAnalysis: RuleAnalysisResult[];
  onPrevious: () => void;
  onNext: () => void;
  onRuleSelect: (index: number) => void;
  mode: 'overview' | 'review';
  supplementTotal: number;
  originalTotal: number;
}

export function StickyFooter({
  currentRule,
  totalRules,
  ruleAnalysis,
  onPrevious,
  onNext,
  onRuleSelect,
  mode,
  supplementTotal,
  originalTotal
}: StickyFooterProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return CheckCircle;
      case 'SUPPLEMENT_NEEDED': return AlertTriangle;
      case 'INSUFFICIENT_DATA': return HelpCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'text-emerald-600 dark:text-emerald-400';
      case 'SUPPLEMENT_NEEDED': return 'text-red-600 dark:text-red-400';
      case 'INSUFFICIENT_DATA': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-zinc-600 dark:text-zinc-400';
    }
  };

  const completedDecisions = ruleAnalysis.filter(rule => 
    rule.status === 'COMPLIANT' || rule.userDecision
  ).length;

  const progressPercent = (completedDecisions / totalRules) * 100;

  if (mode === 'overview') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-zinc-200 shadow-lg shadow-zinc-900/5 dark:bg-zinc-950/95 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Analysis Complete</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Ready for review</p>
                </div>
              </div>
              
              <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-700" />
              
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">
                    {ruleAnalysis.filter(r => r.status !== 'COMPLIANT').length}
                  </span>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">supplements found</span>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Potential Supplement
                </p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  +${supplementTotal.toLocaleString()}
                </p>
              </div>
              
              <Button 
                onClick={() => onRuleSelect(0)}
                className="h-10 px-6 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-sm"
              >
                Review Supplements
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-zinc-200 shadow-lg shadow-zinc-900/5 dark:bg-zinc-950/95 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center gap-8">
          {/* Progress Section */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Rule {currentRule + 1} of {totalRules}: {
                  ruleAnalysis[currentRule]?.ruleName === 'ridge_cap' ? 'Hip/Ridge Cap Quality' :
                  ruleAnalysis[currentRule]?.ruleName === 'starter_strip' ? 'Starter Strip Quality' :
                  ruleAnalysis[currentRule]?.ruleName === 'drip_edge' ? 'Drip Edge & Gutter Apron' :
                  ruleAnalysis[currentRule]?.ruleName === 'ice_water_barrier' ? 'Ice & Water Barrier' : ''
                }
              </p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {completedDecisions}/{totalRules} completed
              </p>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-2 dark:bg-zinc-700">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-in-out dark:bg-emerald-400" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Rule Status Indicators */}
          <div className="flex items-center gap-2">
            {ruleAnalysis.map((rule, index) => {
              const StatusIcon = getStatusIcon(rule.status);
              const statusColor = getStatusColor(rule.status);
              const isActive = index === currentRule;
              const isCompleted = rule.status === 'COMPLIANT' || rule.userDecision;
              
              return (
                <button
                  key={rule.ruleName}
                  onClick={() => onRuleSelect(index)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                    isActive 
                      ? 'bg-zinc-900 border-zinc-900 shadow-sm dark:bg-zinc-50 dark:border-zinc-50' 
                      : `bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 ${
                          rule.status === 'SUPPLEMENT_NEEDED' ? 'ring-1 ring-red-200 dark:ring-red-800' :
                          rule.status === 'COMPLIANT' ? 'ring-1 ring-emerald-200 dark:ring-emerald-800' :
                          'ring-1 ring-amber-200 dark:ring-amber-800'
                        }`
                  }`}
                >
                  <StatusIcon className={`h-4 w-4 ${
                    isActive 
                      ? 'text-white dark:text-zinc-900' 
                      : statusColor
                  }`} />
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 border-2 border-white dark:bg-emerald-400 dark:border-zinc-950">
                      <div className="h-1 w-1 rounded-full bg-white dark:bg-zinc-900" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={currentRule === 0}
              className="h-8 px-3 border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              size="sm"
              onClick={onNext}
              disabled={currentRule === totalRules - 1}
              className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Summary */}
          <div className="text-right border-l border-zinc-200 pl-6 dark:border-zinc-700">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Impact
            </p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              +${supplementTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}