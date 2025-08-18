import { 
  Upload, 
  FileText, 
  Search, 
  CheckCircle, 
  Clock,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  progress?: number;
}

interface ProgressIndicatorProps {
  currentStatus: string;
  steps: ProgressStep[];
}

export function ProgressIndicator({ currentStatus, steps }: ProgressIndicatorProps) {
  const getStepIcon = (step: ProgressStep) => {
    const icons = {
      upload: Upload,
      extract: FileText,
      analyze: Search,
      review: CheckCircle
    };
    
    const IconComponent = icons[step.id as keyof typeof icons] || FileText;
    
    const getIconColor = () => {
      switch (step.status) {
        case 'complete': return 'text-green-600';
        case 'in-progress': return 'text-blue-600';
        case 'error': return 'text-red-600';
        default: return 'text-gray-400';
      }
    };
    
    return <IconComponent className={`h-5 w-5 ${getIconColor()}`} />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', color: 'bg-gray-100 text-gray-800' },
      'in-progress': { variant: 'secondary' as const, label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      complete: { variant: 'secondary' as const, label: 'Complete', color: 'bg-green-100 text-green-800' },
      error: { variant: 'destructive' as const, label: 'Error', color: 'bg-red-100 text-red-800' },
      uploading: { variant: 'secondary' as const, label: 'Uploading', color: 'bg-blue-100 text-blue-800' },
      extracting: { variant: 'secondary' as const, label: 'Extracting', color: 'bg-yellow-100 text-yellow-800' },
      analyzing: { variant: 'secondary' as const, label: 'Analyzing', color: 'bg-orange-100 text-orange-800' },
      reviewing: { variant: 'secondary' as const, label: 'Reviewing', color: 'bg-purple-100 text-purple-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'secondary' as const,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getOverallProgress = () => {
    const completedSteps = steps.filter(step => step.status === 'complete').length;
    return (completedSteps / steps.length) * 100;
  };

  const getCurrentStep = () => {
    return steps.find(step => step.status === 'in-progress') || 
           steps.find(step => step.status === 'pending');
  };

  const currentStep = getCurrentStep();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analysis Progress</span>
          {getStatusBadge(currentStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(getOverallProgress())}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
              <div>
                <p className="font-medium text-blue-800">{currentStep.title}</p>
                <p className="text-sm text-blue-600">{currentStep.description}</p>
              </div>
            </div>
            {currentStep.progress !== undefined && (
              <div className="mt-3">
                <Progress value={currentStep.progress} className="h-1" />
              </div>
            )}
          </div>
        )}

        {/* Step List */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4 relative">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-current">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.title}</h4>
                  {getStatusBadge(step.status)}
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {step.status === 'in-progress' && step.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-1" />
                  </div>
                )}
              </div>
              
              {/* Step connector line */}
              {index < steps.length - 1 && (
                <div 
                  className="absolute left-5 top-12 w-0.5 h-8 bg-border"
                  style={{ 
                    transform: 'translateX(-50%)'
                  }} 
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {steps.some(step => step.status === 'error') && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Processing Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              An error occurred during analysis. Please check your documents and try again.
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {steps.filter(s => s.status === 'complete').length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {steps.filter(s => s.status === 'in-progress').length}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {steps.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}