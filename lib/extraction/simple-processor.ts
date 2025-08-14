import { readFileSync } from 'fs';
import { prisma } from '@/lib/database/client';

/**
 * Simple Document Processor for testing
 * Uses pdf-parse instead of Mistral for basic functionality testing
 */
export class SimpleDocumentProcessor {
  
  /**
   * Process a document with simple PDF parsing
   */
  async processDocument(filePath: string, jobId: string): Promise<any> {
    try {
      console.log(`Starting simple processing for job ${jobId}: ${filePath}`);
      
      // Step 1: Extract text using pdf-parse
      const pdfData = await this.extractTextWithPdfParse(filePath);
      
      // Step 2: Simple classification based on keywords
      const classification = this.simpleClassifyDocument(pdfData.text);
      
      // Step 3: Simple data extraction based on patterns
      const extractedData = this.simpleExtractData(pdfData.text, classification.type);
      
      // Step 4: Save page content
      await this.savePageContent(jobId, pdfData);
      
      // Step 5: Save extracted data
      await this.saveExtractedData(jobId, {
        classification,
        ...extractedData,
        rawPageContent: [pdfData.text]
      });
      
      return {
        classification,
        ...extractedData,
        rawPageContent: [pdfData.text]
      };
      
    } catch (error) {
      console.error(`Simple processing failed for job ${jobId}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract text using pdf-parse
   */
  private async extractTextWithPdfParse(filePath: string): Promise<any> {
    try {
      // Dynamic import to avoid module loading issues
      const pdfParse = (await import('pdf-parse')).default;
      const pdfBuffer = readFileSync(filePath);
      const data = await pdfParse(pdfBuffer);
      
      console.log(`Extracted ${data.text.length} characters from PDF`);
      
      return {
        text: data.text,
        numpages: data.numpages,
        info: data.info,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('PDF parsing failed:', error);
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Simple document classification based on keywords
   */
  private simpleClassifyDocument(text: string): any {
    const lowerText = text.toLowerCase();
    
    // Check for estimate keywords
    const estimateKeywords = ['claim', 'policy', 'estimate', 'insurance', 'total', '$', 'labor', 'material'];
    const roofReportKeywords = ['square', 'slope', 'ridge', 'valley', 'rake', 'eave', 'measurement'];
    
    const estimateScore = estimateKeywords.reduce((score, keyword) => {
      return score + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);
    
    const roofReportScore = roofReportKeywords.reduce((score, keyword) => {
      return score + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);
    
    if (estimateScore > roofReportScore) {
      return {
        type: 'estimate',
        confidence: Math.min(estimateScore / estimateKeywords.length, 1.0),
        reasoning: `Found ${estimateScore} estimate-related keywords`
      };
    } else if (roofReportScore > 0) {
      return {
        type: 'roof_report',
        confidence: Math.min(roofReportScore / roofReportKeywords.length, 1.0),
        reasoning: `Found ${roofReportScore} roof report-related keywords`
      };
    } else {
      return {
        type: 'unknown',
        confidence: 0.1,
        reasoning: 'No clear document type indicators found'
      };
    }
  }
  
  /**
   * Simple data extraction using regex patterns
   */
  private simpleExtractData(text: string, docType: string): any {
    const result = {
      customerInfo: this.extractCustomerInfo(text),
      claimInfo: this.extractClaimInfo(text),
      roofingData: this.extractRoofingData(text),
      lineItems: this.extractLineItems(text)
    };
    
    console.log('Simple extraction results:', {
      hasCustomer: !!result.customerInfo?.name,
      hasClaim: !!result.claimInfo?.claimNumber,
      hasRoofing: !!result.roofingData?.squares,
      lineItemCount: result.lineItems.length
    });
    
    return result;
  }
  
  /**
   * Extract customer information using patterns
   */
  private extractCustomerInfo(text: string): any {
    // Look for name patterns
    const nameMatch = text.match(/(?:customer|insured|property owner|owner):\s*([A-Z][a-z]+ [A-Z][a-z]+)/i) ||
                     text.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s*(?:\d{1,5} [A-Za-z]+ (?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place))/);
    
    // Look for address patterns
    const addressMatch = text.match(/(\d{1,5} [A-Za-z]+ (?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place)[^,\n]*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})/);
    
    // Look for phone patterns
    const phoneMatch = text.match(/(?:phone|tel|telephone):\s*(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/i) ||
                      text.match(/(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
    
    if (nameMatch || addressMatch) {
      return {
        name: nameMatch ? nameMatch[1].trim() : null,
        address: addressMatch ? {
          street: addressMatch[1].trim(),
          city: 'Unknown',
          state: 'Unknown', 
          zipCode: 'Unknown'
        } : null,
        phone: phoneMatch ? phoneMatch[1].trim() : null,
        email: null
      };
    }
    
    return null;
  }
  
  /**
   * Extract claim information using patterns
   */
  private extractClaimInfo(text: string): any {
    const claimMatch = text.match(/(?:claim|claim #|claim number):\s*([A-Z0-9-]+)/i);
    const policyMatch = text.match(/(?:policy|policy #|policy number):\s*([A-Z0-9-]+)/i);
    const carrierMatch = text.match(/(?:carrier|insurance|insurer):\s*([A-Za-z\s]+)/i);
    const dateMatch = text.match(/(?:date of loss|loss date):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    
    if (claimMatch || policyMatch || carrierMatch) {
      return {
        claimNumber: claimMatch ? claimMatch[1].trim() : null,
        policyNumber: policyMatch ? policyMatch[1].trim() : null,
        carrier: carrierMatch ? carrierMatch[1].trim() : null,
        dateOfLoss: dateMatch ? dateMatch[1].trim() : null,
        claimRep: null,
        estimator: null,
        originalEstimate: null
      };
    }
    
    return null;
  }
  
  /**
   * Extract roofing data using patterns
   */
  private extractRoofingData(text: string): any {
    const squareMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:square|sq|squares)/i);
    const storyMatch = text.match(/(\d+)\s*(?:story|stories|level)/i);
    
    if (squareMatch || storyMatch) {
      return {
        squares: squareMatch ? parseFloat(squareMatch[1]) : null,
        stories: storyMatch ? parseInt(storyMatch[1]) : null,
        rake: null,
        eave: null,
        ridgeHip: null,
        valley: null,
        slope: null,
        material: null
      };
    }
    
    return null;
  }
  
  /**
   * Extract line items using patterns
   */
  private extractLineItems(text: string): any[] {
    // Simple line item extraction - look for lines with $ amounts
    const lines = text.split('\n');
    const lineItems: any[] = [];
    
    for (const line of lines) {
      const priceMatch = line.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (priceMatch && line.length > 20) {
        lineItems.push({
          description: line.trim(),
          quantity: 1,
          unit: 'each',
          unitPrice: parseFloat(priceMatch[1].replace(',', '')),
          totalPrice: parseFloat(priceMatch[1].replace(',', '')),
          category: 'unknown'
        });
      }
    }
    
    return lineItems.slice(0, 10); // Limit to first 10 items
  }
  
  /**
   * Save page content to database
   */
  private async savePageContent(jobId: string, pdfData: any) {
    const document = await prisma.document.findFirst({ where: { jobId } });
    if (!document) throw new Error('Document not found');
    
    // Save as single page for now
    await prisma.documentPage.create({
      data: {
        documentId: document.id,
        jobId,
        pageNumber: 1,
        markdownText: pdfData.text,
        extractedAt: new Date(),
        confidence: 0.8,
        extractionMethod: 'pdf-parse',
        wordCount: pdfData.text.split(' ').length
      }
    });
    
    console.log(`Saved page content for job ${jobId}`);
  }
  
  /**
   * Save extracted data to database
   */
  private async saveExtractedData(jobId: string, data: any) {
    // Save extraction record
    await prisma.mistralExtraction.create({
      data: {
        jobId,
        extractedData: data as any,
        extractedAt: new Date(),
        confidence: data.classification.confidence,
        documentType: data.classification.type,
        pageCount: 1,
        customerName: data.customerInfo?.name,
        claimNumber: data.claimInfo?.claimNumber,
        mistralModel: 'simple-processor'
      }
    });
    
    // Auto-populate job fields
    const updateData: any = { 
      status: 'TEXT_EXTRACTED',
      updatedAt: new Date()
    };
    
    if (data.customerInfo?.name) updateData.customerName = data.customerInfo.name;
    if (data.claimInfo?.claimNumber) updateData.claimNumber = data.claimInfo.claimNumber;
    
    await prisma.job.update({
      where: { id: jobId },
      data: updateData
    });
    
    console.log(`Saved simple extraction data for job ${jobId}`);
  }
}

export const simpleProcessor = new SimpleDocumentProcessor();