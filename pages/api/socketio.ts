import { NextApiRequest, NextApiResponse } from 'next';
import { wsManager } from '@/lib/websocket/socket-handler';

interface SocketApiResponse extends NextApiResponse {
  socket?: {
    server?: any;
  };
}

export default function handler(req: NextApiRequest, res: SocketApiResponse) {
  if (req.method === 'GET') {
    // Initialize WebSocket server if not already done
    const initialized = wsManager.initializeSocket(req, res);
    
    if (initialized) {
      res.status(200).json({ 
        message: 'WebSocket server initialized',
        stats: wsManager.getConnectionStats(),
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({ error: 'Failed to initialize WebSocket server' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Disable body parsing for WebSocket endpoint
export const config = {
  api: {
    bodyParser: false,
  },
};