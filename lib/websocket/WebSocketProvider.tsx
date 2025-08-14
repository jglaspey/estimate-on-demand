'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface JobProgressEvent {
  jobId: string;
  status: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
  extractedSummary?: any;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  lastError: string | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = useCallback(() => {
    if (socket?.connected) return;

    setConnectionState('connecting');
    setLastError(null);

    console.log('🔌 Connecting to WebSocket server...');

    const newSocket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      auth: {
        token: 'demo-token' // In production, use real auth token
      },
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
      setLastError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      setConnectionState('disconnected');
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, manual reconnect needed
        setLastError('Server disconnected');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setLastError(error.message);
      setConnectionState('disconnected');
      setReconnectAttempts(prev => prev + 1);
    });

    newSocket.on('reconnect', (attempt) => {
      console.log(`🔄 WebSocket reconnected on attempt ${attempt}`);
      setConnectionState('connected');
      setLastError(null);
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 WebSocket reconnection attempt ${attempt}`);
      setConnectionState('reconnecting');
      setReconnectAttempts(attempt);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
      setLastError(`Reconnection failed: ${error.message}`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed');
      setLastError('Reconnection failed after maximum attempts');
      setConnectionState('disconnected');
    });

    // Custom events
    newSocket.on('connected', (data) => {
      console.log('🎉 WebSocket welcome message:', data);
    });

    newSocket.on('subscribed', (data) => {
      console.log('📱 Subscribed to job:', data.jobId);
    });

    newSocket.on('unsubscribed', (data) => {
      console.log('📱 Unsubscribed from job:', data.jobId);
    });

    // Heartbeat
    newSocket.on('pong', (data) => {
      // Optional: track latency
    });

    setSocket(newSocket);

    // Initialize heartbeat
    const heartbeat = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
    };
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionState('disconnected');
    }
  }, [socket]);

  const subscribeToJob = useCallback((jobId: string) => {
    if (socket?.connected) {
      console.log(`📱 Subscribing to job ${jobId}`);
      socket.emit('subscribe-job', { jobId, userId: 'demo-user' });
    } else {
      console.warn('Cannot subscribe to job - WebSocket not connected');
    }
  }, [socket]);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    if (socket?.connected) {
      console.log(`📱 Unsubscribing from job ${jobId}`);
      socket.emit('unsubscribe-job', jobId);
    }
  }, [socket]);

  // Initialize connection on mount
  useEffect(() => {
    // Initialize WebSocket server first
    fetch('/api/socketio')
      .then(() => {
        // Give server a moment to initialize
        setTimeout(() => {
          connect();
        }, 500);
      })
      .catch(error => {
        console.error('Failed to initialize WebSocket server:', error);
        setLastError('Failed to initialize WebSocket server');
      });

    return () => {
      disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    subscribeToJob,
    unsubscribeFromJob,
    connectionState,
    lastError
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook for job-specific events
export function useJobProgress(jobId: string | null) {
  const { socket, subscribeToJob, unsubscribeFromJob } = useWebSocket();
  const [jobProgress, setJobProgress] = useState<JobProgressEvent | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !socket) return;

    // Subscribe to job
    subscribeToJob(jobId);

    // Job progress events
    const handleJobProgress = (event: JobProgressEvent) => {
      if (event.jobId === jobId) {
        console.log('📊 Job progress:', event);
        setJobProgress(event);
      }
    };

    const handleJobStatus = (status: any) => {
      if (status.jobId === jobId) {
        console.log('📋 Job status:', status);
        setJobStatus(status);
      }
    };

    const handleJobComplete = (event: any) => {
      if (event.jobId === jobId) {
        console.log('✅ Job complete:', event);
        setJobProgress({
          jobId: event.jobId,
          status: 'completed',
          stage: 'completed',
          progress: 100,
          message: event.message,
          timestamp: event.timestamp,
          extractedSummary: event.result
        });
      }
    };

    const handleJobError = (event: any) => {
      if (event.jobId === jobId) {
        console.log('❌ Job error:', event);
        setJobError(event.error);
      }
    };

    // Listen for events
    socket.on('job-progress', handleJobProgress);
    socket.on('job-status', handleJobStatus);
    socket.on('job-status-change', handleJobStatus);
    socket.on('job-complete', handleJobComplete);
    socket.on('job-error', handleJobError);

    return () => {
      // Cleanup
      socket.off('job-progress', handleJobProgress);
      socket.off('job-status', handleJobStatus);
      socket.off('job-status-change', handleJobStatus);
      socket.off('job-complete', handleJobComplete);
      socket.off('job-error', handleJobError);
      
      unsubscribeFromJob(jobId);
    };
  }, [jobId, socket, subscribeToJob, unsubscribeFromJob]);

  return {
    jobProgress,
    jobStatus,
    jobError,
    clearError: () => setJobError(null)
  };
}