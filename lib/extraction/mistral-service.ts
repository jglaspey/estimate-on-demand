import { readFileSync } from 'fs';

import { Mistral } from '@mistralai/mistralai';

import { prisma } from '@/lib/database/client';
import type {
  PriorityFields,
  QuickExtractionResponse,
} from '@/lib/types/document-extraction';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

// Centralized model identifiers for consistency and easy updates
const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';
const MISTRAL_TEXT_MODEL = 'mistral-large-latest';

export interface DocumentClassification {
  type: 'roof_report' | 'estimate' | 'unknown';
  confidence: number;
  reasoning: string;
}

export interface CustomerInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phone?: string;
  email?: string;
}

export interface ClaimInfo {
  claimNumber: string;
  policyNumber: string;
  dateOfLoss: string;
  carrier: string;
  claimRep: string;
  estimator: string;
  originalEstimate: number;
}

export interface RoofingData {
  squares: number;
  stories: number;
  rake: number;
  eave: number;
  ridgeHip: number;
  valley: number;
  slope: string;
  material: string;
}

export interface ExtractedData {
  classification: DocumentClassification;
  customerInfo: CustomerInfo | null;
  claimInfo: ClaimInfo | null;
  roofingData: RoofingData | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    category: string;
  }>;
  rawPageContent: string[];
}

/**
 * Mistral Document Processing Service
 * Core workhorse for document classification and data extraction
 */
export class MistralDocumentService {
  /**
   * NEW: Process multiple documents with two-phase extraction
   */
  async processDocuments(
    filePaths: string[],
    jobId: string
  ): Promise<ExtractedData> {
    try {
      // Starting multi-document processing for job ${jobId}: ${filePaths.length} files

      // Phase 1: Quick priority field extraction from all documents
      await this.extractPriorityFields(filePaths, jobId);

      // Phase 2: Full document processing
      const fullExtraction = await this.extractFullDocuments(filePaths, jobId);

      return fullExtraction;
    } catch (error) {
      console.error(
        `Multi-document processing failed for job ${jobId}:`,
        error
      );
      throw new Error(
        `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Phase 1: Quick extraction of priority fields for immediate UI update
   */
  async extractPriorityFields(
    filePaths: string[],
    jobId: string
  ): Promise<QuickExtractionResponse> {
    try {
      // Phase 1: Quick extraction for job ${jobId}
      const startTime = Date.now();

      let combinedPriorityFields: PriorityFields = {};

      for (const filePath of filePaths) {
        // Extract just the first page or two for quick scanning
        const quickOCR = await this.extractTextWithOCRQuick(filePath);
        const priorityFields = await this.extractPriorityFieldsFromText(
          quickOCR.fullText
        );

        // Merge priority fields, keeping highest confidence values
        combinedPriorityFields = this.mergePriorityFields(
          combinedPriorityFields,
          priorityFields
        );
      }

      // Update job record with priority fields immediately
      await this.updateJobWithPriorityFields(jobId, combinedPriorityFields);

      const processingTime = Date.now() - startTime;

      return {
        jobId,
        priority_fields: combinedPriorityFields,
        processing_time_ms: processingTime,
        pages_processed: filePaths.length,
        confidence: this.calculateAverageConfidence(combinedPriorityFields),
      };
    } catch (error) {
      console.error(`Quick extraction failed for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Phase 2: Full document extraction with complete JSON structure
   */
  async extractFullDocuments(
    filePaths: string[],
    jobId: string
  ): Promise<ExtractedData> {
    try {
      // Phase 2: Full extraction for job ${jobId}

      let combinedData: ExtractedData = {
        classification: { type: 'unknown', confidence: 0, reasoning: '' },
        customerInfo: null,
        claimInfo: null,
        roofingData: null,
        lineItems: [],
        rawPageContent: [],
      };

      for (const filePath of filePaths) {
        const documentData = await this.processDocument(filePath, jobId);
        combinedData = this.mergeExtractedData(combinedData, documentData);
      }

      return combinedData;
    } catch (error) {
      console.error(`Full extraction failed for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Process a PDF document through Mistral OCR and extract structured data
   */
  async processDocument(
    filePath: string,
    jobId: string
  ): Promise<ExtractedData> {
    try {
      console.log(`Starting Mistral processing for job ${jobId}: ${filePath}`);

      // Step 1: Extract text from PDF using Mistral OCR
      const ocrResult = await this.extractTextWithOCR(filePath);

      // Step 2: Classify document type
      const classification = await this.classifyDocument(ocrResult.fullText);

      // Step 3: Extract structured data based on document type
      const structuredData = await this.extractStructuredData(
        ocrResult.fullText,
        classification.type
      );

      // Step 4: Save page content to database
      await this.savePageContent(jobId, ocrResult.pages);

      // Step 5: Save extracted data to database
      await this.saveExtractedData(jobId, {
        classification,
        ...structuredData,
        rawPageContent: ocrResult.pages.map(p => p.content),
      });

      return {
        classification,
        ...structuredData,
        rawPageContent: ocrResult.pages.map(p => p.content),
      };
    } catch (error) {
      console.error(`Mistral processing failed for job ${jobId}:`, error);
      throw new Error(
        `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract text from PDF using Mistral OCR API
   */
  private async extractTextWithOCR(filePath: string): Promise<{
    fullText: string;
    pages: Array<{ pageNumber: number; content: string; confidence: number }>;
  }> {
    try {
      // Read PDF file as base64
      const pdfBuffer = readFileSync(filePath);
      const base64Pdf = pdfBuffer.toString('base64');

      // Call Mistral OCR API with correct format
      const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MISTRAL_OCR_MODEL,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64Pdf}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Mistral OCR API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      // Parse OCR response from dedicated OCR API
      const pages = result.pages || [];
      const extractedPages = pages.map((page: any, index: number) => {
        const content =
          page.markdown ||
          page.transcription ||
          page.text ||
          (page.content && (page.content.text || page.content)) ||
          page.ocr_text ||
          (Array.isArray(page.lines)
            ? page.lines.map((l: any) => l.text || l).join('\n')
            : '') ||
          '';
        return {
          pageNumber: index + 1,
          content: String(content || '').trim(),
          confidence: page.confidence || 0.95,
        };
      });
      const fullText = extractedPages
        .map(
          (p: { pageNumber: number; content: string; confidence: number }) =>
            p.content
        )
        .join('\n\n');

      return { fullText, pages: extractedPages };
    } catch (error) {
      console.error('Mistral OCR extraction failed:', error);
      throw new Error(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Classify document type using Mistral
   */
  private async classifyDocument(
    fullText: string
  ): Promise<DocumentClassification> {
    const prompt = `
Analyze this document and classify it as either a "roof_report" or "estimate" based on its content.

ROOF REPORT indicators:
- Contains measurements (squares, rake, eave, ridge, valley)
- Has roof dimensions and slope information
- Includes material specifications
- May have damage assessment
- Often has technical roof terminology

ESTIMATE indicators:
- Contains line items with prices
- Has labor and material costs
- Includes claim/policy numbers
- Has customer and insurance information
- Contains total costs and pricing

Document text:
${fullText.substring(0, 3000)}...

Respond with a JSON object:
{
  "type": "roof_report" | "estimate" | "unknown",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of classification"
}`;

    try {
      const response = await mistral.chat.complete({
        model: MISTRAL_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' },
      });

      const raw = response.choices?.[0]?.message?.content;
      const normalized = Array.isArray(raw)
        ? raw
            .map(chunk =>
              typeof chunk === 'string' ? chunk : (chunk as any).text || ''
            )
            .join('')
        : (raw ?? '');
      const s = String(normalized).trim();
      const fenced =
        s.match(/```json[\s\S]*?```/i) || s.match(/```[\s\S]*?```/);
      const jsonCandidate = fenced
        ? fenced[0].replace(/```json|```/gi, '').trim()
        : s;
      const safe = jsonCandidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(safe as string);
    } catch (error) {
      console.error('Document classification failed:', error);
      return {
        type: 'unknown',
        confidence: 0,
        reasoning: 'Classification failed due to API error',
      };
    }
  }

  /**
   * Extract structured data based on document type
   */
  private async extractStructuredData(
    fullText: string,
    docType: string
  ): Promise<{
    customerInfo: CustomerInfo | null;
    claimInfo: ClaimInfo | null;
    roofingData: RoofingData | null;
    lineItems: Array<any>;
  }> {
    const prompt = `
Extract structured data from this ${docType} document. Focus on accuracy and return null for any fields you cannot confidently identify.

Document text:
${fullText}

Return a JSON object with this exact structure:
{
  "customerInfo": {
    "name": "full customer name",
    "address": {
      "street": "street address",
      "city": "city",
      "state": "state",
      "zipCode": "zip code"
    },
    "phone": "phone number or null",
    "email": "email or null"
  },
  "claimInfo": {
    "claimNumber": "claim number",
    "policyNumber": "policy number", 
    "dateOfLoss": "YYYY-MM-DD or estimated date",
    "carrier": "insurance carrier name",
    "claimRep": "claim representative name",
    "estimator": "estimator name",
    "originalEstimate": "original estimate amount as number"
  },
  "roofingData": {
    "squares": "roof squares as number",
    "stories": "number of stories",
    "rake": "rake measurement in feet",
    "eave": "eave measurement in feet", 
    "ridgeHip": "ridge/hip measurement in feet",
    "valley": "valley measurement in feet",
    "slope": "roof slope description",
    "material": "roofing material type"
  },
  "lineItems": [
    {
      "description": "line item description",
      "quantity": "quantity as number",
      "unit": "unit of measurement",
      "unitPrice": "unit price as number",
      "totalPrice": "total price as number",
      "category": "item category (material/labor/etc)"
    }
  ]
}

Important: Return null for any section where you cannot find reliable data. Be conservative with extractions.`;

    try {
      const response = await mistral.chat.complete({
        model: MISTRAL_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' },
      });

      const raw = response.choices?.[0]?.message?.content;
      const normalized = Array.isArray(raw)
        ? raw
            .map(chunk =>
              typeof chunk === 'string' ? chunk : (chunk as any).text || ''
            )
            .join('')
        : (raw ?? '');
      const s = String(normalized).trim();
      const fenced =
        s.match(/```json[\s\S]*?```/i) || s.match(/```[\s\S]*?```/);
      const jsonCandidate = fenced
        ? fenced[0].replace(/```json|```/gi, '').trim()
        : s;
      const safe = jsonCandidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(safe as string);
    } catch (error) {
      console.error('Structured data extraction failed:', error);
      return {
        customerInfo: null,
        claimInfo: null,
        roofingData: null,
        lineItems: [],
      };
    }
  }

  /**
   * Parse OCR response into structured page format
   */
  private parseOCRResponse(
    content: string
  ): Array<{ pageNumber: number; content: string; confidence: number }> {
    // Simple parser - in production would be more sophisticated
    const pages = content.split('--- PAGE').slice(1);

    return pages.map((page, index) => ({
      pageNumber: index + 1,
      content: page.trim(),
      confidence: 0.95, // Mistral typically has high confidence
    }));
  }

  /**
   * Save page content to database for full-text search
   */
  private async savePageContent(
    jobId: string,
    pages: Array<{ pageNumber: number; content: string; confidence: number }>
  ) {
    const document = await prisma.document.findFirst({ where: { jobId } });
    if (!document) throw new Error('Document not found');

    // Save each page in a schema-compliant structure
    for (const page of pages) {
      // Minimal extractedContent payload to satisfy schema and enable future enrichment
      const extractedContent = {
        priority_fields: {},
        sections: {},
        business_rule_fields: {},
        processing_metadata: {
          extraction_method: 'mistral-ocr',
          model_version: MISTRAL_OCR_MODEL,
          processing_time_ms: 0,
          total_pages: pages.length,
          document_type: 'unknown',
          legacy_content: page.content,
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

    console.log(`Saved ${pages.length} pages for job ${jobId}`);
  }

  /**
   * Save extracted structured data to database
   */
  private async saveExtractedData(jobId: string, data: ExtractedData) {
    // Save Mistral extraction record
    await prisma.mistralExtraction.create({
      data: {
        jobId,
        extractedData: data as any,
        extractedAt: new Date(),
        confidence: data.classification.confidence,
        documentType: data.classification.type,
        pageCount: data.rawPageContent.length,
        customerName: data.customerInfo?.name,
        claimNumber: data.claimInfo?.claimNumber,
      },
    });

    // Auto-populate job fields with extracted data
    const updateData: any = {
      status: 'TEXT_EXTRACTED',
      updatedAt: new Date(),
    };

    // Customer information
    if (data.customerInfo) {
      if (data.customerInfo.name)
        updateData.customerName = data.customerInfo.name;
      if (data.customerInfo.phone)
        updateData.customerPhone = data.customerInfo.phone;
      if (data.customerInfo.email)
        updateData.customerEmail = data.customerInfo.email;
      if (data.customerInfo.address) {
        const addr = data.customerInfo.address;
        updateData.customerAddress =
          `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`.trim();
      }
    }

    // Claim information
    if (data.claimInfo) {
      if (data.claimInfo.claimNumber)
        updateData.claimNumber = data.claimInfo.claimNumber;
      if (data.claimInfo.policyNumber)
        updateData.policyNumber = data.claimInfo.policyNumber;
      if (data.claimInfo.dateOfLoss)
        updateData.dateOfLoss = new Date(data.claimInfo.dateOfLoss);
      if (data.claimInfo.carrier) updateData.carrier = data.claimInfo.carrier;
      if (data.claimInfo.claimRep)
        updateData.claimRep = data.claimInfo.claimRep;
      if (data.claimInfo.estimator)
        updateData.estimator = data.claimInfo.estimator;
      if (data.claimInfo.originalEstimate)
        updateData.originalEstimate = data.claimInfo.originalEstimate;
    }

    // Roofing data
    if (data.roofingData) {
      if (data.roofingData.squares)
        updateData.roofSquares = data.roofingData.squares;
      if (data.roofingData.stories)
        updateData.roofStories = data.roofingData.stories;
      if (data.roofingData.rake) updateData.rakeLength = data.roofingData.rake;
      if (data.roofingData.eave) updateData.eaveLength = data.roofingData.eave;
      if (data.roofingData.ridgeHip)
        updateData.ridgeHipLength = data.roofingData.ridgeHip;
      if (data.roofingData.valley)
        updateData.valleyLength = data.roofingData.valley;
      if (data.roofingData.slope) updateData.roofSlope = data.roofingData.slope;
      if (data.roofingData.material)
        updateData.roofMaterial = data.roofingData.material;
    }

    await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });

    console.log(
      `Saved extraction data and auto-populated ${Object.keys(updateData).length} job fields for ${jobId}`
    );
  }

  /**
   * Quick OCR extraction for priority fields (first 1-2 pages only)
   */
  private async extractTextWithOCRQuick(filePath: string): Promise<{
    fullText: string;
    pages: Array<{ pageNumber: number; content: string; confidence: number }>;
  }> {
    try {
      const pdfBuffer = readFileSync(filePath);
      const base64Pdf = pdfBuffer.toString('base64');

      const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MISTRAL_OCR_MODEL,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64Pdf}`,
          },
          pages: [1, 2],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Mistral Quick OCR API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      // Parse OCR response from dedicated OCR API
      const pages = result.pages || [];
      const extractedPages = pages.map((page: any, index: number) => {
        const content =
          page.markdown ||
          page.transcription ||
          page.text ||
          (page.content && (page.content.text || page.content)) ||
          page.ocr_text ||
          (Array.isArray(page.lines)
            ? page.lines.map((l: any) => l.text || l).join('\n')
            : '') ||
          '';
        return {
          pageNumber: index + 1,
          content: String(content || '').trim(),
          confidence: page.confidence || 0.95,
        };
      });
      const fullText = extractedPages
        .map(
          (p: { pageNumber: number; content: string; confidence: number }) =>
            p.content
        )
        .join('\n\n');

      return { fullText, pages: extractedPages };
    } catch (error) {
      console.error('Mistral Quick OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract priority fields from text using focused prompt
   */
  private async extractPriorityFieldsFromText(
    text: string
  ): Promise<PriorityFields> {
    try {
      const prompt = `
Extract ONLY the following priority fields from this document text. Return as JSON with confidence scores and coordinates if possible.

Required fields:
- customer_name: Full customer name
- property_address: Complete property address
- claim_number: Insurance claim number
- policy_number: Insurance policy number  
- date_of_loss: Date when damage occurred
- carrier: Insurance company name
- claim_rep: Claim representative name
- estimator: Estimator name
- original_estimate: Total estimate amount (number only)

Format your response as JSON:
{
  "customer_name": {"value": "string", "confidence": 0.0-1.0},
  "property_address": {"value": "string", "confidence": 0.0-1.0},
  // ... other fields
}

Only include fields you find with reasonable confidence. Leave out fields that are not present.

Document text:
${text.substring(0, 2000)}
`;

      const response = await mistral.chat.complete({
        model: MISTRAL_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        responseFormat: { type: 'json_object' },
      });

      const raw = response.choices?.[0]?.message?.content;
      const normalized = Array.isArray(raw)
        ? raw
            .map(chunk =>
              typeof chunk === 'string' ? chunk : (chunk as any).text || ''
            )
            .join('')
        : (raw ?? '');
      if (!normalized)
        throw new Error('No response from Mistral priority field extraction');
      const s = String(normalized).trim();
      const fenced =
        s.match(/```json[\s\S]*?```/i) || s.match(/```[\s\S]*?```/);
      const jsonCandidate = fenced
        ? fenced[0].replace(/```json|```/gi, '').trim()
        : s;
      const safe = jsonCandidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(safe as string) as PriorityFields;
    } catch (error) {
      console.error('Priority field extraction failed:', error);
      return {}; // Return empty object if extraction fails
    }
  }

  /**
   * Merge priority fields, keeping highest confidence values
   */
  private mergePriorityFields(
    existing: PriorityFields,
    newFields: PriorityFields
  ): PriorityFields {
    const merged = { ...existing };

    for (const [key, newField] of Object.entries(newFields)) {
      if (
        newField &&
        typeof newField === 'object' &&
        'value' in newField &&
        'confidence' in newField
      ) {
        const existingField = merged[key as keyof PriorityFields];
        if (!existingField || newField.confidence > existingField.confidence) {
          merged[key as keyof PriorityFields] = newField;
        }
      }
    }

    return merged;
  }

  /**
   * Update job record with priority fields immediately
   */
  private async updateJobWithPriorityFields(
    jobId: string,
    priorityFields: PriorityFields
  ): Promise<void> {
    try {
      const updateData: any = { updatedAt: new Date() };

      if (priorityFields.customer_name?.value)
        updateData.customerName = priorityFields.customer_name.value;
      if (priorityFields.property_address?.value)
        updateData.customerAddress = priorityFields.property_address.value;
      if (priorityFields.claim_number?.value)
        updateData.claimNumber = priorityFields.claim_number.value;
      if (priorityFields.policy_number?.value)
        updateData.policyNumber = priorityFields.policy_number.value;
      if (priorityFields.date_of_loss?.value)
        updateData.dateOfLoss = new Date(priorityFields.date_of_loss.value);
      if (priorityFields.carrier?.value)
        updateData.carrier = priorityFields.carrier.value;
      if (priorityFields.claim_rep?.value)
        updateData.claimRep = priorityFields.claim_rep.value;
      if (priorityFields.estimator?.value)
        updateData.estimator = priorityFields.estimator.value;
      if (priorityFields.original_estimate?.value) {
        // Parse originalEstimate as a float, handling various formats
        const estimateStr = String(priorityFields.original_estimate.value);
        const parsed = parseFloat(estimateStr.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          updateData.originalEstimate = parsed;
        }
      }

      // If we captured anything meaningful, reflect that in job status so the UI can surface fields immediately
      const capturedAny = Object.keys(updateData).length > 1; // beyond updatedAt

      await prisma.job.update({
        where: { id: jobId },
        data: {
          ...updateData,
          ...(capturedAny ? { status: 'TEXT_EXTRACTED' } : {}),
        },
      });

      console.log(
        `Updated job ${jobId} with ${Object.keys(updateData).length} priority fields`
      );
    } catch (error) {
      console.error(
        `Failed to update job ${jobId} with priority fields:`,
        error
      );
    }
  }

  /**
   * Calculate average confidence across all priority fields
   */
  private calculateAverageConfidence(priorityFields: PriorityFields): number {
    const fields = Object.values(priorityFields).filter(
      field => field && typeof field === 'object' && 'confidence' in field
    );

    if (fields.length === 0) return 0;

    const total = fields.reduce((sum, field) => sum + field.confidence, 0);
    return total / fields.length;
  }

  /**
   * Merge extracted data from multiple documents
   */
  private mergeExtractedData(
    existing: ExtractedData,
    newData: ExtractedData
  ): ExtractedData {
    return {
      classification:
        newData.classification.confidence > existing.classification.confidence
          ? newData.classification
          : existing.classification,
      customerInfo: newData.customerInfo || existing.customerInfo,
      claimInfo: newData.claimInfo || existing.claimInfo,
      roofingData: newData.roofingData || existing.roofingData,
      lineItems: [...(existing.lineItems || []), ...(newData.lineItems || [])],
      rawPageContent: [
        ...(existing.rawPageContent || []),
        ...(newData.rawPageContent || []),
      ],
    };
  }
}

export const mistralService = new MistralDocumentService();
