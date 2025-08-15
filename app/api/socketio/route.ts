import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // WebSocket upgrade is handled by the socket.io server
  // This route exists for proper WebSocket initialization in Next.js App Router

  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  return new Response('WebSocket endpoint', { status: 200 });
}
