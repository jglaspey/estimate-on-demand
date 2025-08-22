import path from 'path';
import fs from 'fs/promises';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string; docType: string }> }
) {
  const { jobId, docType } = await context.params;

  console.log(`Download request for job ${jobId}, docType: ${docType}`);

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

    console.log(
      `Found ${job.documents.length} documents for job ${jobId}:`,
      job.documents.map(d => ({
        fileName: d.fileName,
        filePath: d.filePath,
      }))
    );

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
        console.log(
          `Found estimate document: ${estimateDoc.fileName}, filePath: ${estimateDoc.filePath}`
        );
        // Use the document's filePath if available, otherwise fall back to job's filePath
        filePath = estimateDoc.filePath || job.filePath;
        fileName = estimateDoc.fileName;
        console.log(`Using filePath for estimate: ${filePath}`);
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

      if (roofDoc) {
        console.log(
          `Found roof document: ${roofDoc.fileName}, filePath: ${roofDoc.filePath}`
        );
        // Use the document's filePath if available
        if (roofDoc.filePath) {
          filePath = roofDoc.filePath;
          fileName = roofDoc.fileName;
          console.log(`Using document's filePath: ${filePath}`);
        } else if (job.filePath) {
          // Fallback: try to find the roof report file in the uploads directory
          const uploadsDir = path.dirname(job.filePath);

          // First, try to find the roof report file in the uploads directory
          // This is more reliable than trying to construct the path
          const files = await fs.readdir(uploadsDir);
          const roofFile = files.find(
            f =>
              f.endsWith('.pdf') &&
              (f.includes('hover') ||
                f.includes('roof') ||
                f.includes('measurement') ||
                f.includes('pro_measurements'))
          );

          if (roofFile) {
            filePath = path.join(uploadsDir, roofFile);
            fileName = roofDoc.fileName;
          } else {
            // Fallback: try the old method of replacing _0_ with _1_
            const baseFileName = path.basename(job.filePath);
            const secondFilePath = path.join(
              uploadsDir,
              baseFileName.replace('_0_', '_1_')
            );

            try {
              await fs.access(secondFilePath);
              filePath = secondFilePath;
              fileName = roofDoc.fileName;
            } catch {
              // No roof report file found
              console.error(
                `Roof report file not found for job ${jobId}. Looking for files containing: hover, roof, measurement, pro_measurements`
              );
            }
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
