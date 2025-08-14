/**
 * Single File Mistral OCR Test
 * 
 * Test priority field extraction from a specific file
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_OCR_MODEL = 'mistral-ocr-2505';

if (!MISTRAL_API_KEY) {
  throw new Error('MISTRAL_API_KEY environment variable is required');
}

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

/**
 * Extract text from PDF using Mistral OCR (first N pages only)
 */
async function extractTextWithOCR(filePath: string, maxPages: number = 3): Promise<{
  fullText: string;
  pages: Array<{ pageNumber: number; content: string; confidence: number }>;
  processingTime: number;
}> {
  const startTime = Date.now();
  
  console.log(`🔬 Extracting OCR from: ${filePath.split('/').pop()}`);
  console.log(`📄 Processing first ${maxPages} pages...`);
  
  const pdfBuffer = readFileSync(filePath);
  const base64Pdf = pdfBuffer.toString('base64');
  
  // Specify which pages to process
  const pagesToProcess = Array.from({ length: maxPages }, (_, i) => i + 1);
  
  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
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
    .map(p => `=== PAGE ${p.pageNumber} ===\n${p.content}`)
    .join('\n\n');
  
  const processingTime = Date.now() - startTime;
  
  console.log(`⏱️  OCR completed in ${processingTime}ms`);
  console.log(`📊 Extracted ${extractedPages.length} pages, ${fullText.length} characters total`);
  
  return { fullText, pages: extractedPages, processingTime };
}

/**
 * Extract priority fields using improved regex patterns
 */
function extractPriorityFields(fullText: string): PriorityFields {
  const fields: PriorityFields = {};
  
  console.log(`\n🔍 Searching for priority fields in extracted text...\n`);
  
  // Improved Customer Name patterns - look for actual names in common locations
  const namePatterns = [
    /([A-Z]+_[A-Z]+(?:_&_[A-Z]+\d?)?)/i, // Pattern like BRIAN_GERLOFF_&_CHR2
    /(?:insured|customer|property owner|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\n.*(?:address|street)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)$/m,
  ];
  
  // Property Address patterns - look for full addresses
  const addressPatterns = [
    /(\d+\s+[A-Za-z0-9\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/i,
    /(?:property address|address|location):\s*([^\n]+)/i,
    /(\d+\s+[A-Za-z0-9\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/i,
  ];
  
  // Claim Number patterns - look for various claim number formats
  const claimPatterns = [
    /(?:claim\s*(?:number|#|no)):\s*([A-Z0-9\-]+)/i,
    /(?:claim):\s*([A-Z0-9\-]{8,})/i,
    /([0-9]{8,12})/g, // Generic long number sequences
  ];
  
  // Policy Number patterns
  const policyPatterns = [
    /(?:policy\s*(?:number|#|no)):\s*([A-Z0-9\-]+)/i,
    /(?:policy):\s*([A-Z0-9\-]+)/i,
    /POL-([A-Z0-9]+)/i,
  ];
  
  // Date of Loss patterns
  const datePatterns = [
    /(?:date of loss|loss date|date of damage):\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(?:date of loss|loss date):\s*(\d{1,2}-\d{1,2}-\d{2,4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
  ];
  
  // Carrier patterns - look for insurance company names
  const carrierPatterns = [
    /(?:carrier|insurance company|insurer):\s*([^\n]+)/i,
    /(allstate|state farm|farmers|geico|progressive|encompass|liberty mutual|travelers|nationwide|american family|usaa)[\s\w]*/i,
  ];
  
  // Claim Rep patterns - look for adjuster/representative names
  const repPatterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+)<br>PO BOX/i, // Pattern like "Janel Albaugh<br>PO BOX"
    /(?:claim rep|adjuster|representative|agent):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:adjuster|rep):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
  ];
  
  // Estimator patterns - look for estimator names
  const estimatorPatterns = [
    /(?:estimator|prepared by|created by|estimate by):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z-]+)+)/i,
    /(?:thank you,|sincerely,)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z-]+)+)/i,
  ];
  
  // Original Estimate patterns - look for total amounts
  const estimatePatterns = [
    /(?:total|grand total|estimate total|claim total):\s*\$?([\d,]+\.?\d*)/i,
    /(?:total.*amount|amount.*total):\s*\$?([\d,]+\.?\d*)/i,
  ];
  
  // Extract fields with improved confidence scoring
  const extractField = (patterns: RegExp[], fieldName: string, useGlobal: boolean = false): PriorityFieldResult | undefined => {
    console.log(`Searching for ${fieldName}...`);
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      
      if (useGlobal && pattern.global) {
        const matches = [...fullText.matchAll(pattern)];
        if (matches.length > 0) {
          // For global patterns, we might want to filter or choose the best match
          for (const match of matches) {
            const value = match[1]?.trim();
            if (value && value.length > 0) {
              console.log(`  ✅ Found with pattern ${i + 1}: "${value}"`);
              return {
                value,
                confidence: 0.8 - (i * 0.1), // Higher confidence for earlier patterns
                sourceLocation: `Pattern ${i + 1}: ${pattern.toString()}`
              };
            }
          }
        }
      } else {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value.length > 0) {
            console.log(`  ✅ Found with pattern ${i + 1}: "${value}"`);
            return {
              value,
              confidence: 0.8 - (i * 0.1), // Higher confidence for earlier patterns
              sourceLocation: `Pattern ${i + 1}: ${pattern.toString()}`
            };
          }
        }
      }
    }
    
    console.log(`  ❌ Not found: ${fieldName}`);
    return undefined;
  };
  
  // Extract all fields
  fields.customerName = extractField(namePatterns, 'Customer Name');
  fields.propertyAddress = extractField(addressPatterns, 'Property Address');
  fields.claimNumber = extractField(claimPatterns, 'Claim Number');
  fields.policyNumber = extractField(policyPatterns, 'Policy Number');
  fields.dateOfLoss = extractField(datePatterns, 'Date of Loss');
  fields.carrier = extractField(carrierPatterns, 'Carrier');
  fields.claimRep = extractField(repPatterns, 'Claim Rep');
  fields.estimator = extractField(estimatorPatterns, 'Estimator');
  
  // Special handling for estimate amounts - find substantial dollar amounts
  const dollarMatches = [...fullText.matchAll(/\$([0-9,]+\.?\d*)/g)];
  if (dollarMatches.length > 0) {
    const amounts = dollarMatches
      .map(match => parseFloat(match[1].replace(/,/g, '')))
      .filter(amount => amount > 1000); // Only consider substantial amounts
    
    if (amounts.length > 0) {
      const maxAmount = Math.max(...amounts);
      console.log(`Searching for Original Estimate...`);
      console.log(`  ✅ Found largest amount: $${maxAmount.toLocaleString()}`);
      fields.originalEstimate = {
        value: maxAmount.toString(),
        confidence: 0.7,
        sourceLocation: 'Largest substantial dollar amount found'
      };
    }
  }
  
  return fields;
}

/**
 * Print results in a clean format
 */
function printResults(fullText: string, fields: PriorityFields, processingTime: number) {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 MISTRAL OCR SINGLE FILE TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n⏱️  Processing Time: ${processingTime}ms`);
  console.log(`📄 Total Text Length: ${fullText.length} characters\n`);
  
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
  
  console.log('🎯 EXTRACTED PRIORITY FIELDS:');
  let foundCount = 0;
  for (const [key, label] of Object.entries(fieldLabels)) {
    const field = fields[key as keyof PriorityFields];
    if (field) {
      console.log(`  ✅ ${label}: "${field.value}" (${(field.confidence * 100).toFixed(1)}% confidence)`);
      foundCount++;
    } else {
      console.log(`  ❌ ${label}: Not found`);
    }
  }
  
  console.log(`\n📊 SUMMARY: ${foundCount}/9 fields extracted`);
  
  // Show first 2000 characters of OCR text for context
  console.log('\n📝 OCR TEXT SAMPLE (first 2000 chars):');
  console.log('='.repeat(50));
  console.log(fullText.substring(0, 2000) + '...');
  console.log('='.repeat(50));
  
  // Also show the full text for analysis
  console.log('\n📄 FULL OCR TEXT:');
  console.log('='.repeat(80));
  console.log(fullText);
  console.log('='.repeat(80));
}

/**
 * Main test function
 */
async function runSingleFileTest(filePath: string) {
  try {
    console.log(`🚀 Starting single file OCR test\n`);
    
    // Step 1: Extract OCR text
    const ocrResult = await extractTextWithOCR(filePath, 3);
    
    // Step 2: Extract priority fields
    const priorityFields = extractPriorityFields(ocrResult.fullText);
    
    // Step 3: Print results
    printResults(ocrResult.fullText, priorityFields, ocrResult.processingTime);
    
    return {
      success: true,
      fields: priorityFields,
      fullText: ocrResult.fullText,
      processingTime: ocrResult.processingTime
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
const filePath = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples/Gerloff__Brian_estimate.pdf';

runSingleFileTest(filePath)
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });