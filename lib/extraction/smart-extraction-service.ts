import { readFileSync } from 'fs';

import { prisma } from '../database/client';
import { wsManager } from '../websocket/socket-handler';

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

        // Extract all pages
        const fullText = await this.extractAllPagesOCR(filePath);

        // Save raw page content to database
        await this.savePageContentToDatabase(jobId, filePath, fullText);

        // Extract structured data using regex + simple parsing (no AI)
        const structuredData = this.extractStructuredDataFromText(
          fullText.fullText
        );

        return {
          filePath,
          fullText,
          structuredData,
        };
      });

      const results = await Promise.all(extractionPromises);

      // Merge all structured data
      const mergedData = this.mergeStructuredData(
        results.map(r => r.structuredData)
      );

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
      const ocrPages = result.pages || [];

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
    pages: Array<{ pageNumber: number; content: string; confidence: number }>;
  }> {
    try {
      const pdfBuffer = readFileSync(filePath);
      const base64Pdf = pdfBuffer.toString('base64');

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
          // No pages parameter = extract all pages
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Mistral OCR API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const ocrPages = result.pages || [];

      const extractedPages = ocrPages.map((page: any, index: number) => {
        const content = page.markdown || page.text || page.content || '';
        return {
          pageNumber: index + 1,
          content: String(content || '').trim(),
          confidence: page.confidence || 0.95,
        };
      });

      const fullText = extractedPages.map(p => p.content).join('\n\n');

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
        if (
          match && match[1]
            ? match[1].trim().length > 5
            : match[0].trim().length > 5
        ) {
          coreInfo.propertyAddress = (match[1] || match[0]).trim();
          break;
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

      // Adjuster name patterns
      const adjusterPatterns = [
        /(?:adjuster|claim rep|claim representative):\s*([A-Za-z\s]{2,40})/i,
        /adjuster:\s*([A-Za-z\s]{2,40})/i,
      ];

      for (const pattern of adjusterPatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 2) {
          coreInfo.adjusterName = match[1].trim();
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
   * Extract structured data from full text (roof measurements, etc.)
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
    if (coreInfo.adjusterName) updateData.claimRep = coreInfo.adjusterName;
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
    ocrResult: any
  ): Promise<void> {
    const document = await prisma.document.findFirst({ where: { jobId } });
    if (!document) return;

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
        },
      };

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
        },
        create: {
          documentId: document.id,
          jobId,
          pageNumber: page.pageNumber,
          extractedContent: extractedContent as any,
          rawText: page.content,
          extractedAt: new Date(),
          confidence: page.confidence,
        },
      });
    }
  }

  /**
   * Merge structured data from multiple documents
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
