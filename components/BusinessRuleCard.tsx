import { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  ChevronDown, 
  Eye, 
  DollarSign,
  FileText,
  Calculator
} from 'lucide-react';

import { RuleAnalysisResult } from '@/types';
import { LineItem } from '@/lib/types/document-extraction';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface BusinessRuleCardProps {
  ruleAnalysis: RuleAnalysisResult;
  onDecision: (ruleName: string, decision: 'accepted' | 'rejected' | 'modified', notes?: string) => void;
}

export function BusinessRuleCard({ ruleAnalysis, onDecision }: BusinessRuleCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [notes, setNotes] = useState(ruleAnalysis.userNotes);

  const getRuleTitle = (ruleName: string) => {
    const titles = {
      ridge_cap: 'Hip/Ridge Cap Quality',
      starter_strip: 'Starter Strip Quality',
      drip_edge: 'Drip Edge & Gutter Apron',
      ice_water_barrier: 'Ice & Water Barrier'
    };
    return titles[ruleName as keyof typeof titles] || ruleName;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      COMPLIANT: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800 border-green-200',
        bgColor: 'bg-green-50',
        iconColor: 'text-green-600'
      },
      SUPPLEMENT_NEEDED: {
        icon: AlertTriangle,
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-600'
      },
      INSUFFICIENT_DATA: {
        icon: HelpCircle,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        bgColor: 'bg-orange-50',
        iconColor: 'text-orange-600'
      }
    };
    return configs[status as keyof typeof configs];
  };

  const statusConfig = getStatusConfig(ruleAnalysis.status);
  const StatusIcon = statusConfig.icon;

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'text': return FileText;
      case 'measurement': return Calculator;
      case 'calculation': return Calculator;
      default: return FileText;
    }
  };

  const LineItemTable = ({ items, title }: { items: LineItem[], title: string }) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <h5 className="font-medium">{title}</h5>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                  <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Card className={`border-2 ${statusConfig.bgColor}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <StatusIcon className={`h-6 w-6 ${statusConfig.iconColor}`} />
            {getRuleTitle(ruleAnalysis.ruleName)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              {ruleAnalysis.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Reasoning */}
        <div className="p-3 bg-background rounded-lg border">
          <p className="text-sm">{ruleAnalysis.reasoning}</p>
        </div>

        {/* Cost Impact */}
        {ruleAnalysis.costImpact > 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <DollarSign className="h-4 w-4 text-yellow-600" />
            <span className="font-medium">Cost Impact: +${ruleAnalysis.costImpact.toLocaleString()}</span>
          </div>
        )}

        {/* Evidence Panel */}
        <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Evidence (XXX items)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showEvidence ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="p-3 border rounded-lg bg-background">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm">Evidence content will appear here when analysis is complete</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Source: XXX</span>
                    <span>XXX% confidence</span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Current Items & Recommendations */}
        <Collapsible open={showRecommendations} onOpenChange={setShowRecommendations}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>View Line Items & Recommendations</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showRecommendations ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-3">
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Line items and recommendations will appear here when analysis is complete</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* User Decision Area */}
        {ruleAnalysis.status !== 'COMPLIANT' && (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add notes to justify your decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => onDecision(ruleAnalysis.ruleName, 'accepted', notes)}
                className="flex-1"
                disabled={ruleAnalysis.userDecision === 'accepted'}
              >
                {ruleAnalysis.userDecision === 'accepted' ? 'Accepted' : 'Accept Recommendation'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onDecision(ruleAnalysis.ruleName, 'rejected', notes)}
                disabled={ruleAnalysis.userDecision === 'rejected'}
              >
                {ruleAnalysis.userDecision === 'rejected' ? 'Rejected' : 'Reject'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onDecision(ruleAnalysis.ruleName, 'modified', notes)}
                disabled={ruleAnalysis.userDecision === 'modified'}
              >
                {ruleAnalysis.userDecision === 'modified' ? 'Modified' : 'Modify'}
              </Button>
            </div>
          </div>
        )}

        {/* Decision Status */}
        {ruleAnalysis.userDecision && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                Decision: {ruleAnalysis.userDecision.charAt(0).toUpperCase() + ruleAnalysis.userDecision.slice(1)}
              </span>
            </div>
            {ruleAnalysis.userNotes && (
              <p className="mt-2 text-sm text-blue-700">{ruleAnalysis.userNotes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}