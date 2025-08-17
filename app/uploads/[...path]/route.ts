import { readFile, stat } from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

// Serve files from the local uploads directory created by the upload API
// This normalizes any incoming path and prevents path traversal

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'File path missing' }, { status: 400 });
    }

    // Construct absolute file path within uploads directory
    const safeRelative = path.join(...pathSegments);
    const absolutePath = path.join(UPLOAD_DIR, safeRelative);

    // Ensure the requested path resolves within the uploads directory
    const resolved = path.resolve(absolutePath);
    if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Basic stat check
    await stat(resolved);

    const data = await readFile(resolved);

    // Infer content type based on file extension
    const ext = path.extname(resolved).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
