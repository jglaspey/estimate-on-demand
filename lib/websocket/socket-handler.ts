import { NextApiRequest } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

interface SocketApiResponse {
  socket?: {
    server?: HttpServer & {
      io?: SocketIOServer;
    };
  };
}

interface JobProgressEvent {
  jobId: string;
  status: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
  extractedSummary?: any;
}

class WebSocketManager {
  private io: SocketIOServer | null = null;
  private connectedClients = new Map<string, any>();

  initializeSocket(req: NextApiRequest, res: SocketApiResponse) {
    if (!res.socket?.server) {
      console.error('Server not available for WebSocket initialization');
      return false;
    }

    if (!res.socket.server.io) {
      console.log('🚀 Initializing WebSocket server...');
      
      const io = new SocketIOServer(res.socket.server as any, {
        path: '/api/socketio',
        addTrailingSlash: false,
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? process.env.NEXTAUTH_URL 
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
          methods: ["GET", "POST"],
          credentials: true
        }
      });

      res.socket.server.io = io;
      this.io = io;

      this.setupEventHandlers();
      console.log('✅ WebSocket server initialized');
    } else {
      this.io = res.socket.server.io;
    }

    return true;
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Handle job subscription
      socket.on('subscribe-job', (data: { jobId: string; userId?: string }) => {
        const { jobId, userId } = data;
        socket.join(`job-${jobId}`);
        
        console.log(`📱 Client ${socket.id} subscribed to job ${jobId}`);
        
        // Send acknowledgment
        socket.emit('subscribed', { jobId, timestamp: Date.now() });
        
        // Send current job status if available
        this.sendCurrentJobStatus(socket, jobId);
      });

      // Handle job unsubscription
      socket.on('unsubscribe-job', (jobId: string) => {
        socket.leave(`job-${jobId}`);
        console.log(`📱 Client ${socket.id} unsubscribed from job ${jobId}`);
        socket.emit('unsubscribed', { jobId, timestamp: Date.now() });
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
        this.connectedClients.delete(socket.id);
      });

      // Send welcome message
      socket.emit('connected', { 
        message: 'Connected to WebSocket server',
        clientId: socket.id,
        timestamp: Date.now()
      });
    });
  }

  private async sendCurrentJobStatus(socket: any, jobId: string) {
    try {
      // We'll implement this to fetch current job status
      // For now, just acknowledge the subscription
      socket.emit('job-status', { 
        jobId,
        message: 'Subscribed to job updates',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Failed to send current status for job ${jobId}:`, error);
    }
  }

  // Public methods for emitting events
  public emitJobProgress(event: JobProgressEvent) {
    if (!this.io) {
      console.warn('WebSocket server not initialized, cannot emit job progress');
      return;
    }

    // Emit to all clients subscribed to this job
    this.io.to(`job-${event.jobId}`).emit('job-progress', event);
    
    console.log(`📡 Emitted job progress for ${event.jobId}: ${event.stage} (${event.progress}%)`);
  }

  public emitJobStatusChange(jobId: string, status: string, message?: string) {
    if (!this.io) return;

    const event = {
      jobId,
      status,
      message: message || `Job status changed to ${status}`,
      timestamp: Date.now()
    };

    this.io.to(`job-${jobId}`).emit('job-status-change', event);
    console.log(`📡 Emitted status change for ${jobId}: ${status}`);
  }

  public emitJobComplete(jobId: string, result: any) {
    if (!this.io) return;

    const event = {
      jobId,
      status: 'completed',
      result,
      message: 'Document processing complete',
      timestamp: Date.now()
    };

    this.io.to(`job-${jobId}`).emit('job-complete', event);
    console.log(`📡 Emitted job completion for ${jobId}`);
  }

  public emitJobError(jobId: string, error: string) {
    if (!this.io) return;

    const event = {
      jobId,
      status: 'failed',
      error,
      message: 'Document processing failed',
      timestamp: Date.now()
    };

    this.io.to(`job-${jobId}`).emit('job-error', event);
    console.log(`📡 Emitted job error for ${jobId}: ${error}`);
  }

  public getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      isInitialized: !!this.io
    };
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
export type { JobProgressEvent };