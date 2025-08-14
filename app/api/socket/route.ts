import { NextRequest, NextResponse } from 'next/server';
import { wsManager } from '@/lib/websocket/socket-handler';

export async function GET(request: NextRequest) {
  try {
    const stats = wsManager.getConnectionStats();
    
    return NextResponse.json({
      status: 'WebSocket server running',
      stats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('WebSocket status check failed:', error);
    return NextResponse.json(
      { error: 'WebSocket server error' },
      { status: 500 }
    );
  }
}