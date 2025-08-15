/**
 * Phase 1 Claude Extraction Service
 * 
 * Fast extraction of 8 priority fields using Claude's direct PDF processing.
 * Designed for production use with graceful degradation and error handling.
 */

import { readFileSync } from 'fs';

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export interface Phase1Fields {
  customerName: string | null;
  dateOfLoss: string | null;
  carrier: string | null;
  claimRep: string | null;
  estimator: string | null;
  propertyAddress: string | null;
  claimNumber: string | null;
  policyNumber: string | null;
}

export interface Phase1ExtractionResult {
  success: boolean;
  fields: Phase1Fields;
  fieldsFound: number;
  totalFields: number;
  extractionRate: number; // Percentage (0-100)
  processingTimeMs: number;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
  warnings: string[];
}

/**
 * Extract 8 priority fields from PDF using Claude Haiku direct processing
 */
export async function extractPhase1Fields(
  filePath: string, 
  options: { 
    maxTokens?: number;
    timeoutMs?: number;
  } = {}
): Promise<Phase1ExtractionResult> {
  const startTime = Date.now();
  const { maxTokens = 800, timeoutMs = 30000 } = options;
  
  const warnings: string[] = [];
  
  try {
    // Read and encode PDF
    const pdfBuffer = readFileSync(filePath);
    const base64Pdf = pdfBuffer.toString('base64');
    
    // Add timeout warning for large files
    if (pdfBuffer.length > 5 * 1024 * 1024) { // > 5MB
      warnings.push('Large file detected - processing may take longer');
    }

    const prompt = `Extract these 8 priority fields from this insurance estimate document. Return ONLY a JSON object:

{
  "customerName": "full customer name or null",
  "dateOfLoss": "date of loss (MM/DD/YYYY format preferred) or null",
  "carrier": "insurance company name or null",
  "claimRep": "claim representative/adjuster name or null",
  "estimator": "estimator name or null",
  "propertyAddress": "complete street address with city, state, zip or null",
  "claimNumber": "claim number or null",
  "policyNumber": "policy number or null"
}

EXTRACTION GUIDELINES:
- Look carefully at headers, letterheads, customer info sections, and document details
- Customer names may be formatted as "BRIAN_GERLOFF_&_CHR2" or "John Smith"
- Date of Loss might appear as "DOS", "Date of Loss", or "Loss Date"
- Claim Rep might be the person signing the letter or listed as adjuster/representative
- Estimator might be the same as Claim Rep or listed separately (if same person, use same name)
- Property address should be complete (street, city, state, zip)
- Claim numbers are often alphanumeric codes
- Policy numbers are often alphanumeric codes, may start with letters
- Look in multiple places: headers, customer info sections, signatures, contact info
- Return null for any field you cannot find confidently
- CRITICAL: Return ONLY the JSON object, no explanations or additional text`;

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Extraction timeout')), timeoutMs)
    );

    // Make Claude API call with timeout
    const extractionPromise = anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf
            }
          }
        ]
      }]
    });

    const response = await Promise.race([extractionPromise, timeoutPromise]) as Anthropic.Messages.Message;

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response with error handling
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    let fields: Phase1Fields;
    try {
      fields = JSON.parse(jsonMatch[0]) as Phase1Fields;
    } catch (parseError) {
      throw new Error(`Invalid JSON in Claude response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
    }

    // Validate and clean fields
    fields = validateAndCleanFields(fields, warnings);

    // Calculate metrics
    const fieldsFound = Object.values(fields).filter(v => v !== null && v !== '').length;
    const totalFields = Object.keys(fields).length;
    const extractionRate = Math.round((fieldsFound / totalFields) * 100);
    const processingTimeMs = Date.now() - startTime;

    // Determine confidence level
    const confidence = determineConfidence(extractionRate, fieldsFound, processingTimeMs);

    return {
      success: true,
      fields,
      fieldsFound,
      totalFields,
      extractionRate,
      processingTimeMs,
      confidence,
      warnings
    };

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    
    // Return graceful degradation result
    return {
      success: false,
      fields: createEmptyFields(),
      fieldsFound: 0,
      totalFields: 8,
      extractionRate: 0,
      processingTimeMs,
      confidence: 'low',
      error: error instanceof Error ? error.message : 'Unknown extraction error',
      warnings: [...warnings, 'Extraction failed - using empty field set']
    };
  }
}

/**
 * Validate and clean extracted fields
 */
function validateAndCleanFields(fields: Phase1Fields, warnings: string[]): Phase1Fields {
  const cleaned: Phase1Fields = { ...fields };

  // Clean customer name - remove underscores and normalize
  if (cleaned.customerName && cleaned.customerName.includes('_')) {
    cleaned.customerName = cleaned.customerName.replace(/_/g, ' ').trim();
    warnings.push('Normalized customer name format');
  }

  // Validate date format
  if (cleaned.dateOfLoss && !isValidDate(cleaned.dateOfLoss)) {
    warnings.push(`Date of loss format may be non-standard: ${cleaned.dateOfLoss}`);
  }

  // Validate address completeness
  if (cleaned.propertyAddress && !isCompleteAddress(cleaned.propertyAddress)) {
    warnings.push('Property address may be incomplete (missing city/state/zip)');
  }

  // Check for duplicate Claim Rep/Estimator
  if (cleaned.claimRep && cleaned.estimator && cleaned.claimRep === cleaned.estimator) {
    warnings.push('Claim Rep and Estimator are the same person');
  }

  // Trim all string values
  Object.keys(cleaned).forEach(key => {
    const value = cleaned[key as keyof Phase1Fields];
    if (typeof value === 'string' && value.trim() === '') {
      cleaned[key as keyof Phase1Fields] = null;
    } else if (typeof value === 'string') {
      cleaned[key as keyof Phase1Fields] = value.trim();
    }
  });

  return cleaned;
}

/**
 * Check if date is in valid format
 */
function isValidDate(dateStr: string): boolean {
  // Accept MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY, etc.
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    /^\d{1,2}-\d{1,2}-\d{4}$/,
    /^\d{4}-\d{1,2}-\d{1,2}$/
  ];
  
  return datePatterns.some(pattern => pattern.test(dateStr));
}

/**
 * Check if address appears complete
 */
function isCompleteAddress(address: string): boolean {
  // Basic check for street, city, state, zip components
  const hasStreet = /\d+/.test(address); // Has house number
  const hasState = /[A-Z]{2}/.test(address); // Has 2-letter state code
  const hasZip = /\d{5}/.test(address); // Has 5-digit zip
  
  return hasStreet && hasState && hasZip;
}

/**
 * Determine confidence level based on extraction metrics
 */
function determineConfidence(
  extractionRate: number, 
  fieldsFound: number, 
  processingTimeMs: number
): 'high' | 'medium' | 'low' {
  // High confidence: 85%+ extraction rate, 7+ fields, reasonable processing time
  if (extractionRate >= 85 && fieldsFound >= 7 && processingTimeMs < 15000) {
    return 'high';
  }
  
  // Medium confidence: 60%+ extraction rate, 5+ fields
  if (extractionRate >= 60 && fieldsFound >= 5) {
    return 'medium';
  }
  
  // Low confidence: everything else
  return 'low';
}

/**
 * Create empty fields object for error cases
 */
function createEmptyFields(): Phase1Fields {
  return {
    customerName: null,
    dateOfLoss: null,
    carrier: null,
    claimRep: null,
    estimator: null,
    propertyAddress: null,
    claimNumber: null,
    policyNumber: null
  };
}

/**
 * Quick extraction for upload flow - simplified interface
 */
export async function quickExtractPhase1(filePath: string): Promise<{
  success: boolean;
  fields: Phase1Fields;
  confidence: string;
  summary: string;
}> {
  const result = await extractPhase1Fields(filePath);
  
  const summary = result.success 
    ? `Found ${result.fieldsFound}/8 fields (${result.extractionRate}%) in ${Math.round(result.processingTimeMs/1000)}s`
    : `Extraction failed: ${result.error}`;

  return {
    success: result.success,
    fields: result.fields,
    confidence: result.confidence,
    summary
  };
}