import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';
import { extractionV2 } from '@/lib/extraction/v2/orchestrator';

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> }
) {
  if (process.env.EXTRACTION_V2 !== '1') {
    return NextResponse.json(
      { error: 'EXTRACTION_V2 disabled' },
      { status: 403 }
    );
  }

  const params = await ctx.params;
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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> }
) {
  if (process.env.EXTRACTION_V2 !== '1') {
    return NextResponse.json(
      { error: 'EXTRACTION_V2 disabled' },
      { status: 403 }
    );
  }

  const params = await ctx.params;
  const job = await prisma.job.findUnique({
    where: { id: params.jobId },
    include: {
      mistralExtractions: { orderBy: { extractedAt: 'desc' }, take: 5 },
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const latest = job.mistralExtractions[0];
  if (!latest) {
    return NextResponse.json(
      { error: 'No extraction found for job' },
      { status: 404 }
    );
  }

  // Prefer the most recent extraction that actually contains v2
  const withV2 =
    job.mistralExtractions.find(e => {
      try {
        const d = e.extractedData as Record<string, unknown>;
        return d && Object.prototype.hasOwnProperty.call(d, 'v2');
      } catch {
        return false;
      }
    }) || latest;

  const data = withV2.extractedData as Record<string, unknown>;
  const v2 = (data as any)?.v2 ?? null;
  const jobSummary = {
    roofSquares: job.roofSquares,
    roofStories: job.roofStories,
    rakeLength: job.rakeLength,
    eaveLength: job.eaveLength,
    ridgeHipLength: job.ridgeHipLength,
    valleyLength: job.valleyLength,
    roofSlope: job.roofSlope,
    roofMaterial: job.roofMaterial,
  };
  return NextResponse.json({ jobId: job.id, v2, job: jobSummary });
}
