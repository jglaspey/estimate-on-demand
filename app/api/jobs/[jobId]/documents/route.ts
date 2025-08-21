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
                images: [],
              },
            ];

      // Improved document type detection
      const determineFileType = (
        fileName: string
      ): 'estimate' | 'roof_report' => {
        const name = fileName.toLowerCase();

        // Strong roof report indicators
        const roofIndicators = [
          'roof',
          'report',
          'eagleview',
          'hover',
          'measurements',
          'aerial',
          'satellite',
          'diagram',
          'sketch',
        ];

        // Strong estimate indicators
        const estimateIndicators = [
          'estimate',
          'xactimate',
          'symbility',
          'customer_copy',
          'final_draft',
          'quote',
          'bid',
        ];

        const hasRoofIndicator = roofIndicators.some(indicator =>
          name.includes(indicator)
        );
        const hasEstimateIndicator = estimateIndicators.some(indicator =>
          name.includes(indicator)
        );

        // If both or neither, use additional heuristics
        if (hasRoofIndicator && !hasEstimateIndicator) return 'roof_report';
        if (hasEstimateIndicator && !hasRoofIndicator) return 'estimate';

        // Fallback: Use image count heuristic
        // Roof reports have many images (aerial photos, diagrams, measurements)
        // Estimates have few images (mostly logos, maybe a few photos)
        let totalImages = 0;
        doc.pages.forEach(page => {
          // Count from imageCount field in raw page data
          const imageCountField = page.imageCount || 0;

          // Count from extractedContent images (excluding logos)
          const ec: any = page.extractedContent || {};
          const pageImages =
            ec?.assets?.pageImages ||
            ec?.processing_metadata?.page_images ||
            [];
          const validImages = Array.isArray(pageImages)
            ? pageImages.filter(
                (img: any) =>
                  typeof img === 'string' && !img.toLowerCase().includes('logo')
              )
            : [];

          totalImages += Math.max(imageCountField, validImages.length);
        });

        // Roof reports typically have many images (8+), estimates have few (< 8)
        return totalImages >= 8 ? 'roof_report' : 'estimate';
      };

      return {
        id: doc.id,
        fileName: doc.fileName,
        fileType: determineFileType(doc.fileName),
        filePath: normalizedPath,
        pageCount: doc.pageCount || mappedPages.length || 1,
        status: doc.status,
        pages: safePages,
      };
    });

    // Remove duplicates by fileName and fileType
    const uniqueDocuments = transformedDocuments.filter(
      (doc, index, array) =>
        index ===
        array.findIndex(
          d => d.fileName === doc.fileName && d.fileType === doc.fileType
        )
    );

    return NextResponse.json({ documents: uniqueDocuments });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
