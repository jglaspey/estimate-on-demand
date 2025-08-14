import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  AlertTriangle,
  ArrowDown,
  ExternalLink,
  Eye,
  Info,
  FileText,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import exampleImage from 'figma:asset/7de002fa689d6dd11d14c0ed44825aff434b6cef.png';

interface FlowStep {
  id: string;
  type: 'start' | 'process' | 'decision' | 'outcome';
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'future';
  confidence?: number;
  evidence?: {
    location: string;
    value: string;
    docType: 'estimate' | 'roof_report';
  };
  branches?: {
    condition: string;
    selected: boolean;
    confidence?: number;
  }[];
}

interface DecisionFlowProps {
  ruleName: 'ridge_cap' | 'starter_strip' | 'drip_edge' | 'ice_water_barrier';
  currentPath: string[];
  onStepClick?: (stepId: string) => void;
  onEvidenceClick?: (location: string, docType: 'estimate' | 'roof_report') => void;
}

export function DecisionFlowVisualization({ ruleName, currentPath, onStepClick, onEvidenceClick }: DecisionFlowProps) {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [isCompacted, setIsCompacted] = useState(false);

  // Define the flow steps for Hip/Ridge Cap analysis
  const getFlowSteps = (): FlowStep[] => {
    if (ruleName !== 'ridge_cap') return [];

    return [
      {
        id: 'start',
        type: 'start',
        title: 'Start Analysis',
        status: 'completed'
      },
      {
        id: 'analyze_estimate',
        type: 'process',
        title: 'Analyze insurance carrier estimate',
        description: 'Scanning estimate for roofing materials and ridge cap specifications',
        status: 'completed',
        confidence: 98,
        evidence: {
          location: 'Page 4, Lines 1-12',
          value: 'Roofing materials section found',
          docType: 'estimate'
        }
      },
      {
        id: 'roof_type',
        type: 'decision',
        title: 'Roof type?',
        description: 'Determining shingle type from estimate line items',
        status: 'completed',
        confidence: 95,
        evidence: {
          location: 'Page 4, Line 2',
          value: 'Laminated - comp. shingle rfg (69 EA)',
          docType: 'estimate'
        },
        branches: [
          {
            condition: 'Laminate composition shingles',
            selected: true,
            confidence: 95
          },
          {
            condition: '3-tab shingle roof',
            selected: false
          }
        ]
      },
      {
        id: 'inspect_ridge_cap',
        type: 'process',
        title: 'Inspect ridge cap line items',
        description: 'Searching for ridge cap specifications in estimate',
        status: 'completed',
        confidence: 100,
        evidence: {
          location: 'Page 4, Line 3b',
          value: 'Hip/Ridge cap - Standard profile (6.00 LF)',
          docType: 'estimate'
        }
      },
      {
        id: 'ridge_cap_type',
        type: 'decision',
        title: 'Ridge cap type?',
        description: 'Evaluating quality and compliance of specified ridge cap',
        status: 'completed',
        confidence: 92,
        evidence: {
          location: 'Page 4, Line 3b',
          value: 'Standard profile (purpose-built)',
          docType: 'estimate'
        },
        branches: [
          {
            condition: 'Purpose-built OR high-profile',
            selected: true,
            confidence: 92
          },
          {
            condition: 'Cut from 3-tab shingles',
            selected: false
          }
        ]
      },
      {
        id: 'quantity_check',
        type: 'process',
        title: 'Compare quantities',
        description: 'Validating ridge cap quantity against roof measurements',
        status: 'current',
        confidence: 88,
        evidence: {
          location: 'Page 2, Measurements',
          value: 'Total ridges/hips: 119 LF vs estimate: 6 LF',
          docType: 'roof_report'
        }
      },
      {
        id: 'outcome',
        type: 'outcome',
        title: 'Recommend quantity adjustment',
        description: 'Material type correct, but quantity insufficient for roof geometry',
        status: 'current'
      }
    ];
  };

  const flowSteps = getFlowSteps();

  const getStepStatusColor = (step: FlowStep) => {
    switch (step.status) {
      case 'completed':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-800',
          icon: 'text-emerald-600',
          border: 'border-emerald-300'
        };
      case 'current':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          border: 'border-blue-300'
        };
      case 'future':
        return {
          bg: 'bg-zinc-50 border-zinc-200',
          text: 'text-zinc-600',
          icon: 'text-zinc-400',
          border: 'border-zinc-300'
        };
      default:
        return {
          bg: 'bg-zinc-50 border-zinc-200',
          text: 'text-zinc-600',
          icon: 'text-zinc-400',
          border: 'border-zinc-300'
        };
    }
  };

  const getStepIcon = (step: FlowStep) => {
    if (step.status === 'completed') return CheckCircle;
    if (step.status === 'current') return AlertTriangle;
    return Info;
  };

  // Compacted view shows only key steps
  const getCompactedSteps = () => {
    return flowSteps.filter(step => 
      ['roof_type', 'ridge_cap_type', 'quantity_check', 'outcome'].includes(step.id)
    );
  };

  const displaySteps = isCompacted ? getCompactedSteps() : flowSteps;

  const renderCompactStep = (step: FlowStep, index: number) => {
    const colors = getStepStatusColor(step);
    const StepIcon = getStepIcon(step);

    return (
      <div key={step.id} className="flex items-center gap-3">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${colors.bg} ${colors.border} border`}>
          <StepIcon className={`h-3 w-3 ${colors.icon}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${colors.text}`}>
              {step.title}
            </span>
            
            <div className="flex items-center gap-2">
              {step.confidence && (
                <Badge variant="outline" className="text-xs h-4 px-1">
                  {step.confidence}%
                </Badge>
              )}
              
              {step.evidence && (
                <button
                  onClick={() => onEvidenceClick?.(step.evidence!.location, step.evidence!.docType)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          
          {step.branches && (
            <div className="text-xs text-zinc-500 mt-1">
              Selected: {step.branches.find(b => b.selected)?.condition}
            </div>
          )}
        </div>
        
        {index < displaySteps.length - 1 && (
          <ArrowDown className={`h-4 w-4 ml-2 ${colors.icon}`} />
        )}
      </div>
    );
  };

  const renderFullStep = (step: FlowStep, index: number) => {
    const colors = getStepStatusColor(step);
    const StepIcon = getStepIcon(step);
    const isExpanded = expandedStep === step.id;
    const isHovered = hoveredStep === step.id;

    return (
      <div key={step.id} className="relative">
        {/* Step Container */}
        <div
          className={`relative p-3 border rounded-lg transition-all cursor-pointer ${colors.bg} ${colors.border} ${
            isHovered ? 'shadow-sm' : ''
          }`}
          onMouseEnter={() => setHoveredStep(step.id)}
          onMouseLeave={() => setHoveredStep(null)}
          onClick={() => {
            setExpandedStep(isExpanded ? null : step.id);
            onStepClick?.(step.id);
          }}
        >
          {/* Step Header */}
          <div className="flex items-start gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              step.status === 'completed' ? 'bg-emerald-100 border-emerald-300' :
              step.status === 'current' ? 'bg-blue-100 border-blue-300' : 'bg-zinc-100 border-zinc-300'
            }`}>
              <StepIcon className={`h-3.5 w-3.5 ${colors.icon}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-medium ${colors.text}`}>
                  {step.title}
                </h4>
                
                <div className="flex items-center gap-2">
                  {step.confidence && (
                    <Badge variant="outline" className="text-xs h-5 px-1.5">
                      {step.confidence}% confident
                    </Badge>
                  )}
                  
                  {step.evidence && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEvidenceClick?.(step.evidence!.location, step.evidence!.docType);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {step.description && !isExpanded && (
                <p className={`text-xs mt-1 ${colors.text} opacity-75`}>
                  {step.description}
                </p>
              )}
              
              {/* Evidence Preview */}
              {step.evidence && !isExpanded && (
                <div className="mt-2 p-2 bg-white/60 border border-white/40 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Evidence:</span>
                    <span className="text-zinc-500">{step.evidence.location}</span>
                  </div>
                  <div className="mt-1 font-medium text-zinc-700">{step.evidence.value}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Decision Branches */}
          {step.branches && !isExpanded && (
            <div className="mt-3 ml-10 space-y-1">
              {step.branches.map((branch, branchIndex) => (
                <div
                  key={branchIndex}
                  className={`p-2 rounded text-xs border ${
                    branch.selected 
                      ? 'bg-blue-50 border-blue-200 text-blue-800' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{branch.condition}</span>
                    <div className="flex items-center gap-2">
                      {branch.confidence && (
                        <span className="text-xs opacity-75">
                          {branch.confidence}%
                        </span>
                      )}
                      {branch.selected && (
                        <CheckCircle className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Connector Arrow */}
        {index < displaySteps.length - 1 && (
          <div className="flex justify-center py-1">
            <ArrowDown className={`h-4 w-4 ${
              step.status === 'completed' ? 'text-emerald-500' :
              step.status === 'current' ? 'text-blue-500' : 'text-zinc-400'
            }`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-600" />
          <h3 className="font-medium text-zinc-900">AI Decision Path</h3>
          <Badge variant="outline" className="text-xs">
            Following flowchart logic
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Current</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompacted(!isCompacted)}
            className="h-7 text-xs"
          >
            {isCompacted ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronUp className="h-3 w-3 mr-1" />}
            {isCompacted ? 'Expand' : 'Compact'}
          </Button>
        </div>
      </div>
      
      {/* Explanation */}
      <div className="text-xs text-zinc-500 p-3 bg-zinc-50 border rounded">
        <div className="flex items-start gap-2">
          <Info className="h-3 w-3 mt-0.5 text-zinc-400" />
          <div>
            <div className="font-medium mb-1">How this analysis works:</div>
            <div>We follow the exact decision tree from your business rules. Each step validates against document evidence. Click any step to see supporting data, or use "View" to jump to the source.</div>
          </div>
        </div>
      </div>
      
      {/* Decision Steps */}
      <div className="space-y-2">
        {isCompacted ? (
          <div className="space-y-3 p-3 bg-white border rounded">
            {displaySteps.map((step, index) => renderCompactStep(step, index))}
          </div>
        ) : (
          displaySteps.map((step, index) => renderFullStep(step, index))
        )}
      </div>
      
      {/* Summary */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Decision Summary</span>
        </div>
        <div className="text-xs text-blue-800 space-y-1">
          <div>✅ Roof type: Laminate composition shingles (confirmed)</div>
          <div>✅ Material type: Standard profile ridge cap (compliant)</div>
          <div>⚠️ Quantity: 6 LF specified vs 119 LF required (shortage)</div>
        </div>
      </div>
    </div>
  );
}