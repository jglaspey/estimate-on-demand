import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  MapPin,
  Building,
  ChevronRight,
  BarChart3,
  Clock,
  Play,
  User,
  Shield
} from 'lucide-react';
import { ChatBox } from './ChatBox';
import { JobData, RoofMeasurements, RuleAnalysisResult } from '../lib/mockData';

interface OverviewPageProps {
  jobData: JobData;
  roofMeasurements: RoofMeasurements;
  ruleAnalysis: RuleAnalysisResult[];
  onFieldUpdate: (field: string, value: string | number) => void;
  onStartReview: () => void;
}

export function OverviewPage({ 
  jobData, 
  roofMeasurements, 
  ruleAnalysis, 
  onFieldUpdate, 
  onStartReview 
}: OverviewPageProps) {
  const getComplianceStats = () => {
    const compliant = ruleAnalysis.filter(rule => rule.status === 'COMPLIANT').length;
    const needsSupplement = ruleAnalysis.filter(rule => rule.status === 'SUPPLEMENT_NEEDED').length;
    const insufficientData = ruleAnalysis.filter(rule => rule.status === 'INSUFFICIENT_DATA').length;
    
    return { compliant, needsSupplement, insufficientData };
  };

  const getSupplementTotal = () => {
    return ruleAnalysis
      .filter(rule => rule.status === 'SUPPLEMENT_NEEDED')
      .reduce((total, rule) => total + rule.costImpact, 0);
  };

  const stats = getComplianceStats();
  const supplementTotal = getSupplementTotal();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-32 bg-zinc-50 dark:bg-zinc-950">
      {/* Consolidated Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {jobData.customerName}
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <MapPin className="h-4 w-4" />
              <span>{jobData.propertyAddress}</span>
            </div>
          </div>
          
          <Button 
            onClick={onStartReview}
            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Review
          </Button>
        </div>

        {/* Single consolidated insurance & claim info section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Insurance Information */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Insurance Details</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Carrier:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate ml-2 max-w-[200px]" title={jobData.insuranceCarrier}>
                  {jobData.insuranceCarrier}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Claim Rep:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate ml-2 max-w-[180px]" title={jobData.claimRep || 'N/A'}>
                  {jobData.claimRep || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Estimator:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate ml-2 max-w-[180px]" title={jobData.estimator || 'N/A'}>
                  {jobData.estimator || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Claim #:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{jobData.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Policy #:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{jobData.policyNumber}</span>
              </div>
            </div>
          </div>

          {/* Claim Information */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Claim Information</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Date of Loss:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(jobData.dateOfLoss).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Original Estimate:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {jobData.totalEstimateValue && jobData.totalEstimateValue > 0 
                    ? `$${jobData.totalEstimateValue.toLocaleString()}` 
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Potential Supplement:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {supplementTotal > 0 ? `+$${supplementTotal.toLocaleString()}` : '-'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500 dark:text-zinc-400">Total Value:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {(jobData.totalEstimateValue > 0 || supplementTotal > 0)
                    ? `$${(jobData.totalEstimateValue + supplementTotal).toLocaleString()}`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Analysis Status */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                ruleAnalysis.length > 0 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Shield className={`h-5 w-5 ${
                  ruleAnalysis.length > 0 
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`} />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Analysis Status</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Issues Found:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {ruleAnalysis.length > 0 ? stats.needsSupplement : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Compliant Rules:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {ruleAnalysis.length > 0 ? stats.compliant : '-'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                {ruleAnalysis.length > 0 ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle className="w-3 h-3 mr-1.5" />
                    Complete
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                    <Clock className="w-3 h-3 mr-1.5" />
                    Pending Analysis
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Business Rules Analysis (Moved Up) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Business Rules Analysis
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Review supplement recommendations and compliance issues
                  </p>
                </div>
                <Button 
                  onClick={onStartReview}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Review
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {ruleAnalysis.map((rule) => {
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
                    switch (status) {
                      case 'COMPLIANT':
                        return { 
                          icon: CheckCircle, 
                          iconColor: 'text-emerald-600 dark:text-emerald-400',
                          bgClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-l-4 border-l-emerald-400'
                        };
                      case 'SUPPLEMENT_NEEDED':
                        return { 
                          icon: AlertTriangle, 
                          iconColor: 'text-red-600 dark:text-red-400',
                          bgClass: 'hover:bg-red-50 dark:hover:bg-red-950/20 border-l-4 border-l-red-400'
                        };
                      default:
                        return { 
                          icon: Clock, 
                          iconColor: 'text-amber-600 dark:text-amber-400',
                          bgClass: 'hover:bg-amber-50 dark:hover:bg-amber-950/20 border-l-4 border-l-amber-400'
                        };
                    }
                  };

                  const statusConfig = getStatusConfig(rule.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div 
                      key={rule.ruleName} 
                      className={`flex items-center justify-between p-5 rounded-lg border border-zinc-200 transition-colors cursor-pointer dark:border-zinc-700 ${statusConfig.bgClass}`}
                      onClick={onStartReview}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${ 
                          rule.status === 'COMPLIANT' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                          rule.status === 'SUPPLEMENT_NEEDED' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-amber-100 dark:bg-amber-900/30'
                        }`}>
                          <StatusIcon className={`h-6 w-6 ${statusConfig.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                            {getRuleTitle(rule.ruleName)}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {rule.reasoning}
                          </p>
                          {rule.status === 'SUPPLEMENT_NEEDED' && rule.costImpact > 0 && (
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                              +${rule.costImpact.toLocaleString()} supplement opportunity
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            Confidence
                          </div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {Math.round(rule.confidence * 100)}%
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Roof Measurements Summary */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                📐 Roof Measurements
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
                {/* Top Row */}
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Area</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.totalArea ? `${roofMeasurements.totalArea} SF` : '**'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Squares</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.totalSquares || '**'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Pitch</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.pitch || '**'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Stories</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.stories || '**'}
                  </div>
                </div>
                
                {/* Bottom Row */}
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Eaves</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.eavesLength ? `${roofMeasurements.eavesLength} LF` : '**'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Rakes</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.rakesLength ? `${roofMeasurements.rakesLength} LF` : '**'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Ridges</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.ridgesLength ? `${roofMeasurements.ridgesLength} LF` : '**'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Valleys</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {roofMeasurements.valleysLength ? `${roofMeasurements.valleysLength} LF` : '**'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Chat */}
        <div className="lg:col-span-1">
          <ChatBox jobId={jobData.id} />
        </div>
      </div>
    </div>
  );
}