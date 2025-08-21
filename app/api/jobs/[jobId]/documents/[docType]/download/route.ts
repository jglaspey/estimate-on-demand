import path from 'path';
import fs from 'fs/promises';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string; docType: string }> }
) {
  const { jobId, docType } = await context.params;

  try {
    // Get the job to find the file paths
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let filePath: string | null = null;
    let fileName: string = '';

    // Determine which document to download based on type
    if (docType === 'estimate') {
      // Find the estimate document
      const estimateDoc = job.documents.find(
        doc =>
          doc.fileName.toLowerCase().includes('estimate') ||
          doc.fileName.toLowerCase().includes('customer') ||
          (!doc.fileName.toLowerCase().includes('roof') &&
            !doc.fileName.toLowerCase().includes('hover') &&
            !doc.fileName.toLowerCase().includes('eagleview'))
      );

      if (estimateDoc) {
        // Use the job's filePath for the first document (estimate)
        filePath = job.filePath;
        fileName = estimateDoc.fileName;
      }
    } else if (docType === 'roof_report') {
      // Find the roof report document
      const roofDoc = job.documents.find(
        doc =>
          doc.fileName.toLowerCase().includes('roof') ||
          doc.fileName.toLowerCase().includes('hover') ||
          doc.fileName.toLowerCase().includes('eagleview') ||
          doc.fileName.toLowerCase().includes('measurement')
      );

      if (roofDoc && job.filePath) {
        // Construct the path for the second document
        const uploadsDir = path.dirname(job.filePath);
        const baseFileName = path.basename(job.filePath);
        // The second file typically has _1_ instead of _0_ in the filename
        const secondFilePath = path.join(
          uploadsDir,
          baseFileName.replace('_0_', '_1_')
        );

        // Check if the file exists
        try {
          await fs.access(secondFilePath);
          filePath = secondFilePath;
          fileName = roofDoc.fileName;
        } catch {
          // If the modified path doesn't exist, try to find it in the uploads directory
          const files = await fs.readdir(uploadsDir);
          const roofFile = files.find(
            f =>
              f.includes(jobId.slice(-8)) &&
              (f.includes('hover') ||
                f.includes('roof') ||
                f.includes('measurement'))
          );
          if (roofFile) {
            filePath = path.join(uploadsDir, roofFile);
            fileName = roofDoc.fileName;
          }
        }
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Read the file
    try {
      const fileBuffer = await fs.readFile(filePath);

      // Convert Buffer to Uint8Array for NextResponse
      const uint8Array = new Uint8Array(fileBuffer);

      // Return the file as a blob
      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
