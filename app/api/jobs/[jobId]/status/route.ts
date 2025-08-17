import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get job from database
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Queue status would go here when processing queue is working
    const queueStatus: { attempts: number; lastError: string | null } | null = null;

    // Determine processing stage and progress
    let stage = 'uploaded';
    let progress = 0;
    let message = 'Document uploaded successfully';

    switch (job.status) {
      case 'UPLOADED':
        stage = 'uploaded';
        progress = 10;
        message = 'Document uploaded successfully';
        break;

      case 'QUEUED':
        stage = 'queued';
        progress = 20;
        message = 'Document queued for processing';
        break;

      case 'PROCESSING':
        stage = 'processing';
        progress = 40;
        message = 'Extracting text and data from document...';
        break;

      case 'TEXT_EXTRACTED':
        stage = 'extracted';
        progress = 70;
        message = 'Text extraction complete, analyzing business rules...';
        break;

      case 'ANALYSIS_READY':
        stage = 'ready';
        progress = 100;
        message = 'Processing complete - ready for review';
        break;

      case 'FAILED':
        stage = 'failed';
        progress = 0;
        message = 'Processing failed';
        break;

      default:
        stage = 'unknown';
        progress = 0;
        message = `Status: ${job.status}`;
    }

    // Include extracted data summary if available
    const extraction = job.mistralExtractions[0];
    let extractedSummary = null;

    if (extraction) {
      const data = extraction.extractedData as any;
      extractedSummary = {
        documentType: extraction.documentType,
        confidence: extraction.confidence,
        customerFound: !!extraction.customerName,
        claimFound: !!extraction.claimNumber,
        fieldsExtracted: data ? Object.keys(data).length : 0,
      };
    }

    return NextResponse.json({
      jobId,
      status: job.status,
      stage,
      progress,
      message,
      lastError: job.error || null,
      queueInfo: queueStatus
        ? {
            attempts: (queueStatus as { attempts: number; lastError: string | null }).attempts,
            lastError: (queueStatus as { attempts: number; lastError: string | null }).lastError,
          }
        : null,
      extractedSummary,
      // Add fields that the progress hook expects
      customerName: job.customerName,
      customerAddress: job.customerAddress,
      claimNumber: job.claimNumber,
      policyNumber: job.policyNumber,
      carrier: job.carrier,
      claimRep: job.claimRep,
      estimator: job.estimator,
      originalEstimate: job.originalEstimate,
      updatedAt: job.updatedAt,
      processingTime: extraction
        ? new Date(extraction.extractedAt).getTime() -
          new Date(job.uploadedAt).getTime()
        : null,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
