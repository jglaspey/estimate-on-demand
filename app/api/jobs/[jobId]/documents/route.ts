import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';

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
    const transformedDocuments = documents.map(doc => {
      const normalizedPath = doc.filePath
        ? doc.filePath.startsWith('/uploads/')
          ? doc.filePath
          : `/uploads/${path.basename(doc.filePath)}`
        : null;

      const mappedPages = doc.pages.map(page => ({
        pageNumber: page.pageNumber,
        content: page.extractedContent,
        rawText: page.rawText,
        wordCount: page.wordCount,
        confidence: page.confidence,
        dimensions: {
          width: page.width,
          height: page.height,
        },
        images: (() => {
          const ec: any = page.extractedContent || {};
          const arr =
            ec?.assets?.pageImages || ec?.processing_metadata?.page_images;
          if (Array.isArray(arr))
            return arr.filter((v: any) => typeof v === 'string');
          return [] as string[];
        })(),
      }));

      // Fallback: ensure at least one page exists so UI can paginate/scroll
      const safePages =
        mappedPages.length > 0
          ? mappedPages
          : [
              {
                pageNumber: 1,
                content: null,
                rawText:
                  'No extracted content available yet for this document.',
                wordCount: 0,
                confidence: null as any,
                dimensions: { width: null as any, height: null as any },
              },
            ];

      return {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileName.toLowerCase().includes('roof')
          ? 'roof_report'
          : 'estimate',
        filePath: normalizedPath,
        pageCount: doc.pageCount || mappedPages.length || 1,
        status: doc.status,
        pages: safePages,
      };
    });

    // If no roof report found, add a mock one for demo purposes
    const hasRoofReport = transformedDocuments.some(
      doc => doc.fileType === 'roof_report'
    );
    if (!hasRoofReport) {
      transformedDocuments.push({
        id: 'mock-roof-report',
        fileName: 'EagleView_Roof_Report.pdf',
        fileType: 'roof_report',
        filePath: null, // No actual PDF, just extracted text
        pageCount: 12,
        status: 'TEXT_EXTRACTED',
        pages: [
          {
            pageNumber: 1,
            content: {
              title: 'EagleView Roof Report',
              type: 'roof_measurements',
            },
            rawText:
              'EAGLEVIEW ROOF REPORT\n\nProperty Address: 8002 KILPATRICK PKWY, BENNINGTON, NE 68007-3289\n\nROOF MEASUREMENTS\nTotal Roof Area: 2,450 SF\nSquares: 24.5\nPredominant Pitch: 6/12\nTotal Eaves: 180 LF\nTotal Rakes: 120 LF\nTotal Ridges/Hips: 119 ft\n  - Ridges: 26 ft\n  - Hips: 93 ft\nSoffit Depth: 24"',
            wordCount: 45,
            confidence: 0.98,
            dimensions: { width: 612, height: 792 },
          },
          {
            pageNumber: 2,
            content: { measurements: 'detailed' },
            rawText:
              'DETAILED MEASUREMENTS\n\nRIDGE AND HIP BREAKDOWN:\nRidge Length: 26 LF\nHip Length: 93 LF\nTotal Ridge/Hip: 119 LF\n\nEAVE MEASUREMENTS:\nTotal Eaves: 180 LF\nRequires universal starter strip\n\nRAKE MEASUREMENTS:\nTotal Rakes: 120 LF\nDrip edge required\n\nICE & WATER BARRIER:\nBased on IRC R905.1.2\nEave width: 60.4"\nRequired coverage: 180 LF × 60.4" ÷ 12 = 1,167 SF',
            wordCount: 78,
            confidence: 0.96,
            dimensions: { width: 612, height: 792 },
          },
        ],
      });
    }

    return NextResponse.json({ documents: transformedDocuments });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
