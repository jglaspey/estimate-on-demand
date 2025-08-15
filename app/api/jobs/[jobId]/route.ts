import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    console.log(`🔍 Fetching job details for: ${jobId}`);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: {
          include: {
            pages: {
              orderBy: { pageNumber: 'asc' },
            },
          },
        },
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
        sonnetAnalyses: {
          include: {
            mistralExtraction: true,
          },
          orderBy: { analyzedAt: 'desc' },
          take: 1,
        },
        ruleAnalyses: {
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });

    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.log(
      `✅ Job found: ${job.customerName || 'Unknown'} (${job.documents.length} docs)`
    );
    return NextResponse.json({ job });
  } catch (error) {
    console.error('❌ Error fetching job details:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      jobId: (await params).jobId,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch job details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
