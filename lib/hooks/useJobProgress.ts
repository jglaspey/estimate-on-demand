/**
 * React hook for tracking job progress with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import type { PriorityFields } from '@/lib/types/document-extraction';

interface JobProgressState {
  status: 'uploading' | 'processing' | 'extracting' | 'completed' | 'error';
  progress: number;
  message: string;
  priorityFields: PriorityFields;
  error?: string;
}

interface JobProgressEvent {
  type: 'upload:progress' | 'extraction:priority' | 'extraction:page' | 'extraction:complete' | 'phase1:complete' | 'error';
  data: any;
}

export function useJobProgress(jobId?: string) {
  const [progressState, setProgressState] = useState<JobProgressState>({
    status: 'uploading',
    progress: 0,
    message: 'Uploading files...',
    priorityFields: {}
  });

  const [isConnected, setIsConnected] = useState(false);

  // Handle real-time progress updates
  const handleProgressEvent = useCallback((event: JobProgressEvent) => {
    switch (event.type) {
      case 'upload:progress':
        setProgressState(prev => ({
          ...prev,
          status: 'uploading',
          progress: event.data.progress,
          message: `Uploading files... ${event.data.progress}%`
        }));
        break;

      case 'extraction:priority':
        setProgressState(prev => ({
          ...prev,
          status: 'extracting',
          progress: 30,
          message: 'Extracting key information...',
          priorityFields: event.data.priority_fields
        }));
        break;

      case 'phase1:complete':
        // Handle Phase 1 Claude extraction completion
        const fields = event.data.fields || {};
        const metadata = event.data;
        
        setProgressState(prev => ({
          ...prev,
          status: 'processing',
          progress: 45,
          message: `Phase 1 complete: ${metadata.fieldsFound}/8 fields (${metadata.confidence} confidence)`,
          priorityFields: {
            customer_name: fields.customerName ? { value: fields.customerName, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            property_address: fields.propertyAddress ? { value: fields.propertyAddress, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            carrier: fields.carrier ? { value: fields.carrier, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            claim_rep: fields.claimRep ? { value: fields.claimRep, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            estimator: fields.estimator ? { value: fields.estimator, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            date_of_loss: fields.dateOfLoss ? { value: fields.dateOfLoss, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            claim_number: fields.claimNumber ? { value: fields.claimNumber, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined,
            policy_number: fields.policyNumber ? { value: fields.policyNumber, confidence: metadata.confidence === 'high' ? 0.9 : metadata.confidence === 'medium' ? 0.7 : 0.5 } : undefined
          }
        }));
        break;

      case 'extraction:page':
        const pageProgress = 30 + (event.data.progress * 0.5); // 30-80%
        setProgressState(prev => ({
          ...prev,
          status: 'processing',
          progress: pageProgress,
          message: `Processing page ${event.data.page} of ${event.data.total}...`
        }));
        break;

      case 'extraction:complete':
        setProgressState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          message: 'Document processing complete'
        }));
        break;

      case 'error':
        setProgressState(prev => ({
          ...prev,
          status: 'error',
          error: event.data.message,
          message: 'Processing failed'
        }));
        break;
    }
  }, []);

  // Polling-based progress updates (fallback if WebSocket unavailable)
  const pollJobProgress = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`);
      if (!response.ok) return;

      const data = await response.json();
      
      // Convert job status to progress state
      switch (data.status) {
        case 'UPLOADED':
        case 'QUEUED':
          setProgressState(prev => ({
            ...prev,
            status: 'processing',
            progress: 20,
            message: 'Queued for processing...'
          }));
          break;

        case 'PROCESSING':
          setProgressState(prev => ({
            ...prev,
            status: 'processing',
            progress: 40,
            message: 'Extracting document content...'
          }));
          break;

        case 'TEXT_EXTRACTED':
          setProgressState(prev => ({
            ...prev,
            status: 'extracting',
            progress: 70,
            message: 'Analyzing business rules...',
            priorityFields: {
              customer_name: data.customerName ? { value: data.customerName, confidence: 1.0 } : undefined,
              property_address: data.customerAddress ? { value: data.customerAddress, confidence: 1.0 } : undefined,
              claim_number: data.claimNumber ? { value: data.claimNumber, confidence: 1.0 } : undefined,
              policy_number: data.policyNumber ? { value: data.policyNumber, confidence: 1.0 } : undefined,
              carrier: data.carrier ? { value: data.carrier, confidence: 1.0 } : undefined,
              claim_rep: data.claimRep ? { value: data.claimRep, confidence: 1.0 } : undefined,
              estimator: data.estimator ? { value: data.estimator, confidence: 1.0 } : undefined,
              original_estimate: data.originalEstimate ? { value: data.originalEstimate, confidence: 1.0 } : undefined,
            }
          }));
          break;

        case 'ANALYSIS_READY':
        case 'COMPLETED':
          setProgressState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
            message: 'Processing complete'
          }));
          break;

        case 'FAILED':
          setProgressState(prev => ({
            ...prev,
            status: 'error',
            error: 'Processing failed',
            message: 'Document processing failed'
          }));
          break;
      }
    } catch (error) {
      console.error('Failed to poll job progress:', error);
    }
  }, []);

  // Start polling when jobId is provided
  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(() => {
      pollJobProgress(jobId);
    }, 2000); // Poll every 2 seconds

    // Initial poll
    pollJobProgress(jobId);

    return () => clearInterval(pollInterval);
  }, [jobId, pollJobProgress]);

  // Simulate upload progress
  const simulateUploadProgress = useCallback((progressPercentage: number) => {
    setProgressState(prev => ({
      ...prev,
      status: 'uploading',
      progress: progressPercentage,
      message: `Uploading files... ${progressPercentage}%`
    }));
  }, []);

  // Mark upload as complete and start processing
  const completeUpload = useCallback((newJobId: string) => {
    setProgressState(prev => ({
      ...prev,
      status: 'processing',
      progress: 20,
      message: 'Upload complete, starting processing...'
    }));
  }, []);

  return {
    progressState,
    isConnected,
    simulateUploadProgress,
    completeUpload,
    handleProgressEvent
  };
}