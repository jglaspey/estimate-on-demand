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
  Calculator
} from 'lucide-react';
import { RuleAnalysisResult } from '../../lib/mockData';

interface IceWaterBarrierCardProps {
  ruleAnalysis: RuleAnalysisResult;
  onDecision: (decision: 'accepted' | 'rejected' | 'modified', notes?: string) => void;
}

export function IceWaterBarrierCard({ ruleAnalysis, onDecision }: IceWaterBarrierCardProps) {
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');
  const [justificationCopied, setJustificationCopied] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);

  // Mock data based on the business rule calculation
  const currentCode = 'RFG IWS';
  const currentDesc = 'Ice & water barrier';
  const currentQuantity = '800 SF';
  const currentRate = '$1.85';
  const currentTotal = '$1,480.00';
  
  // Calculation details
  const totalEaves = '180 LF';
  const soffitDepth = '24"';
  const wallThickness = '6"';
  const roofPitch = '6/12';
  const calculatedWidth = '60.4"';
  const requiredQuantity = '1,167 SF';
  const requiredTotal = '$2,158.95';
  const additionalCost = ruleAnalysis.costImpact;

  const standardJustification = `IRC R905.1.2 requires ice barrier to extend from the roof edge up the roof to a point at least 24 inches inside the exterior wall line. Based on the roof measurements (180 LF eaves, 24" soffit depth, 6" wall thickness, 6/12 pitch), the required coverage is 1,167.2 SF. The current estimate only includes 800 SF.`;

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
    return ruleAnalysis.status === 'SUPPLEMENT_NEEDED' ? AlertTriangle : CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  if (ruleAnalysis.status === 'COMPLIANT') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                Ice & Water Barrier
              </h2>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Coverage meets IRC R905.1.2 requirements
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800">
              Compliant
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <StatusIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Ice & Water Barrier Analysis
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Supplement needed • {Math.round(ruleAnalysis.confidence * 100)}% confidence
            </p>
          </div>
        </div>
      </div>

      {/* Business Rule Violation */}
      <div className="rounded-lg border-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Business Rule Violation
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-red-700 dark:text-red-300">Current Coverage:</span>
                  <p className="font-medium text-red-900 dark:text-red-100">800 SF</p>
                </div>
                <div>
                  <span className="text-red-700 dark:text-red-300">Required Coverage:</span>
                  <p className="font-medium text-red-900 dark:text-red-100">1,167 SF</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Rule: IRC R905.1.2 requires coverage 24" inside exterior wall line
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What's in the Estimate Now */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            What's in the Estimate Now
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Code:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{currentCode}</span>
            </div>
            <div className="text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Description:</span>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">{currentDesc}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Quantity & Rate:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{currentQuantity} × {currentRate}</span>
            </div>
            <div className="text-sm p-2 bg-red-50 border border-red-200 rounded dark:bg-red-950/20 dark:border-red-800">
              <span className="text-red-700 dark:text-red-300">Shortfall:</span>
              <p className="font-medium text-red-900 dark:text-red-100 mt-1">
                367 SF below IRC requirement
              </p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium flex items-center gap-1">
                  Page 2, Line 12
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{currentTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Required Calculation */}
      <div className="rounded-lg border border-blue-200 bg-white dark:border-blue-700 dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                IRC R905.1.2 Calculation
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculation(!showCalculation)}
              className="h-7 px-2 text-xs border-blue-200 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900/30"
            >
              {showCalculation ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Total Eaves:</span>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{totalEaves}</p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Required Width:</span>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{calculatedWidth}</p>
            </div>
          </div>
          
          {showCalculation && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3 dark:bg-blue-950/20 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Step-by-Step Calculation:</h4>
              <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200 font-mono">
                <div>1. Soffit depth: {soffitDepth}</div>
                <div>2. Wall thickness: {wallThickness}</div>
                <div>3. Inside wall line: 24" + 6" = 30"</div>
                <div>4. Roof pitch adjustment (6/12): 30" × 1.118 = 33.54"</div>
                <div>5. Coverage from edge: 33.54" + 24" = 57.54"</div>
                <div>6. Add safety margin: 57.54" + 3" = {calculatedWidth}</div>
                <div className="border-t border-blue-300 pt-1 mt-2 dark:border-blue-700">
                  <div>Result: 180 LF × {calculatedWidth} ÷ 12 = {requiredQuantity}</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <button className="text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 font-medium flex items-center gap-1">
              Measurements from Page 1
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Required Correction */}
      <div className="rounded-lg border border-emerald-200 bg-white dark:border-emerald-700 dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
            Required Correction
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Code:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{currentCode}</span>
            </div>
            <div className="text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Description:</span>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">{currentDesc}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Quantity & Rate:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{requiredQuantity} × {currentRate}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{requiredTotal}</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500">
                  <Plus className="h-3 w-3 text-white" />
                </div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Additional Cost
                </span>
              </div>
              <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                +${additionalCost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Carrier Justification */}
      <div className="rounded-lg border border-blue-200 bg-white dark:border-blue-700 dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Carrier Justification
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
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Additional Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any custom notes for this supplement..."
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
                {ruleAnalysis.userDecision === 'accepted' && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                    Added +${additionalCost.toLocaleString()} to supplement
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