import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database/client';

// Use absolute path for Railway volume mount
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    let files = formData.getAll('files') as File[];
    // Support single-file uploads sent as "file"
    if (!files || files.length === 0) {
      const single = formData.get('file') as File | null;
      if (single) {
        files = [single];
      }
    }
    const jobDetails = formData.get('jobDetails') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate all files
    for (const file of files) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          {
            error: `File "${file.name}" is not a PDF. Only PDF files are allowed.`,
          },
          { status: 400 }
        );
      }

      // Validate file size (10MB limit as per UI)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is too large. Maximum size is 10MB.`,
          },
          { status: 400 }
        );
      }
    }

    // Parse job details
    try {
      // Validate JSON shape if provided; currently unused

      const _parsedJobDetails = jobDetails ? JSON.parse(jobDetails) : {};
    } catch {
      // ignore
    }

    // Create job record first
    const job = await prisma.job.create({
      data: {
        status: 'UPLOADED',
        fileName: files.map(f => f.name).join(', '),
        fileSize: files.reduce((total, file) => total + file.size, 0),
        filePath: '', // Will be updated with primary document path
      },
    });

    // Process each file and create document records
    const documents = [];
    let primaryFilePath = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${i}_${sanitizedName}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // Save file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Track primary file path (first file)
      if (i === 0) {
        primaryFilePath = filepath;
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          jobId: job.id,
          fileName: file.name,
          filePath: filepath,
          fileSize: file.size,
          mimeType: file.type,
          status: 'UPLOADED',
        },
      });

      documents.push(document);
    }

    // Update job with primary file path
    await prisma.job.update({
      where: { id: job.id },
      data: { filePath: primaryFilePath },
    });

    // Start document processing asynchronously
    console.log(
      `Documents uploaded successfully for job ${job.id}:`,
      files.map(f => f.name)
    );

    // Import and trigger processing queue
    const { processingQueue } = await import(
      '@/lib/extraction/processing-queue'
    );

    // Add to processing queue with all file paths
    const filePaths = documents
      .map(doc => doc.filePath as string)
      .filter(Boolean);
    processingQueue.addToQueue(job.id, filePaths).catch(error => {
      console.error(`Failed to queue job ${job.id} for processing:`, error);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      documentIds: documents.map(doc => doc.id),
      documentCount: documents.length,
      message: `${files.length} file(s) uploaded successfully. Processing has started.`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
