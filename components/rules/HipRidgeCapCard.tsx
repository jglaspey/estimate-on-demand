import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  CheckCircle, 
  AlertTriangle, 
  X,
  MapPin,
  Copy,
  ExternalLink,
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  CheckSquare
} from 'lucide-react';
import { RuleAnalysisResult } from '../../lib/mockData';

interface HipRidgeCapCardProps {
  ruleAnalysis: RuleAnalysisResult;
  onDecision: (decision: 'accepted' | 'rejected' | 'modified', notes?: string) => void;
}

export function HipRidgeCapCard({ ruleAnalysis, onDecision }: HipRidgeCapCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');
  const [justificationCopied, setJustificationCopied] = useState(false);

  const isAdequate = ruleAnalysis.status === 'COMPLIANT';
  const isShortage = ruleAnalysis.varianceType === 'shortage';
  const isExcess = ruleAnalysis.varianceType === 'adequate' && ruleAnalysis.variance?.startsWith('+');

  // Dynamic content based on scenario
  const getStatusInfo = () => {
    if (isAdequate) {
      return {
        badge: 'Coverage Verified',
        icon: CheckCircle,
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        iconColor: 'text-emerald-600',
        textColor: 'text-emerald-900'
      };
    } else {
      return {
        badge: 'Supplement Needed',
        icon: AlertTriangle,
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        textColor: 'text-red-900'
      };
    }
  };

  const getVarianceStatus = () => {
    if (isShortage) {
      return {
        label: 'SHORTAGE',
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
        icon: '⚠️'
      };
    } else if (isExcess) {
      return {
        label: 'ADEQUATE',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800',
        icon: '✅'
      };
    } else {
      return {
        label: 'EXACT',
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
        icon: '✓'
      };
    }
  };

  const statusInfo = getStatusInfo();
  const varianceStatus = getVarianceStatus();
  const StatusIcon = statusInfo.icon;

  const standardJustification = isAdequate 
    ? `Ridge cap coverage verified as adequate. Estimate includes ${ruleAnalysis.estimateQuantity} while measurements show ${ruleAnalysis.requiredQuantity} required. The ${ruleAnalysis.variance?.replace('+', '')} overage (7%) provides appropriate waste factor for installation.`
    : `Roof measurement report indicates ${ruleAnalysis.requiredQuantity?.replace(' LF', '')} linear feet of combined ridges and hips requiring ridge cap coverage. Current estimate includes only ${ruleAnalysis.estimateQuantity}, creating a shortage of ${ruleAnalysis.variance?.replace('-', '')}. Standard profile ridge cap material is correctly specified and should be increased to match documented roof geometry.`;

  const copyJustification = async () => {
    try {
      await navigator.clipboard.writeText(standardJustification);
      setJustificationCopied(true);
      setTimeout(() => setJustificationCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${statusInfo.bgColor} dark:${statusInfo.bgColor.replace('50', '900/30')}`}>
            <StatusIcon className={`h-6 w-6 ${statusInfo.iconColor} dark:${statusInfo.iconColor.replace('600', '400')}`} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Hip/Ridge Cap Analysis
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {statusInfo.badge} • {Math.round(ruleAnalysis.confidence * 100)}% confidence
            </p>
          </div>
        </div>
      </div>

      {/* Coverage Analysis */}
      <div className={`rounded-lg border ${statusInfo.borderColor} ${statusInfo.bgColor} p-4 dark:${statusInfo.bgColor.replace('50', '950/20')} dark:${statusInfo.borderColor.replace('200', '800')}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${statusInfo.textColor} dark:${statusInfo.textColor.replace('900', '100')}`}>
            Coverage Analysis
          </h3>
          <Badge className={`text-xs ${varianceStatus.color}`}>
            {varianceStatus.icon} {varianceStatus.label}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {/* Estimate Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${statusInfo.textColor.replace('900', '700')} dark:${statusInfo.textColor.replace('900', '300')}`}>
                Ridge Cap Coverage (Estimate):
              </span>
              <button className="text-xs text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Page 4
              </button>
            </div>
            <span className={`font-semibold ${statusInfo.textColor} dark:${statusInfo.textColor.replace('900', '100')}`}>
              {ruleAnalysis.estimateQuantity || 'N/A'}
            </span>
          </div>

          {/* Required Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${statusInfo.textColor.replace('900', '700')} dark:${statusInfo.textColor.replace('900', '300')}`}>
                Required (per Report):
              </span>
              <button className="text-xs text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Report
              </button>
            </div>
            <span className={`font-semibold ${statusInfo.textColor} dark:${statusInfo.textColor.replace('900', '100')}`}>
              {ruleAnalysis.requiredQuantity || 'N/A'}
            </span>
          </div>

          {/* Variance Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
            <span className={`text-sm font-medium ${statusInfo.textColor.replace('900', '700')} dark:${statusInfo.textColor.replace('900', '300')}`}>
              Variance:
            </span>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${statusInfo.textColor} dark:${statusInfo.textColor.replace('900', '100')}`}>
                {ruleAnalysis.variance || 'N/A'}
              </span>
              {isShortage && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ({Math.round(Math.abs(parseFloat(ruleAnalysis.variance?.replace(/[^\d.-]/g, '') || '0')) / parseFloat(ruleAnalysis.requiredQuantity?.replace(/[^\d.-]/g, '') || '1') * 100)}% short)
                </span>
              )}
              {isExcess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  (7% excess)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Specification Details */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Specification Details
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Code:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {ruleAnalysis.currentSpecification?.code || 'RFG RIDGC'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Description:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {ruleAnalysis.currentSpecification?.description || 'Hip/Ridge cap - Standard profile'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Quantity & Rate:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {ruleAnalysis.currentSpecification?.quantity || '6.00 LF'} @ {ruleAnalysis.currentSpecification?.rate || '$42.90/LF'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Total:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {ruleAnalysis.currentSpecification?.total || '$257.40'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Material Status:</span>
                {ruleAnalysis.materialStatus === 'compliant' ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800">
                    ✓ Compliant
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800">
                    ✗ Non-compliant
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`rounded-lg border ${isAdequate ? 'border-emerald-200 bg-white' : 'border-emerald-200 bg-white'} dark:border-emerald-700 dark:bg-zinc-900`}>
        <div className={`px-4 py-3 border-b ${isAdequate ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-200 bg-emerald-50'} dark:border-emerald-700 dark:bg-emerald-900/20`}>
          <h3 className={`font-semibold ${isAdequate ? 'text-emerald-900' : 'text-emerald-900'} dark:text-emerald-100`}>
            Recommendation
          </h3>
        </div>
        <div className="p-4">
          {isAdequate ? (
            /* Adequate Coverage Scenario */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">No adjustment needed</span>
              </div>
              <div className="text-sm space-y-2 text-emerald-700 dark:text-emerald-300">
                <div>• Coverage exceeds requirements by {ruleAnalysis.variance?.replace('+', '')} (7%)</div>
                <div>• Appropriate waste factor included</div>
                <div>• Material specification correct</div>
              </div>
            </div>
          ) : (
            /* Shortage Scenario */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Add {ruleAnalysis.variance?.replace('-', '')} of ridge cap coverage</span>
              </div>
              
              <div className="text-sm space-y-2 text-emerald-700 dark:text-emerald-300">
                <div>• Keep same material (Standard profile)</div>
                <div>• Additional quantity: {ruleAnalysis.variance?.replace('-', '')} @ $4.50/LF = ${(parseFloat(ruleAnalysis.variance?.replace('-', '').replace(' LF', '') || '0') * 4.50).toFixed(2)}</div>
              </div>
              
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500">
                      <Plus className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Supplement Amount
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    +${ruleAnalysis.costImpact.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="rounded-lg border border-blue-200 bg-white dark:border-blue-700 dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              📋 Documentation
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={copyJustification}
              className="h-7 px-2 text-xs border-blue-200 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900/30"
            >
              <Copy className="h-3 w-3 mr-1.5" />
              {justificationCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 dark:bg-blue-950/20 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
              {standardJustification}
            </p>
          </div>
        </div>
      </div>

      {/* Decision Section */}
      <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
        {!ruleAnalysis.userDecision ? (
          <>
            <div className="flex gap-3">
              {isAdequate ? (
                /* Adequate Coverage Actions */
                <>
                  <Button
                    onClick={() => onDecision('accepted', notes)}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onDecision('rejected', notes)}
                    className="px-8 h-12 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </>
              ) : (
                /* Shortage Actions */
                <>
                  <Button
                    onClick={() => onDecision('accepted', notes)}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Supplement
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onDecision('rejected', notes)}
                    className="px-8 h-12 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Skip
                  </Button>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {isAdequate ? 'Additional Notes (Optional)' : 'Additional Notes (Optional)'}
              </label>
              <Textarea
                placeholder={isAdequate ? "Add any notes about this coverage verification..." : "Add any custom notes for this supplement..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] text-sm border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </>
        ) : (
          /* Decision Made */
          <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                  Decision: {ruleAnalysis.userDecision.charAt(0).toUpperCase() + ruleAnalysis.userDecision.slice(1)}
                </p>
                {ruleAnalysis.userNotes && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">{ruleAnalysis.userNotes}</p>
                )}
                {ruleAnalysis.userDecision === 'accepted' && !isAdequate && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                    Added +${ruleAnalysis.costImpact.toFixed(2)} to supplement
                  </p>
                )}
                {ruleAnalysis.userDecision === 'accepted' && isAdequate && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                    Coverage verified as adequate
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotes('');
                }}
                className="text-xs border-indigo-200 hover:bg-indigo-100 dark:border-indigo-700 dark:hover:bg-indigo-900/30"
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