/**
 * Batch Test: Core Fields Extraction
 * 
 * Test OCR + Claude on 10 estimate files to extract 3 core fields:
 * - Customer Name
 * - Property Address  
 * - Insurance Company
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MISTRAL_OCR_MODEL = 'mistral-ocr-2505';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface CoreFields {
  customerName: string | null;
  propertyAddress: string | null;
  insuranceCompany: string | null;
}

interface TestResult {
  fileName: string;
  processingTime: number;
  fields: CoreFields;
  fieldsFound: number;
  success: boolean;
  error?: string;
}

/**
 * Extract text from PDF using Mistral OCR (first 3 pages)
 */
async function extractTextWithOCR(filePath: string): Promise<string> {
  const pdfBuffer = readFileSync(filePath);
  const base64Pdf = pdfBuffer.toString('base64');
  
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
      pages: [1, 2, 3], // First 3 pages
    }),
  });

  if (!response.ok) {
    throw new Error(`OCR failed: ${response.status}`);
  }

  const ocrResult = await response.json();
  const pages = ocrResult.pages || [];
  return pages
    .map((page: any) => page.markdown || page.text || '')
    .join('\n\n');
}

/**
 * Extract core fields using Claude with focused prompt
 */
async function extractCoreFields(fullText: string): Promise<CoreFields> {
  const prompt = `Extract these 3 core fields from this insurance estimate document. Return ONLY a JSON object:

{
  "customerName": "full customer name or null",
  "propertyAddress": "complete street address with city, state, zip or null", 
  "insuranceCompany": "insurance company name or null"
}

Instructions:
- Look carefully at headers, letterheads, and customer information sections
- Customer names may be formatted as "BRIAN_GERLOFF_&_CHR2" or "John Smith" 
- Property address should be complete (street, city, state, zip)
- Insurance company examples: "Nationwide", "Allstate", "State Farm", etc.
- Return null for any field you cannot find confidently
- Return ONLY the JSON object, no explanations

Document text:
${fullText}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]) as CoreFields;
}

/**
 * Test a single file
 */
async function testSingleFile(filePath: string): Promise<TestResult> {
  const startTime = Date.now();
  const fileName = filePath.split('/').pop() || 'unknown';
  
  try {
    console.log(`🔬 Processing: ${fileName}`);
    
    // Step 1: Extract OCR text
    const fullText = await extractTextWithOCR(filePath);
    
    // Step 2: Extract core fields with Claude
    const fields = await extractCoreFields(fullText);
    
    const fieldsFound = Object.values(fields).filter(v => v !== null).length;
    const processingTime = Date.now() - startTime;
    
    console.log(`   ⏱️  ${processingTime}ms | 📊 ${fieldsFound}/3 fields`);
    
    return {
      fileName,
      processingTime,
      fields,
      fieldsFound,
      success: true
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      fileName,
      processingTime,
      fields: { customerName: null, propertyAddress: null, insuranceCompany: null },
      fieldsFound: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Print results as a formatted table
 */
function printResultsTable(results: TestResult[]) {
  console.log('\n' + '='.repeat(120));
  console.log('🧪 CORE FIELDS EXTRACTION - BATCH TEST RESULTS');
  console.log('='.repeat(120));
  
  // Header
  console.log('');
  console.log('│ File Name                          │ Time  │ Fields │ Customer Name          │ Property Address              │ Insurance Company        │');
  console.log('├────────────────────────────────────┼───────┼────────┼────────────────────────┼───────────────────────────────┼──────────────────────────┤');
  
  // Data rows
  results.forEach(result => {
    const fileName = result.fileName.padEnd(34).substring(0, 34);
    const time = `${result.processingTime}ms`.padEnd(5);
    const fieldsCount = `${result.fieldsFound}/3`.padEnd(6);
    const customerName = (result.fields.customerName || 'null').padEnd(22).substring(0, 22);
    const propertyAddress = (result.fields.propertyAddress || 'null').padEnd(29).substring(0, 29);
    const insuranceCompany = (result.fields.insuranceCompany || 'null').padEnd(24).substring(0, 24);
    
    const success = result.success ? '' : ' ❌';
    console.log(`│ ${fileName} │ ${time} │ ${fieldsCount} │ ${customerName} │ ${propertyAddress} │ ${insuranceCompany} │${success}`);
  });
  
  console.log('└────────────────────────────────────┴───────┴────────┴────────────────────────┴───────────────────────────────┴──────────────────────────┘');
  
  // Summary statistics
  const successfulResults = results.filter(r => r.success);
  const perfectScores = results.filter(r => r.fieldsFound === 3).length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length);
  const totalFields = results.reduce((sum, r) => sum + r.fieldsFound, 0);
  
  console.log('\n📊 SUMMARY STATISTICS:');
  console.log(`   📁 Files Processed: ${results.length}`);
  console.log(`   ✅ Successful Extractions: ${successfulResults.length}/${results.length}`);
  console.log(`   🎯 Perfect Scores (3/3 fields): ${perfectScores}/${results.length}`);
  console.log(`   📊 Total Fields Found: ${totalFields}/${results.length * 3} (${((totalFields / (results.length * 3)) * 100).toFixed(1)}%)`);
  console.log(`   ⏱️  Average Processing Time: ${avgTime}ms`);
  
  // Field-by-field breakdown
  const customerNameFound = results.filter(r => r.fields.customerName !== null).length;
  const propertyAddressFound = results.filter(r => r.fields.propertyAddress !== null).length;
  const insuranceCompanyFound = results.filter(r => r.fields.insuranceCompany !== null).length;
  
  console.log('\n📋 FIELD SUCCESS RATES:');
  console.log(`   👤 Customer Name: ${customerNameFound}/${results.length} (${((customerNameFound / results.length) * 100).toFixed(1)}%)`);
  console.log(`   🏠 Property Address: ${propertyAddressFound}/${results.length} (${((propertyAddressFound / results.length) * 100).toFixed(1)}%)`);
  console.log(`   🏢 Insurance Company: ${insuranceCompanyFound}/${results.length} (${((insuranceCompanyFound / results.length) * 100).toFixed(1)}%)`);
  
  console.log('\n' + '='.repeat(120));
}

/**
 * Main test function
 */
async function runBatchTest() {
  const examplesDir = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples';
  
  // Get 10 estimate files
  const estimateFiles = [
    'Evans___Bob_NE_5916_estimate.pdf',
    'Fritch__Jeanne_NE_5919_estimate.pdf', 
    'Garrison__Mary_Ann__decking_estimate.pdf',
    'Gerloff__Brian_estimate.pdf',
    'Granillo__Antonio_NE_6138_estimate.pdf',
    'Graterra__Anne_estimate.pdf',
    'Gutz__Charlie_NE_6033_estimate.pdf',
    'Hall__Steve_and_Wendy_NE_6181_estimate.pdf',
    'Hecht__Robert_NE_6251_estimate.pdf',
    'Henton__Cedric_NE_6133_estimate.pdf'
  ].map(file => join(examplesDir, file));
  
  console.log(`🚀 Starting batch test of core fields extraction`);
  console.log(`📄 Processing ${estimateFiles.length} estimate files...`);
  console.log(`🎯 Target fields: Customer Name, Property Address, Insurance Company\n`);
  
  const results: TestResult[] = [];
  
  for (const filePath of estimateFiles) {
    const result = await testSingleFile(filePath);
    results.push(result);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  printResultsTable(results);
  return results;
}

// Run the test
runBatchTest()
  .then(() => {
    console.log('\n✅ Batch test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Batch test failed:', error);
    process.exit(1);
  });