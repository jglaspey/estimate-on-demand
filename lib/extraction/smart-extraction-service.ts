import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

import { AnalysisWorker } from '../analysis/analysis-worker';
import { prisma } from '../database/client';
import { wsManager } from '../websocket/socket-handler';

import { claudeLineItemExtractor } from './claude-line-item-extractor';
import { claudeMeasurementExtractor } from './claude-measurement-extractor';

// Mistral SDK not currently used - using direct OCR API calls for better control

const MISTRAL_OCR_MODEL = 'mistral-ocr-2505';

export interface DocumentTypeResult {
  type: 'estimate' | 'roof_report' | 'unknown';
  confidence: number;
  reasoning: string;
  fileName: string;
}

export interface CoreInfo {
  customerName?: string;
  propertyAddress?: string;
  insuranceCarrier?: string;
  claimNumber?: string;
  policyNumber?: string;
  dateOfLoss?: string;
  // Canonical going forward
  claimRep?: string;
  // Legacy (kept for backward compatibility during transition)
  adjusterName?: string;
  originalEstimate?: number;
}

export interface DetailedRoofingData {
  squares?: number;
  stories?: number;
  rake?: number;
  eave?: number;
  ridgeHip?: number;
  valley?: number;
  slope?: string;
  material?: string;
}

/**
 * Smart Document Extraction Service
 * 3-Phase Progressive Extraction for Speed & User Experience
 */
export class SmartExtractionService {
  /**
   * PHASE 1: Lightning-fast core info extraction (30-60 seconds)
   * - Identify which document is the estimate
   * - Extract first 3 pages of estimate for core customer/claim info
   * - Update UI immediately with basic info
   */
  async extractCoreInfoFast(
    filePaths: string[],
    jobId: string
  ): Promise<CoreInfo> {
    console.log(`🚀 PHASE 1: Fast core extraction for job ${jobId}`);
    const startTime = Date.now();

    try {
      // Step 1: Identify document types (parallel processing)
      const documentTypes = await Promise.all(
        filePaths.map(async filePath => {
          return this.identifyDocumentType(filePath);
        })
      );

      // Step 2: Find the estimate document
      const estimateDoc = documentTypes.find(doc => doc.type === 'estimate');
      if (!estimateDoc) {
        console.warn('No estimate document found, using first document');
      }

      // Step 3: Extract first 3 pages of estimate for core info
      const targetFile = estimateDoc
        ? filePaths[documentTypes.indexOf(estimateDoc)]
        : filePaths[0];

      console.log(
        `📄 Extracting core info from: ${targetFile} (first 3 pages)`
      );

      // Quick OCR of first 3 pages only
      const coreText = await this.extractFirstPagesOCR(targetFile, 3);

      // Extract core fields using simple regex patterns (no AI calls)
      const coreInfo = this.extractCoreInfoFromText(coreText);

      // Update job immediately with whatever we found
      await this.updateJobWithCoreInfo(jobId, coreInfo);

      const processingTime = Date.now() - startTime;
      console.log(`✅ PHASE 1 completed in ${processingTime}ms`);

      // Emit progress event
      wsManager.emitJobProgress({
        jobId,
        status: 'TEXT_EXTRACTED',
        stage: 'core_info_ready',
        progress: 40,
        message: `Core information extracted (${processingTime}ms)`,
        timestamp: Date.now(),
        extractedSummary: {
          hasCustomer: !!coreInfo.customerName,
          hasAddress: !!coreInfo.propertyAddress,
          hasCarrier: !!coreInfo.insuranceCarrier,
          hasClaim: !!coreInfo.claimNumber,
        },
      });

      return coreInfo;
    } catch (error) {
      console.error(`❌ PHASE 1 failed for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * PHASE 2: Full document extraction (parallel, in background)
   * - Process all pages of all documents
   * - Extract detailed roofing measurements
   * - No business rule analysis (that's Phase 3)
   */
  async extractFullDocumentData(
    filePaths: string[],
    jobId: string
  ): Promise<void> {
    console.log(
      `🔄 PHASE 2: Full document extraction for job ${jobId} (background)`
    );
    const startTime = Date.now();

    try {
      // Process all documents in parallel
      const extractionPromises = filePaths.map(async (filePath, index) => {
        console.log(
          `📖 Processing document ${index + 1}/${filePaths.length}: ${filePath}`
        );

        // Identify document type first
        const docType = await this.identifyDocumentType(filePath);

        // Extract all pages (text + embedded image base64s)
        const fullText = await this.extractAllPagesOCR(filePath);

        // Persist embedded images to /uploads and build page->paths mapping
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try {
          mkdirSync(uploadsDir, { recursive: true });
        } catch {}

        const pageImagePaths: string[][] = [];
        for (const p of fullText.pages) {
          const paths: string[] = [];
          if (p.imagesBase64 && p.imagesBase64.length > 0) {
            p.imagesBase64.forEach((b64, i) => {
              try {
                const fileBase = `${path.basename(filePath, path.extname(filePath))}-p${p.pageNumber}-img${i + 1}.jpeg`;
                const outPath = path.join(uploadsDir, fileBase);
                if (!existsSync(outPath)) {
                  const buf = Buffer.from(b64, 'base64');
                  writeFileSync(outPath, buf);
                }
                paths.push(outPath);
              } catch (err) {
                console.warn('Failed to write OCR image:', err);
              }
            });
          }
          pageImagePaths.push(paths);
        }

        // Save raw page content to database (attach extracted image paths)
        await this.savePageContentToDatabase(
          jobId,
          filePath,
          fullText,
          pageImagePaths
        );

        // Get Phase 1 core info from job record for context
        const job = await prisma.job.findUnique({
          where: { id: jobId },
        });

        const coreInfo: CoreInfo = {
          customerName: job?.customerName || undefined,
          propertyAddress: job?.customerAddress || undefined,
          insuranceCarrier: job?.carrier || undefined,
          claimNumber: job?.claimNumber || undefined,
          policyNumber: job?.policyNumber || undefined,
          dateOfLoss: job?.dateOfLoss?.toISOString() || undefined,
          claimRep: job?.claimRep || undefined,
          adjusterName: job?.claimRep || undefined,
          originalEstimate: job?.originalEstimate || undefined,
        };

        // Phase 2a & 2b: Claude-based structured extraction
        // Fix: Use the correct property 'content' from Mistral OCR pages
        const structuredData = await this.extractStructuredDataWithClaude(
          fullText.fullText,
          fullText.pages.map(p => p.content || ''),
          docType,
          jobId,
          coreInfo
        );

        return {
          filePath,
          fullText,
          structuredData,
          docType,
        };
      });

      const results = await Promise.all(extractionPromises);

      // Merge all structured data from Claude extractors
      const mergedData = this.mergeClaudeExtractionData(results);

      // Save comprehensive extraction to MistralExtraction table
      await this.saveMistralExtractionRecord(jobId, mergedData, results);

      // Update job with detailed data
      await this.updateJobWithDetailedData(jobId, mergedData);

      const processingTime = Date.now() - startTime;
      console.log(`✅ PHASE 2 completed in ${processingTime}ms`);

      // Update status to ready for business rules
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'ANALYSIS_READY',
          updatedAt: new Date(),
        },
      });

      // Emit progress event
      wsManager.emitJobProgress({
        jobId,
        status: 'ANALYSIS_READY',
        stage: 'extraction_complete',
        progress: 80,
        message: `Full document extraction complete (${processingTime}ms)`,
        timestamp: Date.now(),
        extractedSummary: {
          hasRoofData: !!mergedData.roofingData,
          pageCount: results.reduce(
            (sum, r) => sum + r.fullText.pages.length,
            0
          ),
          documentsProcessed: results.length,
        },
      });

      // PHASE 3: Automatic business rule analysis (no manual trigger needed)
      console.log(
        `🔄 PHASE 3: Starting automatic business rule analysis for job ${jobId}`
      );
      try {
        const analysisWorker = new AnalysisWorker({
          jobId,
          onProgress: progress => {
            console.log(
              `📊 ${progress.ruleName}: ${progress.status} (${progress.progress}%) - ${progress.message}`
            );
            // Emit real-time analysis progress
            wsManager.emitJobProgress({
              jobId,
              status: 'ANALYZING',
              stage: progress.ruleName,
              progress: 80 + progress.progress * 0.2, // Scale progress from 80-100%
              message: `Analyzing ${progress.ruleName}: ${progress.message}`,
              timestamp: Date.now(),
            });
          },
          enableRealTimeUpdates: true,
        });

        // Run all business rule analyses
        const analysisResults = await analysisWorker.runAllBusinessRules();

        // Update job status to REVIEWING
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'REVIEWING',
            updatedAt: new Date(),
          },
        });

        // Emit completion event
        wsManager.emitJobProgress({
          jobId,
          status: 'REVIEWING',
          stage: 'analysis_complete',
          progress: 100,
          message: 'Business rule analysis complete - ready for review',
          timestamp: Date.now(),
          extractedSummary: {
            hasRoofData: !!mergedData.roofingData,
            pageCount: results.reduce(
              (sum, r) => sum + r.fullText.pages.length,
              0
            ),
            documentsProcessed: results.length,
            rulesAnalyzed: Object.values(analysisResults).filter(
              r => r !== null
            ).length,
            supplementsNeeded: Object.values(analysisResults).filter(
              r => r && r.status === 'SUPPLEMENT_NEEDED'
            ).length,
          },
        });

        console.log(
          `✅ PHASE 3 completed: Business rule analysis finished for job ${jobId}`
        );
      } catch (analysisError) {
        console.error(`❌ PHASE 3 failed for job ${jobId}:`, analysisError);

        // Don't fail the entire extraction if analysis fails
        // Just log the error and emit a warning
        wsManager.emitJobProgress({
          jobId,
          status: 'ANALYSIS_READY',
          stage: 'analysis_warning',
          progress: 85,
          message: `Analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}. Manual analysis may be needed.`,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`❌ PHASE 2 failed for job ${jobId}:`, error);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: `Full extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          updatedAt: new Date(),
        },
      });

      wsManager.emitJobError(
        jobId,
        `Full extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Identify document type from filename and first page
   */
  private async identifyDocumentType(
    filePath: string
  ): Promise<DocumentTypeResult> {
    const fileName = filePath.split('/').pop() || '';

    // Quick heuristics based on filename
    if (
      fileName.toLowerCase().includes('estimate') ||
      fileName.toLowerCase().includes('est')
    ) {
      return {
        type: 'estimate',
        confidence: 0.8,
        reasoning: 'Filename contains "estimate"',
        fileName,
      };
    }

    if (
      fileName.toLowerCase().includes('roof') ||
      fileName.toLowerCase().includes('eagle') ||
      fileName.toLowerCase().includes('report')
    ) {
      return {
        type: 'roof_report',
        confidence: 0.8,
        reasoning: 'Filename suggests roof report',
        fileName,
      };
    }

    // If unclear from filename, check first page content
    try {
      const firstPageText = await this.extractFirstPagesOCR(filePath, 1);

      // Look for estimate indicators
      if (
        firstPageText.toLowerCase().includes('estimate') ||
        firstPageText.toLowerCase().includes('line item') ||
        firstPageText.toLowerCase().includes('claim number') ||
        firstPageText.toLowerCase().includes('policy number')
      ) {
        return {
          type: 'estimate',
          confidence: 0.7,
          reasoning: 'First page contains estimate keywords',
          fileName,
        };
      }

      // Look for roof report indicators
      if (
        firstPageText.toLowerCase().includes('roof report') ||
        firstPageText.toLowerCase().includes('squares') ||
        firstPageText.toLowerCase().includes('ridge') ||
        firstPageText.toLowerCase().includes('slope')
      ) {
        return {
          type: 'roof_report',
          confidence: 0.7,
          reasoning: 'First page contains roof measurement keywords',
          fileName,
        };
      }
    } catch (error) {
      console.warn(`Could not analyze first page of ${fileName}:`, error);
    }

    return {
      type: 'unknown',
      confidence: 0.1,
      reasoning: 'Unable to determine document type',
      fileName,
    };
  }

  /**
   * Fast OCR extraction of first N pages only
   */
  private async extractFirstPagesOCR(
    filePath: string,
    pageCount: number = 3
  ): Promise<string> {
    try {
      const pdfBuffer = readFileSync(filePath);
      const base64Pdf = pdfBuffer.toString('base64');

      const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

      const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MISTRAL_OCR_MODEL,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64Pdf}`,
          },
          pages: pages,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Mistral OCR API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const ocrPages = result.pages || result.data?.pages || [];

      return ocrPages
        .map((page: any) => page.markdown || page.text || page.content || '')
        .join('\n\n');
    } catch (error) {
      console.error('Fast OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Full OCR extraction of all pages
   */
  private async extractAllPagesOCR(filePath: string): Promise<{
    fullText: string;
    pages: Array<{
      pageNumber: number;
      content: string;
      confidence: number;
      imagesBase64?: string[];
    }>;
  }> {
    try {
      const pdfBuffer = readFileSync(filePath);
      const base64Pdf = pdfBuffer.toString('base64');

      // Attempt with snake_case first (HTTP API often expects snake_case)
      let response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MISTRAL_OCR_MODEL,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64Pdf}`,
          },
          // No pages parameter = extract all pages
          include_image_base64: true,
        }),
      });

      // If unprocessable (likely param mismatch), retry with camelCase param
      if (!response.ok && response.status === 422) {
        response = await fetch('https://api.mistral.ai/v1/ocr', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY || ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MISTRAL_OCR_MODEL,
            document: {
              type: 'document_url',
              document_url: `data:application/pdf;base64,${base64Pdf}`,
            },
            includeImageBase64: true,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(
          `Mistral OCR API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const ocrPages = result.pages || [];

      const extractedPages = ocrPages.map((page: any, index: number) => {
        const content = page.markdown || page.text || page.content || '';
        const imgs = Array.isArray(page.images)
          ? page.images
              .map((img: any) => img.image_base64 || img.imageBase64)
              .filter((b64: any) => typeof b64 === 'string' && b64.length > 0)
          : [];
        console.log(
          `📄 OCR page ${index + 1}: text=${String(content || '').length} chars, images=${imgs.length}`
        );
        return {
          pageNumber: index + 1,
          content: String(content || '').trim(),
          confidence: page.confidence || 0.95,
          imagesBase64: imgs,
        };
      });

      const fullText = extractedPages
        .map((p: { content: string }) => p.content)
        .join('\n\n');

      return { fullText, pages: extractedPages };
    } catch (error) {
      console.error('Full OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract core info using regex patterns (no AI calls for speed)
   */
  private extractCoreInfoFromText(text: string): CoreInfo {
    const coreInfo: CoreInfo = {};

    try {
      // Customer name patterns
      const namePatterns = [
        /(?:customer|insured|property owner|name):\s*([^\n\r]{2,50})/i,
        /^([A-Z][a-z]+ [A-Z][a-z]+)\s*$/m, // Simple firstname lastname
        /insured:\s*([^\n\r]{2,50})/i,
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 2) {
          coreInfo.customerName = match[1].trim();
          break;
        }
      }

      // Address patterns
      const addressPatterns = [
        /(?:property address|address|location):\s*([^\n\r]{5,100})/i,
        /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|drive|dr|court|ct|lane|ln|way|road|rd)[^\n\r]{0,50}/i,
      ];

      for (const pattern of addressPatterns) {
        const match = text.match(pattern);
        if (match) {
          const candidate = (match[1] || match[0] || '').trim();
          if (candidate.length > 5) {
            coreInfo.propertyAddress = candidate;
            break;
          }
        }
      }

      // Insurance carrier patterns
      const carrierPatterns = [
        /(?:carrier|insurance|company):\s*([A-Za-z\s&]+(?:insurance|assurance))/i,
        /(allstate|state farm|progressive|usaa|farmers|encompass|liberty mutual)/i,
      ];

      for (const pattern of carrierPatterns) {
        const match = text.match(pattern);
        if (match) {
          coreInfo.insuranceCarrier = (match[1] || match[0]).trim();
          break;
        }
      }

      // Claim number patterns
      const claimPatterns = [
        /(?:claim|claim number|claim #):\s*([A-Za-z0-9\-]{5,20})/i,
        /claim\s*#?\s*([A-Za-z0-9\-]{5,20})/i,
      ];

      for (const pattern of claimPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length >= 5) {
          coreInfo.claimNumber = match[1].trim();
          break;
        }
      }

      // Policy number patterns
      const policyPatterns = [
        /(?:policy|policy number|policy #):\s*([A-Za-z0-9\-]{5,25})/i,
        /policy\s*#?\s*([A-Za-z0-9\-]{5,25})/i,
      ];

      for (const pattern of policyPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length >= 5) {
          coreInfo.policyNumber = match[1].trim();
          break;
        }
      }

      // Date of loss patterns
      const datePatterns = [
        /(?:date of loss|loss date|incident date):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
        /(?:date of loss|loss date):\s*([A-Za-z]+ \d{1,2}, \d{4})/i,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          coreInfo.dateOfLoss = match[1].trim();
          break;
        }
      }

      // Claim rep (adjuster) name patterns
      const adjusterPatterns = [
        /(?:adjuster|claim rep|claim representative):\s*([A-Za-z\s]{2,40})/i,
        /adjuster:\s*([A-Za-z\s]{2,40})/i,
      ];

      for (const pattern of adjusterPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 2) {
          const name = match[1].trim();
          coreInfo.claimRep = name;
          coreInfo.adjusterName = name; // legacy mirror for compatibility
          break;
        }
      }

      // Original estimate patterns
      const estimatePatterns = [
        /(?:total|estimate|amount):\s*\$?([\d,]+\.?\d*)/i,
        /grand total:\s*\$?([\d,]+\.?\d*)/i,
      ];

      for (const pattern of estimatePatterns) {
        const match = text.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 100) {
            // Reasonable estimate minimum
            coreInfo.originalEstimate = amount;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Core info extraction error:', error);
    }

    return coreInfo;
  }

  /**
   * Extract customer-related information from text
   * Used for validation against Phase 1 extraction
   */
  private extractCustomerInfoFromText(text: string): {
    customerName?: string;
    propertyAddress?: string;
  } {
    const customerInfo: { customerName?: string; propertyAddress?: string } =
      {};

    try {
      // Customer name patterns (similar to extractCoreInfoFromText but can have variations)
      const namePatterns = [
        /(?:customer|insured|property owner|name):\s*([^\n\r]{2,50})/i,
        /^([A-Z][a-z]+ [A-Z][a-z]+)\s*$/m,
        /insured:\s*([^\n\r]{2,50})/i,
        /property owner:\s*([^\n\r]{2,50})/i,
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 2) {
          customerInfo.customerName = match[1].trim();
          break;
        }
      }

      // Property address patterns
      const addressPatterns = [
        /(?:property address|address|location):\s*([^\n\r]{10,100})/i,
        /(?:job site|site address):\s*([^\n\r]{10,100})/i,
        /property:\s*([^\n\r]{10,100})/i,
      ];

      for (const pattern of addressPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 10) {
          customerInfo.propertyAddress = match[1].trim();
          break;
        }
      }
    } catch (error) {
      console.error('Customer info extraction error:', error);
    }

    return customerInfo;
  }

  /**
   * Extract claim-related information from text
   * Used for validation against Phase 1 extraction
   */
  private extractClaimInfoFromText(text: string): {
    insuranceCarrier?: string;
    claimNumber?: string;
    policyNumber?: string;
    dateOfLoss?: string;
    // Canonical going forward
    claimRep?: string;
    // Legacy
    adjusterName?: string;
    originalEstimate?: number;
  } {
    const claimInfo: {
      insuranceCarrier?: string;
      claimNumber?: string;
      policyNumber?: string;
      dateOfLoss?: string;
      claimRep?: string;
      adjusterName?: string;
      originalEstimate?: number;
    } = {};

    try {
      // Claim number patterns
      const claimPatterns = [
        /(?:claim|claim number|claim #):\s*([A-Z0-9\-]{6,20})/i,
        /claim\s*#?\s*([A-Z0-9\-]{6,20})/i,
      ];

      for (const pattern of claimPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length >= 6) {
          claimInfo.claimNumber = match[1].trim();
          break;
        }
      }

      // Policy number patterns
      const policyPatterns = [
        /(?:policy|policy number|policy #):\s*([A-Z0-9\-]{6,20})/i,
        /policy\s*#?\s*([A-Z0-9\-]{6,20})/i,
      ];

      for (const pattern of policyPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length >= 6) {
          claimInfo.policyNumber = match[1].trim();
          break;
        }
      }

      // Insurance carrier patterns
      const carrierPatterns = [
        /(?:carrier|insurance|company):\s*([A-Za-z\s&]{3,40})/i,
        /insured by:\s*([A-Za-z\s&]{3,40})/i,
      ];

      for (const pattern of carrierPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 3) {
          claimInfo.insuranceCarrier = match[1].trim();
          break;
        }
      }

      // Date of loss patterns
      const datePatterns = [
        /(?:date of loss|loss date|incident date):\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /loss:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          claimInfo.dateOfLoss = match[1].trim();
          break;
        }
      }

      // Claim rep (adjuster) name patterns
      const adjusterPatterns = [
        /(?:adjuster|claim rep|representative):\s*([A-Za-z\s]{2,40})/i,
        /adjuster:\s*([A-Za-z\s]{2,40})/i,
      ];

      for (const pattern of adjusterPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 2) {
          const name = match[1].trim();
          claimInfo.claimRep = name;
          claimInfo.adjusterName = name; // legacy mirror
          break;
        }
      }

      // Original estimate patterns
      const estimatePatterns = [
        /(?:total|estimate|amount):\s*\$?([\d,]+\.?\d*)/i,
        /grand total:\s*\$?([\d,]+\.?\d*)/i,
      ];

      for (const pattern of estimatePatterns) {
        const match = text.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 100) {
            claimInfo.originalEstimate = amount;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Claim info extraction error:', error);
    }

    return claimInfo;
  }

  /**
   * Validate extraction results between Phase 1 and Phase 2
   * Returns merged data with confidence flags
   */
  private validateExtractionResults(
    phase1CoreInfo: CoreInfo,
    phase2CustomerInfo: { customerName?: string; propertyAddress?: string },
    phase2ClaimInfo: {
      insuranceCarrier?: string;
      claimNumber?: string;
      policyNumber?: string;
      dateOfLoss?: string;
      claimRep?: string;
      adjusterName?: string;
      originalEstimate?: number;
    }
  ): {
    customerInfo: {
      customerName?: string;
      propertyAddress?: string;
      _confidence?: string;
    };
    claimInfo: {
      insuranceCarrier?: string;
      claimNumber?: string;
      policyNumber?: string;
      dateOfLoss?: string;
      claimRep?: string;
      adjusterName?: string; // legacy display only
      originalEstimate?: number;
      _confidence?: string;
    };
    discrepancyNotes: string[];
    validationSummary: {
      agreements: number;
      disagreements: number;
      phase1Only: number;
      phase2Only: number;
    };
  } {
    const validationSummary = {
      agreements: 0,
      disagreements: 0,
      phase1Only: 0,
      phase2Only: 0,
    };

    // Customer Info Validation
    const customerInfo: any = {};
    const discrepancyNotes: string[] = [];

    // Customer Name
    if (phase1CoreInfo.customerName && phase2CustomerInfo.customerName) {
      if (phase1CoreInfo.customerName === phase2CustomerInfo.customerName) {
        customerInfo.customerName = phase1CoreInfo.customerName;
        validationSummary.agreements++;
      } else {
        customerInfo.customerName = `${phase1CoreInfo.customerName}*`;
        customerInfo._confidence = `Customer name disagreement: Phase1="${phase1CoreInfo.customerName}" Phase2="${phase2CustomerInfo.customerName}"`;
        discrepancyNotes.push(
          `* customerName: Phase 1 = "${phase1CoreInfo.customerName}", Phase 2 = "${phase2CustomerInfo.customerName}"`
        );
        validationSummary.disagreements++;
      }
    } else if (phase1CoreInfo.customerName) {
      customerInfo.customerName = phase1CoreInfo.customerName;
      validationSummary.phase1Only++;
    } else if (phase2CustomerInfo.customerName) {
      customerInfo.customerName = phase2CustomerInfo.customerName;
      // No asterisk or note for phase-only finds per requirements
      validationSummary.phase2Only++;
    }

    // Property Address
    if (phase1CoreInfo.propertyAddress && phase2CustomerInfo.propertyAddress) {
      if (
        phase1CoreInfo.propertyAddress === phase2CustomerInfo.propertyAddress
      ) {
        customerInfo.propertyAddress = phase1CoreInfo.propertyAddress;
        validationSummary.agreements++;
      } else {
        customerInfo.propertyAddress = `${phase1CoreInfo.propertyAddress}*`;
        customerInfo._confidence =
          (customerInfo._confidence || '') +
          ` Property address disagreement: Phase1="${phase1CoreInfo.propertyAddress}" Phase2="${phase2CustomerInfo.propertyAddress}"`;
        discrepancyNotes.push(
          `* propertyAddress: Phase 1 = "${phase1CoreInfo.propertyAddress}", Phase 2 = "${phase2CustomerInfo.propertyAddress}"`
        );
        validationSummary.disagreements++;
      }
    } else if (phase1CoreInfo.propertyAddress) {
      customerInfo.propertyAddress = phase1CoreInfo.propertyAddress;
      validationSummary.phase1Only++;
    } else if (phase2CustomerInfo.propertyAddress) {
      customerInfo.propertyAddress = phase2CustomerInfo.propertyAddress;
      // No asterisk or note for phase-only finds per requirements
      validationSummary.phase2Only++;
    }

    // Normalization helpers
    const normalizeWhitespaceCase = (val: any) =>
      typeof val === 'string'
        ? val.trim().replace(/\s+/g, ' ').toLowerCase()
        : val;
    const normalizeDate = (val: any) => {
      if (!val) return val;
      // Accept variants like MM/DD/YYYY or M/D/YY etc., return MM/DD/YYYY
      const d = new Date(val);
      if (isNaN(d.getTime())) return normalizeWhitespaceCase(val);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };
    const normalizeMoneyNumber = (val: any) => {
      if (val == null) return val;
      if (typeof val === 'number') return Number(val.toFixed(2));
      if (typeof val === 'string') {
        const n = parseFloat(val.replace(/[^0-9.]/g, ''));
        if (!isNaN(n)) return Number(n.toFixed(2));
      }
      return val;
    };

    // Claim Info Validation (similar pattern for all claim fields)
    const claimInfo: any = {};

    // Helper function to validate field
    const validateField = (
      fieldName: string,
      phase1Value: any,
      phase2Value: any
    ) => {
      // Field-specific normalization
      let p1 = phase1Value;
      let p2 = phase2Value;
      if (fieldName === 'dateOfLoss') {
        p1 = normalizeDate(p1);
        p2 = normalizeDate(p2);
      } else if (fieldName === 'originalEstimate') {
        p1 = normalizeMoneyNumber(p1);
        p2 = normalizeMoneyNumber(p2);
      } else {
        p1 = normalizeWhitespaceCase(p1);
        p2 = normalizeWhitespaceCase(p2);
      }

      if (p1 || p2) {
        console.warn(
          `[Validation] ${fieldName}: P1="${phase1Value}" | P2="${phase2Value}" => norm P1="${p1}" | norm P2="${p2}"`
        );
      }

      if (phase1Value && phase2Value) {
        if (p1 === p2) {
          claimInfo[fieldName] = phase1Value; // keep original formatting where possible
          validationSummary.agreements++;
        } else {
          claimInfo[fieldName] = `${phase1Value}*`;
          claimInfo._confidence =
            (claimInfo._confidence || '') +
            ` ${fieldName} disagreement: Phase1="${phase1Value}" Phase2="${phase2Value}"`;
          validationSummary.disagreements++;
          discrepancyNotes.push(
            `* ${fieldName}: Phase 1 = "${phase1Value}", Phase 2 = "${phase2Value}"`
          );
        }
      } else if (phase1Value) {
        claimInfo[fieldName] = phase1Value;
        // No note for phase-only
        validationSummary.phase1Only++;
      } else if (phase2Value) {
        claimInfo[fieldName] = phase2Value;
        // No asterisk or note for phase-only
        validationSummary.phase2Only++;
      }
    };

    validateField(
      'insuranceCarrier',
      phase1CoreInfo.insuranceCarrier,
      phase2ClaimInfo.insuranceCarrier
    );
    validateField(
      'claimNumber',
      phase1CoreInfo.claimNumber,
      phase2ClaimInfo.claimNumber
    );
    validateField(
      'policyNumber',
      phase1CoreInfo.policyNumber,
      phase2ClaimInfo.policyNumber
    );
    validateField(
      'dateOfLoss',
      phase1CoreInfo.dateOfLoss,
      phase2ClaimInfo.dateOfLoss
    );
    // Canonical: claimRep (fallback to legacy adjusterName if needed)
    validateField(
      'claimRep',
      phase1CoreInfo.claimRep || phase1CoreInfo.adjusterName,
      phase2ClaimInfo.claimRep || phase2ClaimInfo.adjusterName
    );
    validateField(
      'originalEstimate',
      phase1CoreInfo.originalEstimate,
      phase2ClaimInfo.originalEstimate
    );

    return {
      customerInfo,
      claimInfo,
      discrepancyNotes,
      validationSummary,
    };
  }

  /**
   * Phase 2a & 2b: Extract structured data using Claude extractors
   */
  private async extractStructuredDataWithClaude(
    fullText: string,
    pageTexts: string[],
    docType: DocumentTypeResult,
    jobId: string,
    phase1CoreInfo: CoreInfo
  ): Promise<any> {
    console.log(`🧠 Claude extraction for ${docType.type} (job ${jobId})`);

    try {
      let lineItems: any[] = [];
      let roofMeasurements: any = {};
      let roofType: any = {};

      if (docType.type === 'estimate') {
        // Phase 2a: Extract line items from estimate
        console.log('  📋 Extracting line items from estimate...');
        const lineItemResult = await claudeLineItemExtractor.extractLineItems(
          fullText,
          pageTexts,
          jobId
        );

        lineItems = lineItemResult.lineItems;
        roofType = lineItemResult.roofType;

        console.log(
          `  ✅ Found ${lineItems.length} line items, ${lineItemResult.ridgeCapItems.length} ridge cap items`
        );
        console.log(
          `  🏠 Roof type: ${roofType.roofType} (${Math.round(roofType.confidence * 100)}% confidence)`
        );
      }

      if (docType.type === 'roof_report') {
        // Phase 2b: Extract measurements from roof report
        console.log('  📏 Extracting measurements from roof report...');
        const measurementResult =
          await claudeMeasurementExtractor.extractMeasurements(
            fullText,
            pageTexts,
            jobId
          );

        roofMeasurements = measurementResult.measurements;

        console.log(
          `  ✅ Ridge: ${roofMeasurements.ridgeLength || 'N/A'} LF, Hip: ${roofMeasurements.hipLength || 'N/A'} LF`
        );

        if (measurementResult.warnings.length > 0) {
          console.warn(
            '  ⚠️ Measurement warnings:',
            measurementResult.warnings
          );
        }
      }

      // Create structured data in format expected by the system
      const structuredData: any = {
        documentType: docType.type,
        lineItems,
        roofMeasurements,
        roofType,
        // Legacy fields for compatibility
        classification: {
          type: docType.type,
          confidence: docType.confidence,
          reasoning: docType.reasoning,
        },
        roofingData: docType.type === 'roof_report' ? roofMeasurements : null,
      };

      // Phase 2 Validation: Cross-check extraction results
      console.log(
        `🔍 Validating Phase 2 extraction against Phase 1 for job ${jobId}`
      );

      // Extract customer and claim info from full text for validation
      const phase2CustomerInfo = this.extractCustomerInfoFromText(fullText);
      const phase2ClaimInfo = this.extractClaimInfoFromText(fullText);

      // Validate and merge results
      const validation = this.validateExtractionResults(
        phase1CoreInfo,
        phase2CustomerInfo,
        phase2ClaimInfo
      );

      // Add validation results to structured data
      structuredData.customerInfo = validation.customerInfo;
      structuredData.claimInfo = validation.claimInfo;
      structuredData.validation = {
        summary: validation.validationSummary,
        notes: validation.discrepancyNotes,
      };
      structuredData.validationSummary = validation.validationSummary;

      // Log validation results
      const { agreements, disagreements, phase1Only, phase2Only } =
        validation.validationSummary;
      console.log(
        `📊 Validation Summary: ${agreements} agreements, ${disagreements} disagreements, ${phase1Only} Phase1-only, ${phase2Only} Phase2-only`
      );

      if (disagreements > 0) {
        console.warn(
          `⚠️ Found ${disagreements} field disagreements - check asterisked (*) fields for manual verification`
        );
      }

      return structuredData;
    } catch (error) {
      console.error(`❌ Claude extraction failed for ${docType.type}:`, error);

      // Fall back to simple extraction
      return this.extractStructuredDataFromText(fullText);
    }
  }

  /**
   * Extract structured data from full text (roof measurements, etc.) - FALLBACK
   */
  private extractStructuredDataFromText(text: string): {
    roofingData?: DetailedRoofingData;
    lineItemCount?: number;
  } {
    const structuredData: {
      roofingData?: DetailedRoofingData;
      lineItemCount?: number;
    } = {};

    try {
      const roofingData: DetailedRoofingData = {};

      // Squares patterns
      const squarePatterns = [
        /(?:roof )?squares?:\s*(\d+\.?\d*)/i,
        /(\d+\.?\d*)\s*squares?/i,
      ];

      for (const pattern of squarePatterns) {
        const match = text.match(pattern);
        if (match) {
          const squares = parseFloat(match[1]);
          if (!isNaN(squares) && squares > 0 && squares < 200) {
            roofingData.squares = squares;
            break;
          }
        }
      }

      // Stories patterns
      const storyPatterns = [
        /(?:stories?|story):\s*(\d+)/i,
        /(\d+)\s*stor(?:y|ies)/i,
      ];

      for (const pattern of storyPatterns) {
        const match = text.match(pattern);
        if (match) {
          const stories = parseInt(match[1]);
          if (!isNaN(stories) && stories > 0 && stories < 10) {
            roofingData.stories = stories;
            break;
          }
        }
      }

      // Rake length patterns
      const rakePatterns = [
        /rake[s]?:\s*(\d+\.?\d*)\s*(?:lf|ft|feet)/i,
        /(\d+\.?\d*)\s*(?:lf|ft)\s*rake/i,
      ];

      for (const pattern of rakePatterns) {
        const match = text.match(pattern);
        if (match) {
          const rake = parseFloat(match[1]);
          if (!isNaN(rake) && rake > 0) {
            roofingData.rake = rake;
            break;
          }
        }
      }

      // Eave length patterns
      const eavePatterns = [
        /eave[s]?:\s*(\d+\.?\d*)\s*(?:lf|ft|feet)/i,
        /(\d+\.?\d*)\s*(?:lf|ft)\s*eave/i,
      ];

      for (const pattern of eavePatterns) {
        const match = text.match(pattern);
        if (match) {
          const eave = parseFloat(match[1]);
          if (!isNaN(eave) && eave > 0) {
            roofingData.eave = eave;
            break;
          }
        }
      }

      // Ridge/Hip patterns
      const ridgeHipPatterns = [
        /(?:ridge|hip).*?(\d+\.?\d*)\s*(?:lf|ft|feet)/i,
        /(\d+\.?\d*)\s*(?:lf|ft)\s*(?:ridge|hip)/i,
      ];

      for (const pattern of ridgeHipPatterns) {
        const match = text.match(pattern);
        if (match) {
          const ridgeHip = parseFloat(match[1]);
          if (!isNaN(ridgeHip) && ridgeHip > 0) {
            roofingData.ridgeHip = ridgeHip;
            break;
          }
        }
      }

      // Valley patterns
      const valleyPatterns = [
        /valley[s]?:\s*(\d+\.?\d*)\s*(?:lf|ft|feet)/i,
        /(\d+\.?\d*)\s*(?:lf|ft)\s*valley/i,
      ];

      for (const pattern of valleyPatterns) {
        const match = text.match(pattern);
        if (match) {
          const valley = parseFloat(match[1]);
          if (!isNaN(valley) && valley > 0) {
            roofingData.valley = valley;
            break;
          }
        }
      }

      // Slope patterns
      const slopePatterns = [
        /slope:\s*(\d+\/\d+)/i,
        /(\d+\/\d+)\s*slope/i,
        /pitch:\s*(\d+\/\d+)/i,
      ];

      for (const pattern of slopePatterns) {
        const match = text.match(pattern);
        if (match) {
          roofingData.slope = match[1];
          break;
        }
      }

      if (Object.keys(roofingData).length > 0) {
        structuredData.roofingData = roofingData;
      }

      // Count line items (rough estimate)
      const lineItemCount = (text.match(/\$\d+\.\d{2}/g) || []).length;
      if (lineItemCount > 0) {
        structuredData.lineItemCount = lineItemCount;
      }
    } catch (error) {
      console.error('Structured data extraction error:', error);
    }

    return structuredData;
  }

  /**
   * Update job with core info immediately
   */
  private async updateJobWithCoreInfo(
    jobId: string,
    coreInfo: CoreInfo
  ): Promise<void> {
    const updateData: any = {
      status: 'TEXT_EXTRACTED',
      updatedAt: new Date(),
    };

    if (coreInfo.customerName) updateData.customerName = coreInfo.customerName;
    if (coreInfo.propertyAddress)
      updateData.customerAddress = coreInfo.propertyAddress;
    if (coreInfo.insuranceCarrier)
      updateData.carrier = coreInfo.insuranceCarrier;
    if (coreInfo.claimNumber) updateData.claimNumber = coreInfo.claimNumber;
    if (coreInfo.policyNumber) updateData.policyNumber = coreInfo.policyNumber;
    if (coreInfo.dateOfLoss)
      updateData.dateOfLoss = new Date(coreInfo.dateOfLoss);
    if (coreInfo.claimRep || coreInfo.adjusterName)
      updateData.claimRep = coreInfo.claimRep || coreInfo.adjusterName;
    if (coreInfo.originalEstimate)
      updateData.originalEstimate = coreInfo.originalEstimate;

    await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });

    console.log(
      `📊 Updated job ${jobId} with core info:`,
      Object.keys(updateData)
    );
  }

  /**
   * Update job with detailed data from full extraction
   */
  private async updateJobWithDetailedData(
    jobId: string,
    detailedData: any
  ): Promise<void> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (detailedData.roofingData) {
      const rd = detailedData.roofingData;
      if (rd.squares) updateData.roofSquares = rd.squares;
      if (rd.stories) updateData.roofStories = rd.stories;
      if (rd.rake) updateData.rakeLength = rd.rake;
      if (rd.eave) updateData.eaveLength = rd.eave;
      if (rd.ridgeHip) updateData.ridgeHipLength = rd.ridgeHip;
      if (rd.valley) updateData.valleyLength = rd.valley;
      if (rd.slope) updateData.roofSlope = rd.slope;
      if (rd.material) updateData.roofMaterial = rd.material;
    }

    await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });

    console.log(
      `🏠 Updated job ${jobId} with detailed data:`,
      Object.keys(updateData)
    );
  }

  /**
   * Save page content to database
   */
  private async savePageContentToDatabase(
    jobId: string,
    filePath: string,
    ocrResult: any,
    pageImagePaths?: string[][]
  ): Promise<void> {
    // Important: ensure pages are saved to the correct document for this file
    // We uploaded with the absolute file path; documents store that path.
    // Match by both jobId and filePath so estimate and roof report don't collide.
    let document = await prisma.document.findFirst({
      where: {
        jobId,
        filePath,
      },
    });

    // Fallback to first document (legacy behavior) if exact match not found
    if (!document) {
      console.warn(
        `No document found for job ${jobId} with filePath ${filePath}. Falling back to first document.`
      );
      document = await prisma.document.findFirst({ where: { jobId } });
      if (!document) return;
    }

    for (const page of ocrResult.pages) {
      const extractedContent = {
        priority_fields: {},
        sections: {},
        business_rule_fields: {},
        processing_metadata: {
          extraction_method: 'smart-extraction-service',
          model_version: MISTRAL_OCR_MODEL,
          processing_time_ms: 0,
          total_pages: ocrResult.pages.length,
          document_type: 'unknown',
          source_file: filePath,
          page_images: undefined as any,
        },
        assets: {
          pageImages: undefined as any,
        },
      };

      // Attach per-page image paths if available
      const idx = (page.pageNumber || 1) - 1;
      const pathsForPage: string[] | undefined =
        pageImagePaths && pageImagePaths[idx];
      if (pathsForPage && pathsForPage.length > 0) {
        const normalizedArray = pathsForPage.map(pth =>
          pth.startsWith('/uploads/') ? pth : `/uploads/${pth.split('/').pop()}`
        );
        (extractedContent.processing_metadata as any).page_images =
          normalizedArray;
        (extractedContent.assets as any).pageImages = normalizedArray;

        // Replace any inline markdown image references like (img-0.jpeg) with our saved paths
        if (typeof page.content === 'string') {
          let replacementIndex = 0;
          const mappedContent = page.content.replace(
            /\((img-\d+\.(?:jpg|jpeg|png))\)/gi,
            () => {
              const pathToUse =
                normalizedArray[
                  Math.min(replacementIndex, normalizedArray.length - 1)
                ];
              replacementIndex++;
              return `(${pathToUse})`;
            }
          );
          page.content = mappedContent;
        }
      }

      await prisma.documentPage.upsert({
        where: {
          documentId_pageNumber: {
            documentId: document.id,
            pageNumber: page.pageNumber,
          },
        },
        update: {
          extractedContent: extractedContent as any,
          rawText: page.content,
          extractedAt: new Date(),
          confidence: page.confidence,
          imageCount: pathsForPage ? pathsForPage.length : 0,
        },
        create: {
          documentId: document.id,
          jobId,
          pageNumber: page.pageNumber,
          extractedContent: extractedContent as any,
          rawText: page.content,
          extractedAt: new Date(),
          confidence: page.confidence,
          imageCount: pathsForPage ? pathsForPage.length : 0,
        },
      });
    }
  }

  /**
   * Merge Claude extraction data from multiple documents
   */
  private mergeClaudeExtractionData(results: any[]): any {
    const allLineItems: any[] = [];
    let roofMeasurements: any = {};
    let roofType: any = {};
    let estimateDoc: any = null;
    let roofReportDoc: any = null;
    let validation: { summary?: any; notes?: string[] } | undefined = undefined;

    // Separate and merge data by document type
    for (const result of results) {
      const data = result.structuredData;

      if (data.documentType === 'estimate') {
        estimateDoc = result;
        allLineItems.push(...(data.lineItems || []));
        if (data.roofType) roofType = data.roofType;
        if (data.validation) validation = data.validation;
      }

      if (data.documentType === 'roof_report') {
        roofReportDoc = result;
        if (data.roofMeasurements) roofMeasurements = data.roofMeasurements;
      }
    }

    // Find ridge cap items specifically
    const ridgeCapItems = allLineItems.filter(item => item.isRidgeCapItem);

    console.log(
      `🔗 Merged: ${allLineItems.length} total items, ${ridgeCapItems.length} ridge cap items`
    );

    return {
      // Core extraction results
      lineItems: allLineItems,
      roofMeasurements,
      roofType,
      ridgeCapItems,
      validation,

      // Document metadata
      estimateDoc: estimateDoc?.docType,
      roofReportDoc: roofReportDoc?.docType,
      documentsProcessed: results.length,

      // Legacy compatibility
      roofingData: roofMeasurements,
      lineItemCount: allLineItems.length,

      // Merged customer/claim info from first estimate doc
      customerInfo: estimateDoc?.structuredData?.customerInfo,
      claimInfo: estimateDoc?.structuredData?.claimInfo,
    };
  }

  /**
   * Save extraction results to MistralExtraction table
   */
  private async saveMistralExtractionRecord(
    jobId: string,
    mergedData: any,
    results: any[]
  ): Promise<void> {
    try {
      // Create comprehensive extractedData JSON for database
      const extractedData = {
        // Main extraction results (format expected by UI)
        lineItems: mergedData.lineItems,
        roofMeasurements: mergedData.roofMeasurements,
        roofType: mergedData.roofType,
        ridgeCapItems: mergedData.ridgeCapItems,
        validation: mergedData.validation,

        // v2 wrapper for newer API consumers
        v2: {
          lineItems: mergedData.lineItems,
          measurements: mergedData.roofMeasurements,
          roofType: mergedData.roofType,
          ridgeCapItems: mergedData.ridgeCapItems,
          validation: mergedData.validation,
        },

        // Metadata
        extractionMetadata: {
          documentsProcessed: results.length,
          extractionMethod: 'claude-hybrid',
          timestamp: new Date().toISOString(),
          costs: {
            totalCost: results.reduce(
              (sum, r) => sum + (r.structuredData.cost || 0),
              0
            ),
            lineItemExtractionCost: 0, // Will be populated by individual extractors
            measurementExtractionCost: 0,
          },
        },

        // Document details
        documents: results.map(r => ({
          filePath: r.filePath,
          documentType: r.docType?.type,
          confidence: r.docType?.confidence,
          pageCount: r.fullText?.pages?.length || 0,
        })),
      };

      await prisma.mistralExtraction.create({
        data: {
          jobId,
          extractedData: extractedData as any,
          extractedAt: new Date(),
          confidence: this.calculateOverallConfidence(mergedData),
          documentType: this.getDominantDocumentType(results),
          pageCount: results.reduce(
            (sum, r) => sum + (r.fullText?.pages?.length || 0),
            0
          ),
          customerName: mergedData.customerInfo?.name,
          claimNumber: mergedData.claimInfo?.claimNumber,
          mistralModel: 'claude-3-5-haiku-hybrid',
          cost: extractedData.extractionMetadata.costs.totalCost,
          success: true,
        },
      });

      console.log(`💾 Saved MistralExtraction record for job ${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to save MistralExtraction record:`, error);
      throw error;
    }
  }

  /**
   * Calculate overall confidence from extraction results
   */
  private calculateOverallConfidence(mergedData: any): number {
    const confidences: number[] = [];

    if (mergedData.roofType?.confidence) {
      confidences.push(mergedData.roofType.confidence);
    }

    if (mergedData.roofMeasurements?.confidence) {
      confidences.push(mergedData.roofMeasurements.confidence);
    }

    if (mergedData.lineItems?.length > 0) {
      const lineItemConfidence =
        mergedData.lineItems.reduce(
          (sum: number, item: any) => sum + (item.confidence || 0.8),
          0
        ) / mergedData.lineItems.length;
      confidences.push(lineItemConfidence);
    }

    return confidences.length > 0
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0.8;
  }

  /**
   * Determine dominant document type
   */
  private getDominantDocumentType(results: any[]): string | null {
    const types = results.map(r => r.docType?.type).filter(Boolean);

    if (types.includes('estimate')) return 'estimate';
    if (types.includes('roof_report')) return 'roof_report';
    return types[0] || null;
  }

  /**
   * Merge structured data from multiple documents (LEGACY - for fallback)
   */
  private mergeStructuredData(dataArray: any[]): any {
    const merged: any = {};

    for (const data of dataArray) {
      if (data.roofingData) {
        if (!merged.roofingData) merged.roofingData = {};
        Object.assign(merged.roofingData, data.roofingData);
      }
      if (data.lineItemCount) {
        merged.totalLineItems =
          (merged.totalLineItems || 0) + data.lineItemCount;
      }
    }

    return merged;
  }
}

export const smartExtractionService = new SmartExtractionService();
