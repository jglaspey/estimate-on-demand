import { NextResponse } from 'next/server';

import { wsServer } from '@/lib/websocket/server';

export async function GET() {
  try {
    // WebSocket server is initialized via the custom server.js
    // This endpoint provides status and health check for the WebSocket server

    const stats = wsServer.getConnectionStats();

    return NextResponse.json({
      message: 'WebSocket server status',
      stats,
      timestamp: Date.now(),
      initialized: !!wsServer.getServer(),
    });
  } catch (error) {
    console.error('WebSocket endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get WebSocket server status' },
      { status: 500 }
    );
  }
}
