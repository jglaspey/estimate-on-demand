import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '../../../src/generated/prisma';

const prisma = new PrismaClient();

export async function GET(_request: NextRequest) {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        documents: {
          select: {
            id: true,
            fileName: true,
            pageCount: true,
            status: true,
          },
        },
        mistralExtractions: {
          select: {
            id: true,
            fieldsFound: true,
            confidence: true,
          },
          take: 1,
          orderBy: { extractedAt: 'desc' },
        },
        sonnetAnalyses: {
          select: {
            id: true,
            overallAssessment: true,
            accuracyScore: true,
            completenessScore: true,
          },
          take: 1,
          orderBy: { analyzedAt: 'desc' },
        },
        ruleAnalyses: {
          select: {
            ruleType: true,
            status: true,
            passed: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
