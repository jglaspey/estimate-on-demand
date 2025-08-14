'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface JobProgressEvent {
  jobId: string;
  status: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
  extractedSummary?: any;
}

interface PollingContextType {
  isConnected: boolean;
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  lastError: string | null;
}

const PollingContext = createContext<PollingContextType | null>(null);

interface PollingProviderProps {
  children: React.ReactNode;
}

export function PollingProvider({ children }: PollingProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [subscribedJobs, setSubscribedJobs] = useState<Set<string>>(new Set());

  const connect = useCallback(() => {
    setConnectionState('connecting');
    setLastError(null);
    
    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      setConnectionState('connected');
      console.log('✅ Polling provider connected');
    }, 500);
  }, []);

  const subscribeToJob = useCallback((jobId: string) => {
    console.log(`📱 Subscribing to job ${jobId} via polling`);
    setSubscribedJobs(prev => new Set([...prev, jobId]));
  }, []);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    console.log(`📱 Unsubscribing from job ${jobId}`);
    setSubscribedJobs(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  const value: PollingContextType = {
    isConnected,
    subscribeToJob,
    unsubscribeFromJob,
    connectionState,
    lastError
  };

  return (
    <PollingContext.Provider value={value}>
      {children}
    </PollingContext.Provider>
  );
}

export function usePolling() {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within a PollingProvider');
  }
  return context;
}

// Hook for job-specific polling
export function useJobPolling(jobId: string | null) {
  const { subscribeToJob, unsubscribeFromJob } = usePolling();
  const [jobProgress, setJobProgress] = useState<JobProgressEvent | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}/status`);
      if (response.ok) {
        const data = await response.json();
        
        // Convert API response to progress event format
        const progressEvent: JobProgressEvent = {
          jobId: id,
          status: data.status,
          stage: data.stage,
          progress: data.progress,
          message: data.message,
          timestamp: Date.now(),
          extractedSummary: data.extractedSummary
        };

        setJobProgress(progressEvent);
        setJobStatus(data);

        // Stop polling if job is complete or failed
        if (data.status === 'ANALYSIS_READY' || data.status === 'FAILED') {
          setIsPolling(false);
          if (data.status === 'FAILED') {
            setJobError('Job processing failed');
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      setJobError(error instanceof Error ? error.message : 'Polling failed');
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    subscribeToJob(jobId);

    // Start polling immediately
    pollJobStatus(jobId);
    setIsPolling(true);

    // Set up polling interval
    const pollInterval = setInterval(() => {
      if (isPolling) {
        pollJobStatus(jobId);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
      unsubscribeFromJob(jobId);
      setIsPolling(false);
    };
  }, [jobId, subscribeToJob, unsubscribeFromJob, pollJobStatus, isPolling]);

  return {
    jobProgress,
    jobStatus,
    jobError,
    clearError: () => setJobError(null),
    isPolling
  };
}