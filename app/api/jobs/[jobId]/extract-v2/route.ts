import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';
import { extractionV2 } from '@/lib/extraction/v2/orchestrator';

export async function POST(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (process.env.EXTRACTION_V2 !== '1') {
    return NextResponse.json(
      { error: 'EXTRACTION_V2 disabled' },
      { status: 403 }
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: params.jobId },
    include: { documents: true },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const filePaths = job.documents
    .map(d => d.filePath)
    .filter((p): p is string => !!p);

  if (filePaths.length === 0) {
    return NextResponse.json(
      { error: 'No documents with file paths' },
      { status: 400 }
    );
  }

  // Fire-and-forget to mirror current background behavior
  extractionV2
    .run(job.id, filePaths)
    .catch(err => console.error('extract-v2 failed:', err));

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    files: filePaths.length,
  });
}
