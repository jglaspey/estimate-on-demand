/**
 * Mistral Priority Field Extraction Test Suite
 * 
 * Tests extraction of 9 priority fields from first 3 pages of documents:
 * 1. Customer Name
 * 2. Property Address  
 * 3. Claim Number
 * 4. Policy Number
 * 5. Date of Loss
 * 6. Carrier (Insurance Company)
 * 7. Claim Rep
 * 8. Estimator
 * 9. Original Estimate (dollar amount)
 */

import { readFileSync } from 'fs';

import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

const MISTRAL_OCR_MODEL = 'mistral-ocr-2505';
const MISTRAL_TEXT_MODEL = 'mistral-large-latest';

interface PriorityFieldResult {
  value: string;
  confidence: number;
  sourceLocation?: string;
}

interface PriorityFields {
  customerName?: PriorityFieldResult;
  propertyAddress?: PriorityFieldResult;
  claimNumber?: PriorityFieldResult;
  policyNumber?: PriorityFieldResult;
  dateOfLoss?: PriorityFieldResult;
  carrier?: PriorityFieldResult;
  claimRep?: PriorityFieldResult;
  estimator?: PriorityFieldResult;
  originalEstimate?: PriorityFieldResult;
}

interface TestResult {
  fileName: string;
  documentType: 'estimate' | 'roof_report' | 'unknown';
  processingTimeMs: number;
  pagesProcessed: number;
  priorityFields: PriorityFields;
  rawText: string;
  errors?: string[];
}

export class MistralPriorityExtractionTester {
  
  /**
   * Test priority field extraction from a single document
   */
  async testDocument(filePath: string): Promise<TestResult> {
    const startTime = Date.now();
    const fileName = filePath.split('/').pop() || 'unknown';
    
    console.log(`🧪 Testing priority extraction: ${fileName}`);
    
    try {
      // Step 1: Extract text from first 3 pages using Mistral OCR
      const ocrResult = await this.extractTextWithOCR(filePath, 3);
      
      // Step 2: Classify document type
      const documentType = this.classifyDocumentFromName(fileName);
      
      // Step 3: Extract priority fields using focused prompt
      // TEMPORARILY SKIP: Mistral chat completions are hitting 401 errors
      // const priorityFields = await this.extractPriorityFields(ocrResult.fullText);
      const priorityFields = this.extractPriorityFieldsWithRegex(ocrResult.fullText);
      
      const processingTime = Date.now() - startTime;
      
      return {
        fileName,
        documentType,
        processingTimeMs: processingTime,
        pagesProcessed: ocrResult.pages.length,
        priorityFields,
        rawText: ocrResult.fullText.substring(0, 2000), // First 2000 chars for review
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        fileName,
        documentType: 'unknown',
        processingTimeMs: processingTime,
        pagesProcessed: 0,
        priorityFields: {},
        rawText: '',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Test priority field extraction from a document pair (estimate + roof report)
   */
  async testDocumentPair(estimatePath: string, roofReportPath: string): Promise<{
    estimate: TestResult;
    roofReport: TestResult;
    combinedFields: PriorityFields;
  }> {
    console.log(`🔄 Testing document pair extraction...`);
    
    // Process both documents in parallel
    const [estimateResult, roofReportResult] = await Promise.all([
      this.testDocument(estimatePath),
      this.testDocument(roofReportPath)
    ]);
    
    // Combine priority fields, preferring estimate data for most fields
    const combinedFields = this.combinePriorityFields(
      estimateResult.priorityFields,
      roofReportResult.priorityFields
    );
    
    return {
      estimate: estimateResult,
      roofReport: roofReportResult,
      combinedFields
    };
  }
  
  /**
   * Extract text from PDF using Mistral OCR (first N pages only)
   */
  private async extractTextWithOCR(filePath: string, maxPages: number = 3): Promise<{
    fullText: string;
    pages: Array<{ pageNumber: number; content: string; confidence: number }>;
  }> {
    const pdfBuffer = readFileSync(filePath);
    const base64Pdf = pdfBuffer.toString('base64');
    
    // Specify which pages to process (1, 2, 3)
    const pagesToProcess = Array.from({ length: maxPages }, (_, i) => i + 1);
    
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
        pages: pagesToProcess,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Mistral OCR API failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Parse OCR response
    const pages = result.pages || [];
    const extractedPages = pages.map((page: any, index: number) => {
      const content = page.markdown || page.transcription || page.text || 
                     (page.content && (page.content.text || page.content)) || 
                     page.ocr_text || '';
      return {
        pageNumber: index + 1,
        content: String(content || '').trim(),
        confidence: page.confidence || 0.95,
      };
    });
    
    const fullText = extractedPages
      .map(p => p.content)
      .join('\n\n--- PAGE BREAK ---\n\n');
    
    return { fullText, pages: extractedPages };
  }
  
  /**
   * Extract priority fields using focused Mistral prompt
   */
  private async extractPriorityFields(text: string): Promise<PriorityFields> {
    const prompt = `Extract the following 9 priority fields from this insurance document text. Focus on accuracy and return structured data with confidence scores.

PRIORITY FIELDS TO EXTRACT:
1. Customer Name - Full name of the property owner/policyholder
2. Property Address - Complete property address (street, city, state, zip)
3. Claim Number - Insurance claim number/ID
4. Policy Number - Insurance policy number
5. Date of Loss - Date when the damage occurred
6. Carrier - Insurance company name
7. Claim Rep - Claim representative/adjuster name
8. Estimator - Estimator name (person who created the estimate)
9. Original Estimate - Total dollar amount of the estimate/claim

INSTRUCTIONS:
- Look for these fields in headers, customer info sections, claim details, and totals
- For addresses, combine street, city, state, zip into one complete address
- For dollar amounts, extract the numeric value only (no $ symbols)
- For dates, use YYYY-MM-DD format when possible
- Rate confidence 0.0-1.0 based on how certain you are about the extraction

Return ONLY a JSON object with this exact structure:
{
  "customerName": {"value": "string", "confidence": 0.0-1.0},
  "propertyAddress": {"value": "complete address", "confidence": 0.0-1.0},
  "claimNumber": {"value": "string", "confidence": 0.0-1.0},
  "policyNumber": {"value": "string", "confidence": 0.0-1.0},
  "dateOfLoss": {"value": "YYYY-MM-DD", "confidence": 0.0-1.0},
  "carrier": {"value": "insurance company name", "confidence": 0.0-1.0},
  "claimRep": {"value": "rep name", "confidence": 0.0-1.0},
  "estimator": {"value": "estimator name", "confidence": 0.0-1.0},
  "originalEstimate": {"value": "numeric amount", "confidence": 0.0-1.0}
}

Only include fields you find with reasonable confidence. Omit fields that are not present.

Document text:
${text}`;

    try {
      const response = await mistral.chat.complete({
        model: MISTRAL_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        responseFormat: { type: 'json_object' },
      });
      
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Mistral text model');
      }
      
      // Parse JSON response
      const rawData = this.parseJSONResponse(content);
      return rawData as PriorityFields;
      
    } catch (error) {
      console.error('Priority field extraction failed:', error);
      return {}; // Return empty object if extraction fails
    }
  }
  
  /**
   * Parse JSON response handling various formats
   */
  private parseJSONResponse(content: string): any {
    let jsonText = content.trim();
    
    // Handle markdown code blocks
    if (jsonText.includes('```')) {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }
    
    // Clean up trailing commas
    jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
    
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse JSON response:', jsonText);
      throw new Error('Invalid JSON response from Mistral');
    }
  }
  
  /**
   * Classify document type from filename
   */
  private classifyDocumentFromName(fileName: string): 'estimate' | 'roof_report' | 'unknown' {
    if (fileName.includes('-est.pdf') || fileName.includes('estimate') || fileName.includes('Estimate')) {
      return 'estimate';
    }
    if (fileName.includes('-roof.pdf') || fileName.includes('roof') || fileName.includes('Roof')) {
      return 'roof_report';
    }
    return 'unknown';
  }
  
  /**
   * Extract priority fields using regex patterns (since chat completions are disabled)
   */
  private extractPriorityFieldsWithRegex(text: string): PriorityFields {
    const fields: PriorityFields = {};
    
    // Customer Name patterns
    const namePatterns = [
      /(?:Insured|Customer|Property Owner|Name):\s*([A-Za-z\s]+)/i,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, // First line with Name format
    ];
    
    // Property Address patterns  
    const addressPatterns = [
      /(\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?)/,
      /(?:Property Address|Address|Location):\s*([^\n]+)/i,
    ];
    
    // Claim Number patterns
    const claimPatterns = [
      /(?:Claim|Claim #|Claim Number):\s*([A-Z0-9\-]+)/i,
      /Claim\s*#?\s*:?\s*([0-9]{8,12})/i,
    ];
    
    // Policy Number patterns
    const policyPatterns = [
      /(?:Policy|Policy #|Policy Number):\s*([A-Z0-9\-]+)/i,
      /POL-([0-9]+)/i,
    ];
    
    // Date of Loss patterns
    const datePatterns = [
      /(?:Date of Loss|Loss Date):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{4}-\d{2}-\d{2})/,
    ];
    
    // Carrier patterns
    const carrierPatterns = [
      /(?:Carrier|Insurance|Company):\s*([A-Za-z\s]+Insurance)/i,
      /(Allstate|State Farm|Farmers|USAA|Progressive|Geico|Liberty Mutual|Travelers|Nationwide|American Family)[\s\w]*/i,
    ];
    
    // Claim Rep patterns
    const repPatterns = [
      /(?:Claim Rep|Adjuster|Representative):\s*([A-Za-z\s]+)/i,
      /(?:Adjuster|Rep):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    ];
    
    // Estimator patterns
    const estimatorPatterns = [
      /(?:Estimator|Prepared by|Created by):\s*([A-Za-z\s]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+-[A-Z][a-z]+)/, // Name with hyphen format
    ];
    
    // Original Estimate patterns
    const estimatePatterns = [
      /(?:Total|Grand Total|Estimate Total):\s*\$?([\d,]+\.?\d*)/i,
      /\$([0-9,]+\.?\d*)/g, // Find all dollar amounts, take the largest
    ];
    
    // Extract fields with confidence scoring
    const extractField = (patterns: RegExp[], text: string, fieldName: string): PriorityFieldResult | undefined => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const value = match[1]?.trim();
          if (value && value.length > 0) {
            return {
              value,
              confidence: 0.8, // Medium confidence for regex extraction
              sourceLocation: `Regex pattern match`
            };
          }
        }
      }
      return undefined;
    };
    
    // Extract all fields
    fields.customerName = extractField(namePatterns, text, 'customerName');
    fields.propertyAddress = extractField(addressPatterns, text, 'propertyAddress');
    fields.claimNumber = extractField(claimPatterns, text, 'claimNumber');
    fields.policyNumber = extractField(policyPatterns, text, 'policyNumber');
    fields.dateOfLoss = extractField(datePatterns, text, 'dateOfLoss');
    fields.carrier = extractField(carrierPatterns, text, 'carrier');
    fields.claimRep = extractField(repPatterns, text, 'claimRep');
    fields.estimator = extractField(estimatorPatterns, text, 'estimator');
    
    // Special handling for estimate amounts - find the largest dollar amount
    const dollarMatches = [...text.matchAll(/\$([0-9,]+\.?\d*)/g)];
    if (dollarMatches.length > 0) {
      const amounts = dollarMatches.map(match => parseFloat(match[1].replace(/,/g, '')));
      const maxAmount = Math.max(...amounts);
      if (maxAmount > 1000) { // Only consider substantial amounts
        fields.originalEstimate = {
          value: maxAmount.toString(),
          confidence: 0.7,
          sourceLocation: 'Largest dollar amount found'
        };
      }
    }
    
    return fields;
  }

  /**
   * Combine priority fields from multiple documents, preferring estimate data
   */
  private combinePriorityFields(estimateFields: PriorityFields, roofFields: PriorityFields): PriorityFields {
    const combined: PriorityFields = {};
    
    // List of all possible fields
    const fieldNames: (keyof PriorityFields)[] = [
      'customerName', 'propertyAddress', 'claimNumber', 'policyNumber',
      'dateOfLoss', 'carrier', 'claimRep', 'estimator', 'originalEstimate'
    ];
    
    for (const fieldName of fieldNames) {
      const estimateField = estimateFields[fieldName];
      const roofField = roofFields[fieldName];
      
      // Prefer estimate data, but use roof data if estimate is missing or has low confidence
      if (estimateField && estimateField.confidence > 0.7) {
        combined[fieldName] = estimateField;
      } else if (roofField && roofField.confidence > 0.7) {
        combined[fieldName] = roofField;
      } else if (estimateField) {
        combined[fieldName] = estimateField;
      } else if (roofField) {
        combined[fieldName] = roofField;
      }
    }
    
    return combined;
  }
  
  /**
   * Pretty print test results
   */
  printResults(results: TestResult | { estimate: TestResult; roofReport: TestResult; combinedFields: PriorityFields }) {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 MISTRAL PRIORITY EXTRACTION TEST RESULTS');
    console.log('='.repeat(80));
    
    if ('estimate' in results) {
      // Document pair results
      console.log('\n📊 DOCUMENT PAIR RESULTS:');
      console.log(`Estimate: ${results.estimate.fileName}`);
      console.log(`Roof Report: ${results.roofReport.fileName}`);
      console.log(`Total Processing Time: ${results.estimate.processingTimeMs + results.roofReport.processingTimeMs}ms`);
      
      console.log('\n🔍 COMBINED PRIORITY FIELDS:');
      this.printPriorityFields(results.combinedFields);
      
      console.log('\n📄 ESTIMATE EXTRACTION:');
      this.printDocumentResult(results.estimate);
      
      console.log('\n🏠 ROOF REPORT EXTRACTION:');
      this.printDocumentResult(results.roofReport);
      
    } else {
      // Single document results
      this.printDocumentResult(results);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  private printDocumentResult(result: TestResult) {
    console.log(`File: ${result.fileName}`);
    console.log(`Type: ${result.documentType}`);
    console.log(`Processing Time: ${result.processingTimeMs}ms`);
    console.log(`Pages Processed: ${result.pagesProcessed}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`❌ Errors: ${result.errors.join(', ')}`);
    }
    
    this.printPriorityFields(result.priorityFields);
    
    console.log('\n📝 Raw Text Sample:');
    console.log(result.rawText.substring(0, 1000) + '...');
    
    // Show full text if we have OCR success but field extraction failed
    if (result.pagesProcessed > 0 && Object.keys(result.priorityFields).length === 0) {
      console.log('\n📄 FULL OCR TEXT FOR ANALYSIS:');
      console.log('='.repeat(50));
      console.log(result.rawText);
      console.log('='.repeat(50));
    }
  }
  
  private printPriorityFields(fields: PriorityFields) {
    const fieldLabels = {
      customerName: 'Customer Name',
      propertyAddress: 'Property Address',
      claimNumber: 'Claim Number',
      policyNumber: 'Policy Number',
      dateOfLoss: 'Date of Loss',
      carrier: 'Carrier',
      claimRep: 'Claim Rep',
      estimator: 'Estimator',
      originalEstimate: 'Original Estimate'
    };
    
    console.log('\n🎯 Priority Fields:');
    for (const [key, label] of Object.entries(fieldLabels)) {
      const field = fields[key as keyof PriorityFields];
      if (field) {
        console.log(`  ✅ ${label}: "${field.value}" (confidence: ${(field.confidence * 100).toFixed(1)}%)`);
      } else {
        console.log(`  ❌ ${label}: Not found`);
      }
    }
  }
}

// Test runner function
export async function runPriorityExtractionTest() {
  const tester = new MistralPriorityExtractionTester();
  
  try {
    // Test with a recent document pair
    const basePath = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/uploads';
    const estimatePath = `${basePath}/1755160654183_0_boryca-est.pdf`;
    const roofReportPath = `${basePath}/1755160654206_1_boryca-roof.pdf`;
    
    console.log('🚀 Starting Mistral Priority Field Extraction Test...');
    
    const results = await tester.testDocumentPair(estimatePath, roofReportPath);
    
    tester.printResults(results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Export the tester class for use in other modules
export default MistralPriorityExtractionTester;