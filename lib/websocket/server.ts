import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  jobSubscriptions?: Set<string>;
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

export class WebSocketServer {
  private io: SocketIOServer | null = null;
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private jobSubscriptions = new Map<string, Set<string>>(); // jobId -> Set of socket IDs

  initialize(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL 
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('✅ WebSocket server initialized');
  }

  private setupMiddleware() {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          console.log('❌ WebSocket connection rejected: No token provided');
          return next(new Error('Authentication required'));
        }

        // For demo purposes, we'll create a simple token validation
        // In production, this should validate against your auth system
        const decoded = this.validateToken(token);
        
        socket.userId = decoded.userId || 'anonymous';
        socket.jobSubscriptions = new Set<string>();
        
        console.log(`✅ WebSocket client authenticated: ${socket.userId}`);
        next();
      } catch (error) {
        console.log('❌ WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Client connected: ${socket.id} (user: ${socket.userId})`);
      
      if (socket.userId) {
        this.connectedClients.set(socket.id, socket);
      }

      // Handle job subscription
      socket.on('subscribe-job', (jobId: string) => {
        if (!socket.jobSubscriptions) socket.jobSubscriptions = new Set();
        
        socket.jobSubscriptions.add(jobId);
        socket.join(`job-${jobId}`);
        
        if (!this.jobSubscriptions.has(jobId)) {
          this.jobSubscriptions.set(jobId, new Set());
        }
        this.jobSubscriptions.get(jobId)!.add(socket.id);
        
        console.log(`📱 Client ${socket.id} subscribed to job ${jobId}`);
        
        // Send current job status if available
        this.sendCurrentJobStatus(socket, jobId);
      });

      // Handle job unsubscription
      socket.on('unsubscribe-job', (jobId: string) => {
        if (socket.jobSubscriptions) {
          socket.jobSubscriptions.delete(jobId);
        }
        socket.leave(`job-${jobId}`);
        
        if (this.jobSubscriptions.has(jobId)) {
          this.jobSubscriptions.get(jobId)!.delete(socket.id);
        }
        
        console.log(`📱 Client ${socket.id} unsubscribed from job ${jobId}`);
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
        this.handleClientDisconnect(socket);
      });

      // Send welcome message
      socket.emit('connected', { 
        message: 'Connected to WebSocket server',
        clientId: socket.id,
        timestamp: Date.now()
      });
    });
  }

  private validateToken(token: string): { userId: string } {
    try {
      // For demo purposes, we'll create a simple validation
      // In production, use your actual JWT secret and validation logic
      if (token === 'demo-token') {
        return { userId: 'demo-user' };
      }
      
      // Try to decode if it's a real JWT
      const decoded = jwt.verify(token, process.env.AUTH_SECRET || 'fallback-secret') as any;
      return { userId: decoded.sub || decoded.userId || 'anonymous' };
    } catch (error) {
      // For development, allow anonymous connections
      if (process.env.NODE_ENV === 'development') {
        return { userId: 'dev-user' };
      }
      throw new Error('Invalid token');
    }
  }

  private async sendCurrentJobStatus(socket: AuthenticatedSocket, jobId: string) {
    try {
      // Fetch current job status from API
      const response = await fetch(`http://localhost:3000/api/jobs/${jobId}/status`);
      if (response.ok) {
        const statusData = await response.json();
        socket.emit('job-status', statusData);
      }
    } catch (error) {
      console.error(`Failed to send current status for job ${jobId}:`, error);
    }
  }

  private handleClientDisconnect(socket: AuthenticatedSocket) {
    // Remove from connected clients
    this.connectedClients.delete(socket.id);
    
    // Remove from job subscriptions
    if (socket.jobSubscriptions) {
      socket.jobSubscriptions.forEach(jobId => {
        if (this.jobSubscriptions.has(jobId)) {
          this.jobSubscriptions.get(jobId)!.delete(socket.id);
          
          // Clean up empty job subscription sets
          if (this.jobSubscriptions.get(jobId)!.size === 0) {
            this.jobSubscriptions.delete(jobId);
          }
        }
      });
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

  // Server management methods

  public getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      activeSubscriptions: Array.from(this.jobSubscriptions.entries()).map(([jobId, clients]) => ({
        jobId,
        subscribedClients: clients.size
      }))
    };
  }

  public getServer(): SocketIOServer | null {
    return this.io;
  }
}

// Singleton instance
export const wsServer = new WebSocketServer();