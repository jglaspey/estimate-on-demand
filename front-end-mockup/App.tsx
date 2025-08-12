import { useState } from 'react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { 
  ArrowLeft, 
  Download, 
  Share, 
  RefreshCw
} from 'lucide-react';

import { HipRidgeCapCard } from './components/rules/HipRidgeCapCard';
import { StarterStripCard } from './components/rules/StarterStripCard';
import { DripEdgeGutterApronCard } from './components/rules/DripEdgeGutterApronCard';
import { IceWaterBarrierCard } from './components/rules/IceWaterBarrierCard';
import { ContextualDocumentViewer } from './components/ContextualDocumentViewer';
import { StickyFooter } from './components/StickyFooter';
import { OverviewPage } from './components/OverviewPage';
import { JobsDashboard } from './components/JobsDashboard';

import { 
  mockDocuments,
  JobData,
  RuleAnalysisResult,
  RoofMeasurements,
  getJobDataById
} from './lib/mockData';

type AppMode = 'dashboard' | 'overview' | 'review';

export default function App() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [roofMeasurements, setRoofMeasurements] = useState<RoofMeasurements | null>(null);
  const [ruleAnalysis, setRuleAnalysis] = useState<RuleAnalysisResult[]>([]);
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);

  const handleJobSelect = (jobId: string) => {
    const jobDataResult = getJobDataById(jobId);
    if (jobDataResult) {
      setCurrentJobId(jobId);
      setJobData(jobDataResult.jobData);
      setRoofMeasurements(jobDataResult.roofMeasurements);
      setRuleAnalysis(jobDataResult.ruleAnalysis);
      setMode('overview');
      setCurrentRuleIndex(0);
    }
  };

  const handleBackToJobs = () => {
    setMode('dashboard');
    setCurrentJobId(null);
    setJobData(null);
    setRoofMeasurements(null);
    setRuleAnalysis([]);
    setCurrentRuleIndex(0);
  };

  const handleFieldUpdate = (field: string, value: string | number) => {
    if (jobData) {
      setJobData(prev => ({
        ...prev!,
        [field]: value,
        updatedAt: new Date().toISOString()
      }));
    }
  };

  const handleRuleDecision = (ruleName: string, decision: 'accepted' | 'rejected' | 'modified', notes?: string) => {
    setRuleAnalysis(prev => 
      prev.map(rule => 
        rule.ruleName === ruleName 
          ? { ...rule, userDecision: decision, userNotes: notes || '' }
          : rule
      )
    );
  };

  const getSupplementTotal = () => {
    return ruleAnalysis
      .filter(rule => rule.userDecision === 'accepted')
      .reduce((total, rule) => total + rule.costImpact, 0);
  };

  const handleStartReview = () => {
    setMode('review');
    setCurrentRuleIndex(0);
  };

  const handlePreviousRule = () => {
    setCurrentRuleIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextRule = () => {
    setCurrentRuleIndex(prev => Math.min(ruleAnalysis.length - 1, prev + 1));
  };

  const handleRuleSelect = (index: number) => {
    if (mode === 'overview') {
      handleStartReview();
      return;
    }
    setCurrentRuleIndex(index);
  };

  const renderRuleCard = (rule: RuleAnalysisResult) => {
    const onDecision = (decision: 'accepted' | 'rejected' | 'modified', notes?: string) => {
      handleRuleDecision(rule.ruleName, decision, notes);
    };

    switch (rule.ruleName) {
      case 'ridge_cap':
        return <HipRidgeCapCard key={rule.ruleName} ruleAnalysis={rule} onDecision={onDecision} />;
      case 'starter_strip':
        return <StarterStripCard key={rule.ruleName} ruleAnalysis={rule} onDecision={onDecision} />;
      case 'drip_edge':
        return <DripEdgeGutterApronCard key={rule.ruleName} ruleAnalysis={rule} onDecision={onDecision} />;
      case 'ice_water_barrier':
        return <IceWaterBarrierCard key={rule.ruleName} ruleAnalysis={rule} onDecision={onDecision} />;
      default:
        return null;
    }
  };

  // Show dashboard if no job is selected
  if (mode === 'dashboard') {
    return <JobsDashboard onJobSelect={handleJobSelect} />;
  }

  // Show job details if we have job data
  if (!jobData || !roofMeasurements) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Job not found
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            The requested job could not be loaded.
          </p>
          <Button onClick={handleBackToJobs} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-zinc-200 dark:bg-zinc-950/95 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => mode === 'overview' ? handleBackToJobs() : setMode('overview')}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {mode === 'review' ? 'Back to Overview' : 'Back to Jobs'}
              </button>
              
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
              
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {jobData.customerName}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {jobData.propertyAddress}
                </p>
              </div>
              
              {mode === 'review' && (
                <>
                  <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                    Review Mode
                  </Badge>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                Job #{jobData.id.split('-')[1]}
              </Badge>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <Share className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>
                <Button 
                  size="sm"
                  className="h-8 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {mode === 'overview' ? (
          /* Overview Mode */
          <OverviewPage
            jobData={jobData}
            roofMeasurements={roofMeasurements}
            ruleAnalysis={ruleAnalysis}
            onFieldUpdate={handleFieldUpdate}
            onStartReview={handleStartReview}
          />
        ) : (
          /* Review Mode - Split Screen */
          <div className="h-[calc(100vh-4rem)] flex bg-zinc-50 dark:bg-zinc-950">
            {/* Left Panel - Business Rules */}
            <div className="w-1/2 bg-white border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
              <div className="h-full overflow-auto">
                <div className="p-8 pb-32"> {/* Bottom padding for sticky footer */}
                  {renderRuleCard(ruleAnalysis[currentRuleIndex])}
                </div>
              </div>
            </div>

            {/* Right Panel - Contextual Documents */}
            <div className="w-1/2 bg-zinc-50 dark:bg-zinc-950">
              <div className="h-full p-8 pb-32"> {/* Bottom padding for sticky footer */}
                <ContextualDocumentViewer
                  documents={mockDocuments}
                  selectedRule={ruleAnalysis[currentRuleIndex]?.ruleName || null}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sticky Footer */}
        {mode !== 'dashboard' && (
          <StickyFooter
            currentRule={currentRuleIndex}
            totalRules={ruleAnalysis.length}
            ruleAnalysis={ruleAnalysis}
            onPrevious={handlePreviousRule}
            onNext={handleNextRule}
            onRuleSelect={handleRuleSelect}
            mode={mode}
            supplementTotal={getSupplementTotal()}
            originalTotal={jobData.totalEstimateValue}
          />
        )}
      </main>
    </div>
  );
}