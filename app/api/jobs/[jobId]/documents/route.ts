import { NextRequest, NextResponse } from 'next/server';

import { PrismaClient } from '@/src/generated/prisma';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Fetch documents with their pages
    const documents = await prisma.document.findMany({
      where: {
        jobId: jobId,
      },
      include: {
        pages: {
          orderBy: {
            pageNumber: 'asc',
          },
          select: {
            id: true,
            pageNumber: true,
            extractedContent: true,
            rawText: true,
            wordCount: true,
            confidence: true,
            width: true,
            height: true,
            imageCount: true,
            extractionMethod: true,
          },
        },
      },
    });

    // Transform the data for the frontend
    const transformedDocuments = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileName.toLowerCase().includes('roof')
        ? 'roof_report'
        : 'estimate',
      filePath: doc.filePath,
      pageCount: doc.pageCount || doc.pages.length,
      status: doc.status,
      pages: doc.pages.map(page => ({
        pageNumber: page.pageNumber,
        content: page.extractedContent,
        rawText: page.rawText,
        wordCount: page.wordCount,
        confidence: page.confidence,
        dimensions: {
          width: page.width,
          height: page.height,
        },
      })),
    }));

    return NextResponse.json({ documents: transformedDocuments });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
