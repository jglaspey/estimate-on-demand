import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../src/generated/prisma';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: {
          include: {
            pages: {
              orderBy: { pageNumber: 'asc' }
            }
          }
        },
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1
        },
        sonnetAnalyses: {
          include: {
            mistralExtraction: true
          },
          orderBy: { analyzedAt: 'desc' },
          take: 1
        },
        ruleAnalyses: {
          orderBy: { analyzedAt: 'desc' }
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}