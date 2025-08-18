'use client';

import React from 'react';

import { useJobPolling } from '@/lib/websocket/PollingProvider';

interface JobProgressTrackerProps {
  jobId: string;
  className?: string;
}

export function JobProgressTracker({ jobId, className = '' }: JobProgressTrackerProps) {
  const { jobProgress, jobStatus, jobError, isPolling } = useJobPolling(jobId);

  // Use WebSocket data if available, otherwise fall back to props
  const progress = jobProgress?.progress || 0;
  const stage = jobProgress?.stage || 'uploaded';
  const message = jobProgress?.message || 'Processing...';
  const status = jobProgress?.status || 'UPLOADED';

  const getProgressColor = () => {
    if (jobError) return 'bg-red-500';
    if (status === 'FAILED') return 'bg-red-500';
    if (status === 'ANALYSIS_READY' || progress >= 100) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStageIcon = () => {
    if (jobError || status === 'FAILED') return '❌';
    if (status === 'ANALYSIS_READY' || progress >= 100) return '✅';
    if (stage === 'processing') return '⚙️';
    if (stage === 'queued') return '⏳';
    return '📄';
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-card-foreground flex items-center gap-2">
          {getStageIcon()} Analysis Progress
        </h3>
        <span className="text-sm text-muted-foreground">
          {jobError ? 'Error occurred' : message}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-accent rounded-full h-3 mb-2 relative overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.max(progress, 5)}%` }}
        >
          {/* Animated loading effect for active processing */}
          {stage === 'processing' && progress < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          {Math.round(progress)}% Complete
        </span>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-xs text-muted-foreground">
            {isPolling ? 'Live Updates' : 'Monitoring'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {jobError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {jobError}
          </p>
        </div>
      )}

      {/* Extracted Summary */}
      {jobProgress?.extractedSummary && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 mb-2">
            <strong>Extraction Complete:</strong>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            <div>Document Type: {jobProgress.extractedSummary.documentType}</div>
            <div>Customer Info: {jobProgress.extractedSummary.hasCustomer ? '✓' : '✗'}</div>
            <div>Claim Info: {jobProgress.extractedSummary.hasClaim ? '✓' : '✗'}</div>
            <div>Line Items: {jobProgress.extractedSummary.lineItemCount}</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  // This would use the WebSocket context to show connection status
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-muted-foreground">Connected</span>
    </div>
  );
}