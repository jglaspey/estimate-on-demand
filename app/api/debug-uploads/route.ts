import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  // Get job ID from query params
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  try {
    // Get job and documents
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check various paths
    const diagnostics = {
      jobId,
      cwd: process.cwd(),
      uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
      documents: job.documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        storedPath: doc.filePath,
        exists: doc.filePath ? existsSync(doc.filePath) : false,
        // Try different path variations
        variations: doc.filePath ? {
          asStored: existsSync(doc.filePath),
          withCwd: existsSync(path.join(process.cwd(), 'uploads', path.basename(doc.filePath))),
          withAppUploads: existsSync(path.join('/app/uploads', path.basename(doc.filePath))),
          withUploadsOnly: existsSync(path.join('uploads', path.basename(doc.filePath))),
        } : null,
      })),
    };

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug uploads',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
