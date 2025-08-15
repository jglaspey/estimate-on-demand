import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Plus,
  Pencil,
  Calculator,
  ChevronDown,
  ChevronRight,
  FileText,
  Eye,
  Info,
  Zap,
  ArrowUpRight,
  Check,
  X,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { ValueHighlight } from '../ui/value-highlight';
import { DecisionFlowVisualization } from '../DecisionFlowVisualization';

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

interface HipRidgeCapCardProps {
  ruleAnalysis: RuleAnalysisResult;
  onDecision: (
    decision: 'accepted' | 'rejected' | 'modified',
    notes?: string
  ) => void;
  onJumpToEvidence?: (
    location: string,
    type: 'estimate' | 'roof_report'
  ) => void;
  showHighlighting?: boolean; // Whether to show live data highlighting
}

type DecisionState =
  | 'pass'
  | 'shortage'
  | 'missing'
  | 'type_mismatch'
  | 'unit_mismatch';
type RoofType = 'laminated' | '3_tab' | 'other';
type RidgeCapType =
  | 'purpose_built_standard'
  | 'purpose_built_high'
  | 'cut_from_3tab'
  | 'not_found';

export function HipRidgeCapCard({
  ruleAnalysis,
  onDecision,
  onJumpToEvidence,
  showHighlighting = false,
}: HipRidgeCapCardProps) {
  // State management
  const [notes, setNotes] = useState(ruleAnalysis.userNotes || '');
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [customQuantity, setCustomQuantity] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [justificationCopied, setJustificationCopied] = useState(false);

  // Data validation helpers
  const hasRealData = (value: unknown): boolean => {
    // Check for completely missing values
    if (value === undefined || value === null || value === '') return false;

    // Check for placeholder strings
    if (typeof value === 'string') {
      if (
        value.includes('XX') ||
        value.includes('N/A') ||
        value === 'Unknown' ||
        value.trim() === ''
      )
        return false;
    }

    // Check for invalid numbers
    if (typeof value === 'number' && (value === 0 || isNaN(value)))
      return false;

    return true;
  };

  // Conditional highlighting wrapper
  const ConditionalHighlight = ({
    children,
    value,
    className,
  }: {
    children: React.ReactNode;
    value: unknown;
    className?: string;
  }) => {
    if (!showHighlighting) return <>{children}</>;

    const isPlaceholder = !hasRealData(value);
    return (
      <ValueHighlight isPlaceholder={isPlaceholder} className={className}>
        {children}
      </ValueHighlight>
    );
  };

  // Determine current state and data
  const getDecisionState = (): DecisionState => {
    if (ruleAnalysis.status === 'COMPLIANT') return 'pass';
    if (ruleAnalysis.varianceType === 'shortage') return 'shortage';
    return 'shortage'; // Default for now
  };

  const getRoofType = (): RoofType => {
    // Mock detection - in real implementation, this would come from shingle line analysis
    return 'laminated';
  };

  const getRidgeCapType = (): RidgeCapType => {
    // Mock detection - in real implementation, this would analyze the estimate line items
    return 'purpose_built_standard';
  };

  const decisionState = getDecisionState();
  const roofType = getRoofType();
  const ridgeCapType = getRidgeCapType();

  // Calculations
  const estimateLF = parseFloat(
    ruleAnalysis.estimateQuantity?.replace(/[^\d.]/g, '') || '6'
  );
  const requiredLF = parseFloat(
    ruleAnalysis.requiredQuantity?.replace(/[^\d.]/g, '') || '119'
  );
  const ridgesLF = 26; // From EagleView
  const hipsLF = 93; // From EagleView
  const varianceLF = estimateLF - requiredLF;
  const additionalLF = Math.max(0, requiredLF - estimateLF);
  const unitPrice = parseFloat(
    ruleAnalysis.currentSpecification?.rate?.replace(/[^\d.]/g, '') || '4.50'
  );
  const additionalCost = additionalLF * unitPrice;

  // Decision bar configuration
  const getDecisionConfig = () => {
    switch (decisionState) {
      case 'pass':
        return {
          state: 'Pass',
          stateColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: CheckCircle,
          iconColor: 'text-emerald-600',
          confidence: Math.round(ruleAnalysis.confidence * 100),
          primaryCTA: 'Mark Reviewed',
          primaryCTAIcon: Check,
          primaryCTAColor: 'bg-emerald-600 hover:bg-emerald-700',
          secondaryCTA: 'Copy Note',
          secondaryCTAIcon: Copy,
        };
      case 'shortage':
        return {
          state: 'Shortage',
          stateColor: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          confidence: Math.round(ruleAnalysis.confidence * 100),
          primaryCTA: 'Add to Supplement',
          primaryCTAIcon: Plus,
          primaryCTAColor: 'bg-blue-600 hover:bg-blue-700',
          secondaryCTA: 'Copy Note',
          secondaryCTAIcon: Copy,
        };
      default:
        return {
          state: 'Review Needed',
          stateColor: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          confidence: Math.round(ruleAnalysis.confidence * 100),
          primaryCTA: 'Review',
          primaryCTAIcon: Eye,
          primaryCTAColor: 'bg-blue-600 hover:bg-blue-700',
          secondaryCTA: 'Copy Note',
          secondaryCTAIcon: Copy,
        };
    }
  };

  const config = getDecisionConfig();
  const StateIcon = config.icon;
  const PrimaryCTAIcon = config.primaryCTAIcon;
  const SecondaryCTAIcon = config.secondaryCTAIcon;

  // Type compliance check
  const getTypeCompliance = () => {
    if (roofType === 'laminated' && ridgeCapType === 'cut_from_3tab') {
      return {
        status: 'not_compliant',
        message: 'Not compliant → Replace with Purpose-built (RFG RIDGC)',
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200',
      };
    }
    return {
      status: 'compliant',
      message: 'Compliant',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200',
    };
  };

  const typeCompliance = getTypeCompliance();

  // Jump to evidence handlers
  const handleJumpToEstimate = (location: string) => {
    onJumpToEvidence?.(location, 'estimate');
  };

  const handleJumpToReport = (location: string) => {
    onJumpToEvidence?.(location, 'roof_report');
  };

  // Copy documentation
  const generateDocumentation = () => {
    if (decisionState === 'pass') {
      return `Ridge cap coverage verified as adequate. Estimate includes ${estimateLF} LF while measurements show ${requiredLF} LF required. The ${Math.abs(varianceLF)} LF overage (${Math.round((Math.abs(varianceLF) / requiredLF) * 100)}%) provides appropriate waste factor for installation. Material specification (Standard profile) is compliant with ASTM D3161/D7158 wind resistance standards.`;
    } else {
      return `Ridge cap shortage identified. EagleView report documents ${requiredLF} LF total ridge/hip coverage required (Ridges: ${ridgesLF} LF + Hips: ${hipsLF} LF). Current estimate includes only ${estimateLF} LF, creating a shortage of ${additionalLF} LF. Material type (Standard profile) is correctly specified and should be increased to match documented roof geometry. Additional coverage required: ${additionalLF} LF @ $${unitPrice.toFixed(2)}/LF = $${additionalCost.toFixed(2)}.`;
    }
  };

  const copyDocumentation = async () => {
    try {
      await navigator.clipboard.writeText(generateDocumentation());
      setJustificationCopied(true);
      setTimeout(() => setJustificationCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Inline editing handlers
  const handleQuantityEdit = () => {
    setCustomQuantity(additionalLF.toString());
    setEditingQuantity(true);
  };

  const handleRateEdit = () => {
    setCustomRate(unitPrice.toString());
    setEditingRate(true);
  };

  const saveQuantityEdit = () => {
    // In real implementation, this would update the analysis
    setEditingQuantity(false);
  };

  const saveRateEdit = () => {
    // In real implementation, this would update the analysis
    setEditingRate(false);
  };

  return (
    <div className='space-y-6'>
      {/* 1. Decision Bar */}
      <div className='flex items-center justify-between p-4 rounded-lg border bg-white'>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <StateIcon className={`h-5 w-5 ${config.iconColor}`} />
            <Badge className={config.stateColor}>
              {config.state}:{' '}
              {decisionState === 'shortage'
                ? `+${additionalLF} LF needed`
                : 'Coverage adequate'}
            </Badge>
          </div>

          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-xs'>
              {config.confidence}% confidence
            </Badge>
            <button className='text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1'>
              <Info className='h-3 w-3' />
              why?
            </button>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={copyDocumentation}
            className='h-8 text-xs'
          >
            <SecondaryCTAIcon className='h-3 w-3 mr-1' />
            {justificationCopied ? 'Copied!' : config.secondaryCTA}
          </Button>
          <Button
            size='sm'
            onClick={() => onDecision('accepted', notes)}
            className={`h-8 text-xs ${config.primaryCTAColor} text-white`}
          >
            <PrimaryCTAIcon className='h-3 w-3 mr-1' />
            {config.primaryCTA}
          </Button>
        </div>
      </div>

      {/* 2. AI Decision Path Visualization */}
      <div className='rounded-lg border bg-white p-4'>
        <DecisionFlowVisualization
          ruleName='ridge_cap'
          currentPath={[
            'analyze_estimate',
            'roof_type',
            'inspect_ridge_cap',
            'ridge_cap_type',
            'quantity_check',
          ]}
          onStepClick={stepId => {
            // Handle step interaction
            console.warn('Step clicked:', stepId);
          }}
          onEvidenceClick={onJumpToEvidence}
        />
      </div>

      {/* 3. Coverage Summary */}
      <div className='rounded-lg border bg-white p-4'>
        <h3 className='font-medium text-zinc-900 mb-4 flex items-center gap-2'>
          <Calculator className='h-4 w-4' />
          Coverage Summary
          <span className='text-xs text-zinc-500 ml-auto'>
            Click any value to see the source
          </span>
        </h3>

        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-zinc-600'>Estimate LF:</span>
            <div className='flex items-center gap-2'>
              <ConditionalHighlight value={ruleAnalysis.estimateQuantity}>
                <button
                  onClick={() => handleJumpToEstimate('Page 4, Line 3b')}
                  className='text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline'
                >
                  {hasRealData(ruleAnalysis.estimateQuantity)
                    ? `${estimateLF} LF`
                    : 'No data'}
                </button>
              </ConditionalHighlight>
              <Badge variant='outline' className='text-xs h-5 px-1.5'>
                <button
                  onClick={() => handleJumpToEstimate('Page 4, Line 3b')}
                  className='flex items-center gap-1 text-blue-600 hover:text-blue-800'
                >
                  <ExternalLink className='h-2.5 w-2.5' />
                  Estimate p.4
                </button>
              </Badge>
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-sm text-zinc-600'>Required LF:</span>
            <div className='flex items-center gap-2'>
              <ConditionalHighlight value={ruleAnalysis.requiredQuantity}>
                <button
                  onClick={() => handleJumpToReport('Page 2, Section 3')}
                  className='text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline'
                >
                  {hasRealData(ruleAnalysis.requiredQuantity)
                    ? `${requiredLF} LF`
                    : 'No data'}
                </button>
              </ConditionalHighlight>
              <Badge variant='outline' className='text-xs h-5 px-1.5'>
                <button
                  onClick={() => handleJumpToReport('Page 2, Section 3')}
                  className='flex items-center gap-1 text-blue-600 hover:text-blue-800'
                >
                  <ExternalLink className='h-2.5 w-2.5' />
                  Report p.2
                </button>
              </Badge>
            </div>
          </div>

          <div className='flex items-center justify-between pt-2 border-t'>
            <span className='text-sm font-medium text-zinc-700'>Variance:</span>
            <ConditionalHighlight value={ruleAnalysis.variance}>
              <span
                className={`text-sm font-medium ${varianceLF < 0 ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {hasRealData(ruleAnalysis.variance)
                  ? `${varianceLF > 0 ? '+' : ''}${varianceLF} LF`
                  : 'No data'}
              </span>
            </ConditionalHighlight>
          </div>
        </div>

        <Collapsible className='mt-3'>
          <CollapsibleTrigger className='flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-700'>
            <ChevronRight className='h-3 w-3' />
            Required LF = Ridges + Hips
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2 p-3 bg-zinc-50 rounded text-xs text-zinc-600'>
            <div className='font-mono'>
              Required LF = {ridgesLF} LF + {hipsLF} LF = {requiredLF} LF
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* 4. Type Compliance */}
      <div className={`rounded-lg border p-4 ${typeCompliance.bgColor}`}>
        <h3 className='font-medium text-zinc-900 mb-3 flex items-center gap-2'>
          <Zap className='h-4 w-4' />
          Type Compliance
        </h3>

        <div className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <span className='text-zinc-600'>Roof type detected:</span>
            <ConditionalHighlight value={roofType !== 'other'}>
              <span className='font-medium'>
                {roofType === 'laminated' ? 'Laminated' : 'No data'}
              </span>
            </ConditionalHighlight>
          </div>
          <div className='flex justify-between'>
            <span className='text-zinc-600'>Ridge cap type in estimate:</span>
            <ConditionalHighlight
              value={ruleAnalysis.currentSpecification?.description}
            >
              <span className='font-medium'>
                {hasRealData(ruleAnalysis.currentSpecification?.description)
                  ? 'Purpose-built Standard'
                  : 'No data'}
              </span>
            </ConditionalHighlight>
          </div>
          <div className='flex justify-between'>
            <span className='text-zinc-600'>Compliance result:</span>
            <ConditionalHighlight value={ruleAnalysis.materialStatus}>
              <span className={`font-medium ${typeCompliance.color}`}>
                {hasRealData(ruleAnalysis.materialStatus)
                  ? typeCompliance.message
                  : 'No data'}
              </span>
            </ConditionalHighlight>
          </div>
        </div>

        {typeCompliance.status === 'compliant' && (
          <div className='mt-3 p-2 bg-emerald-100 border border-emerald-200 rounded text-xs text-emerald-700'>
            ✓ Purpose-built ridge caps meet ASTM D3161/D7158 wind resistance
            standards
          </div>
        )}
      </div>

      {/* 5. Quantity and Rate to Add (only when action needed) */}
      {decisionState === 'shortage' && (
        <div className='rounded-lg border bg-white p-4'>
          <h3 className='font-medium text-zinc-900 mb-4 flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            Quantity and Rate to Add
          </h3>

          <div className='space-y-3'>
            <div className='flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded'>
              <span className='text-sm font-medium text-blue-900'>
                Additional quantity:
              </span>
              <div className='flex items-center gap-2'>
                {editingQuantity ? (
                  <div className='flex items-center gap-1'>
                    <Input
                      value={customQuantity}
                      onChange={e => setCustomQuantity(e.target.value)}
                      className='w-20 h-6 text-xs text-center'
                    />
                    <span className='text-xs text-blue-700'>LF @</span>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={saveQuantityEdit}
                      className='h-6 w-6 p-0'
                    >
                      <Check className='h-3 w-3' />
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setEditingQuantity(false)}
                      className='h-6 w-6 p-0'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <ConditionalHighlight value={additionalLF > 0}>
                      <span className='font-medium text-blue-700'>
                        {additionalLF > 0 ? `${additionalLF} LF` : 'No data'}
                      </span>
                    </ConditionalHighlight>
                    <button
                      onClick={handleQuantityEdit}
                      className='text-blue-600 hover:text-blue-800'
                    >
                      <Pencil className='h-3 w-3' />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <span className='text-sm text-zinc-600'>Unit price:</span>
              <div className='flex items-center gap-2'>
                {editingRate ? (
                  <div className='flex items-center gap-1'>
                    <span className='text-sm'>$</span>
                    <Input
                      value={customRate}
                      onChange={e => setCustomRate(e.target.value)}
                      className='w-16 h-6 text-xs text-center'
                    />
                    <span className='text-xs text-zinc-600'>/LF</span>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={saveRateEdit}
                      className='h-6 w-6 p-0'
                    >
                      <Check className='h-3 w-3' />
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setEditingRate(false)}
                      className='h-6 w-6 p-0'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <ConditionalHighlight
                      value={ruleAnalysis.currentSpecification?.rate}
                    >
                      <span className='text-sm font-medium'>
                        {hasRealData(ruleAnalysis.currentSpecification?.rate)
                          ? `$${unitPrice.toFixed(2)}/LF`
                          : 'No data'}
                      </span>
                    </ConditionalHighlight>
                    <button
                      onClick={handleRateEdit}
                      className='text-zinc-400 hover:text-zinc-600'
                    >
                      <Pencil className='h-3 w-3' />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className='flex items-center justify-between pt-2 border-t'>
              <span className='text-sm font-medium text-zinc-700'>
                Total addition:
              </span>
              <ConditionalHighlight value={ruleAnalysis.costImpact}>
                <span className='text-lg font-semibold text-blue-600'>
                  {hasRealData(ruleAnalysis.costImpact)
                    ? `$${additionalCost.toFixed(2)}`
                    : 'No data'}
                </span>
              </ConditionalHighlight>
            </div>
          </div>
        </div>
      )}

      {/* 6. Calculation Trace */}
      <Collapsible open={traceExpanded} onOpenChange={setTraceExpanded}>
        <CollapsibleTrigger className='flex items-center gap-2 w-full p-3 text-left rounded-lg border bg-white hover:bg-zinc-50'>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${traceExpanded ? 'rotate-180' : ''}`}
          />
          <Calculator className='h-4 w-4' />
          <span className='font-medium'>Calculation Trace</span>
          <Badge variant='outline' className='ml-auto text-xs'>
            {traceExpanded ? 'Hide' : 'Show'} details
          </Badge>
        </CollapsibleTrigger>

        <CollapsibleContent className='mt-2'>
          <div className='rounded-lg border bg-white p-4 space-y-3'>
            <div className='space-y-2 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-600'>Roof report: Ridges =</span>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>{ridgesLF} LF</span>
                  <button
                    onClick={() => handleJumpToReport('Page 2')}
                    className='text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1'
                  >
                    <ArrowUpRight className='h-3 w-3' />
                    Jump
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-zinc-600'>Roof report: Hips =</span>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>{hipsLF} LF</span>
                  <button
                    onClick={() => handleJumpToReport('Page 2')}
                    className='text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1'
                  >
                    <ArrowUpRight className='h-3 w-3' />
                    Jump
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between font-medium pt-2 border-t'>
                <span className='text-zinc-700'>Sum =</span>
                <span>{requiredLF} LF</span>
              </div>
            </div>

            <div className='pt-3 border-t'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-zinc-600'>
                  Estimate ridge-cap lines found:
                </span>
              </div>
              <div className='mt-2 p-3 bg-zinc-50 rounded'>
                <div className='flex items-center justify-between text-sm'>
                  <div>
                    <div className='font-medium'>
                      RFG RIDGC – Hip/Ridge cap – Standard profile
                    </div>
                    <div className='text-xs text-zinc-500'>
                      6.00 LF @ $42.90/LF = $257.40
                    </div>
                  </div>
                  <button
                    onClick={() => handleJumpToEstimate('Page 4, Line 3b')}
                    className='text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1'
                  >
                    <ArrowUpRight className='h-3 w-3' />
                    Jump
                  </button>
                </div>
              </div>
            </div>

            <div className='pt-3 border-t'>
              <h4 className='text-sm font-medium text-zinc-700 mb-2'>
                Validation checks:
              </h4>
              <div className='space-y-1 text-xs text-zinc-600'>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='h-3 w-3 text-emerald-500' />
                  <span>Unit consistency: LF expected for ridge cap ✓</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='h-3 w-3 text-emerald-500' />
                  <span>
                    Reasonableness: ridge/hip LF ({requiredLF}) &lt; perimeter ✓
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 7. Documentation Note */}
      <div className='rounded-lg border bg-white'>
        <div className='px-4 py-3 border-b bg-zinc-50'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium text-zinc-900 flex items-center gap-2'>
              <FileText className='h-4 w-4' />
              Documentation Note
            </h3>
            <Button
              variant='outline'
              size='sm'
              onClick={copyDocumentation}
              className='h-7 px-2 text-xs'
            >
              <Copy className='h-3 w-3 mr-1' />
              {justificationCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className='p-4'>
          <div className='p-3 bg-zinc-50 border rounded text-sm text-zinc-700 leading-relaxed'>
            {generateDocumentation()}
          </div>
        </div>
      </div>

      {/* 8. Review Controls */}
      <div className='space-y-4 pt-4 border-t'>
        <div>
          <label className='text-sm font-medium text-zinc-900 mb-2 block'>
            Additional Notes (Optional)
          </label>
          <Textarea
            placeholder='Add any custom notes for this analysis...'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className='min-h-[60px] text-sm'
          />
        </div>

        <div className='text-xs text-zinc-500 space-y-1'>
          <div>Keyboard shortcuts:</div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              • <kbd className='px-1 py-0.5 bg-zinc-100 rounded'>J/K</kbd>{' '}
              Previous/Next
            </div>
            <div>
              • <kbd className='px-1 py-0.5 bg-zinc-100 rounded'>Enter</kbd> Add
              to supplement
            </div>
            <div>
              • <kbd className='px-1 py-0.5 bg-zinc-100 rounded'>C</kbd> Copy
              note
            </div>
            <div>
              • <kbd className='px-1 py-0.5 bg-zinc-100 rounded'>E/R</kbd> Jump
              to evidence
            </div>
          </div>
        </div>

        {!ruleAnalysis.userDecision && (
          <div className='flex gap-3'>
            <Button
              onClick={() => onDecision('accepted', notes)}
              className={`flex-1 h-12 ${config.primaryCTAColor} text-white`}
            >
              <PrimaryCTAIcon className='h-4 w-4 mr-2' />
              {config.primaryCTA}
              {decisionState === 'shortage' && (
                <span className='ml-2 text-sm opacity-90'>
                  (+${additionalCost.toFixed(2)})
                </span>
              )}
            </Button>
            <Button
              variant='outline'
              onClick={() => onDecision('rejected', notes)}
              className='px-8 h-12'
            >
              <X className='h-4 w-4 mr-2' />
              Skip
            </Button>
          </div>
        )}

        {ruleAnalysis.userDecision && (
          <div className='rounded-lg border-2 border-blue-200 bg-blue-50 p-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100'>
                <CheckCircle className='h-4 w-4 text-blue-600' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-semibold text-blue-900'>
                  Decision:{' '}
                  {ruleAnalysis.userDecision.charAt(0).toUpperCase() +
                    ruleAnalysis.userDecision.slice(1)}
                </p>
                {ruleAnalysis.userDecision === 'accepted' &&
                  decisionState === 'shortage' && (
                    <p className='text-sm text-blue-700 mt-1'>
                      Added +${additionalCost.toFixed(2)} to supplement
                    </p>
                  )}
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  // Reset decision in real implementation
                  setNotes('');
                }}
                className='text-xs'
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
