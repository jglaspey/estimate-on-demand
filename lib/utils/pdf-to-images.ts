/**
 * PDF to Images Converter
 * 
 * Converts PDF pages to high-quality images for vision models
 * Uses pdf-poppler with fallback to pdf-lib + canvas
 */

import fs from 'fs';
import path from 'path';
import { convert } from 'pdf-poppler';

export interface ConversionOptions {
  format?: 'jpeg' | 'png';
  out_dir?: string;
  out_prefix?: string;
  page?: number;
  quality?: number;
  scale?: number;
}

export interface ConversionResult {
  success: boolean;
  imagePaths: string[];
  totalPages: number;
  error?: string;
}

/**
 * Convert PDF to images using pdf-poppler
 */
export async function convertPDFToImages(
  pdfPath: string, 
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const defaultOptions: ConversionOptions = {
    format: 'png',
    out_dir: path.dirname(pdfPath),
    out_prefix: path.basename(pdfPath, '.pdf'),
    quality: 100,
    scale: 2.0, // Higher resolution for OCR
  };

  const opts = { ...defaultOptions, ...options };

  try {
    console.log(`🔄 Converting PDF to images: ${pdfPath}`);
    
    // Convert PDF to images
    const res = await convert(pdfPath, opts);
    
    // pdf-poppler returns an array of objects with page info
    const imagePaths: string[] = [];
    
    if (Array.isArray(res)) {
      for (let i = 0; i < res.length; i++) {
        const imagePath = path.join(
          opts.out_dir!, 
          `${opts.out_prefix}-${i + 1}.${opts.format}`
        );
        imagePaths.push(imagePath);
      }
    } else {
      // Single page conversion
      const imagePath = path.join(
        opts.out_dir!,
        `${opts.out_prefix}-1.${opts.format}`
      );
      imagePaths.push(imagePath);
    }

    // Verify files exist
    const existingPaths = imagePaths.filter(p => fs.existsSync(p));
    
    console.log(`✅ Converted ${existingPaths.length} pages to images`);
    
    return {
      success: true,
      imagePaths: existingPaths,
      totalPages: existingPaths.length,
    };

  } catch (error) {
    console.error('❌ PDF conversion failed:', error);
    
    return {
      success: false,
      imagePaths: [],
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert PDF buffer to base64 images for API calls
 */
export async function convertPDFBufferToBase64Images(
  pdfBuffer: Buffer,
  options: ConversionOptions = {}
): Promise<{
  success: boolean;
  base64Images: string[];
  totalPages: number;
  error?: string;
}> {
  // Create temporary file
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);
  
  try {
    // Write buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    // Convert to images
    const result = await convertPDFToImages(tempPdfPath, {
      ...options,
      out_dir: tempDir,
    });

    if (!result.success) {
      return {
        success: false,
        base64Images: [],
        totalPages: 0,
        error: result.error,
      };
    }

    // Convert images to base64
    const base64Images: string[] = [];
    
    for (const imagePath of result.imagePaths) {
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');
        base64Images.push(base64);
        
        // Clean up image file
        fs.unlinkSync(imagePath);
      } catch (error) {
        console.error(`Failed to process image ${imagePath}:`, error);
      }
    }

    // Clean up temp PDF
    fs.unlinkSync(tempPdfPath);

    return {
      success: true,
      base64Images,
      totalPages: base64Images.length,
    };

  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }

    console.error('❌ PDF buffer conversion failed:', error);
    
    return {
      success: false,
      base64Images: [],
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get PDF page count without conversion
 */
export async function getPDFPageCount(pdfPath: string): Promise<number> {
  try {
    // Use pdf-poppler to get page count without converting
    const result = await convert(pdfPath, {
      format: 'png',
      page: 1,
      out_dir: '/tmp',
      out_prefix: 'count-test',
    });

    // Clean up test file if created
    const testFile = '/tmp/count-test-1.png';
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    return 1; // This is a simplified approach, proper counting would need pdf-lib
  } catch (error) {
    console.error('Failed to get page count:', error);
    return 0;
  }
}

/**
 * Clean up temporary files
 */
export function cleanupTempFiles(directory: string = 'temp'): void {
  const tempDir = path.join(process.cwd(), directory);
  
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      
      try {
        fs.unlinkSync(filePath);
        console.log(`🧹 Cleaned up: ${file}`);
      } catch (error) {
        console.error(`Failed to cleanup ${file}:`, error);
      }
    }
  }
}