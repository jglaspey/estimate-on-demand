import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';
import { processingQueue } from '@/lib/extraction/processing-queue';
import { extractionV2 } from '@/lib/extraction/v2/orchestrator';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Fetch job and its documents
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { documents: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const filePaths = job.documents
      .map(d => d.filePath)
      .filter((p): p is string => Boolean(p));

    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: 'No source files found for this job' },
        { status: 400 }
      );
    }

    // Purge previous extracted page data for a clean re-run
    await prisma.documentPage.deleteMany({ where: { jobId } });

    // Reset job state minimally; queue will set QUEUED/PROCESSING
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'UPLOADED',
        error: null,
        updatedAt: new Date(),
      },
    });

    // Prefer direct v2 run for immediate processing
    extractionV2.run(jobId, filePaths).catch(err => {
      console.error('Reprocess v2 run failed, falling back to queue:', err);
      // Fallback to queue
      processingQueue.addToQueue(jobId, filePaths).catch(error => {
        console.error(`Failed to queue job ${jobId} for processing:`, error);
      });
    });

    return NextResponse.json({ success: true, queued: filePaths.length });
  } catch (error) {
    console.error('Reprocess error:', error);
    return NextResponse.json(
      { error: 'Failed to queue reprocessing' },
      { status: 500 }
    );
  }
}
