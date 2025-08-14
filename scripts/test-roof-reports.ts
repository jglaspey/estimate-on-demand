/**
 * Roof Reports Test: Core Fields Extraction
 * 
 * Test OCR + Claude on roof reports to extract 3 core fields:
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
  ocrTextSample: string;
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
 * Extract core fields using Claude with focused prompt for roof reports
 */
async function extractCoreFields(fullText: string): Promise<CoreFields> {
  const prompt = `Extract these 3 core fields from this roof report document. Return ONLY a JSON object:

{
  "customerName": "full customer name or null",
  "propertyAddress": "complete street address with city, state, zip or null", 
  "insuranceCompany": "insurance company name or null"
}

Instructions:
- Roof reports typically have property address prominently displayed at the top
- Look for addresses in formats like "123 Main St, City, State 12345" or similar
- Customer names may appear as property owners or in "PREPARED FOR" sections
- Insurance company may not always be present in roof reports
- Property address is usually the most prominent information
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
 * Test a single roof report file
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
      success: true,
      ocrTextSample: fullText.substring(0, 800) // First 800 chars for analysis
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
      ocrTextSample: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Print detailed results
 */
function printDetailedResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🏠 ROOF REPORTS - CORE FIELDS EXTRACTION TEST');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.fileName}`);
    console.log(`   ⏱️  Processing Time: ${result.processingTime}ms`);
    console.log(`   📊 Fields Found: ${result.fieldsFound}/3`);
    console.log(`   ✅ Success: ${result.success ? 'Yes' : 'No'}`);
    
    if (result.success) {
      console.log(`   🎯 Extracted Fields:`);
      if (result.fields.customerName) {
        console.log(`      👤 Customer Name: "${result.fields.customerName}"`);
      }
      if (result.fields.propertyAddress) {
        console.log(`      🏠 Property Address: "${result.fields.propertyAddress}"`);
      }
      if (result.fields.insuranceCompany) {
        console.log(`      🏢 Insurance Company: "${result.fields.insuranceCompany}"`);
      }
      
      // Show missing fields
      const missing = [];
      if (!result.fields.customerName) missing.push('Customer Name');
      if (!result.fields.propertyAddress) missing.push('Property Address');
      if (!result.fields.insuranceCompany) missing.push('Insurance Company');
      
      if (missing.length > 0) {
        console.log(`   ❌ Missing Fields: ${missing.join(', ')}`);
      }
      
      console.log(`\n   📝 OCR Text Sample (first 800 chars):`);
      console.log(`   ${'-'.repeat(50)}`);
      console.log(`   ${result.ocrTextSample.replace(/\n/g, '\n   ')}`);
      console.log(`   ${'-'.repeat(50)}`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
  });
  
  // Summary
  const successfulResults = results.filter(r => r.success);
  const perfectScores = results.filter(r => r.fieldsFound === 3).length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length);
  const totalFields = results.reduce((sum, r) => sum + r.fieldsFound, 0);
  
  console.log('\n📊 SUMMARY:');
  console.log(`   📁 Files Processed: ${results.length}`);
  console.log(`   ✅ Successful Extractions: ${successfulResults.length}/${results.length}`);
  console.log(`   🎯 Perfect Scores (3/3 fields): ${perfectScores}/${results.length}`);
  console.log(`   📊 Total Fields Found: ${totalFields}/${results.length * 3} (${((totalFields / (results.length * 3)) * 100).toFixed(1)}%)`);
  console.log(`   ⏱️  Average Processing Time: ${avgTime}ms`);
  
  // Field success rates
  const customerNameFound = results.filter(r => r.fields.customerName !== null).length;
  const propertyAddressFound = results.filter(r => r.fields.propertyAddress !== null).length;
  const insuranceCompanyFound = results.filter(r => r.fields.insuranceCompany !== null).length;
  
  console.log('\n📋 FIELD SUCCESS RATES:');
  console.log(`   👤 Customer Name: ${customerNameFound}/${results.length} (${((customerNameFound / results.length) * 100).toFixed(1)}%)`);
  console.log(`   🏠 Property Address: ${propertyAddressFound}/${results.length} (${((propertyAddressFound / results.length) * 100).toFixed(1)}%)`);
  console.log(`   🏢 Insurance Company: ${insuranceCompanyFound}/${results.length} (${((insuranceCompanyFound / results.length) * 100).toFixed(1)}%)`);
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main test function
 */
async function runRoofReportTest() {
  const examplesDir = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples';
  
  // Test 3 roof report files
  const roofReportFiles = [
    'Evans___Bob_NE_5916_roof-report.pdf',
    'Gerloff__Brian_roof-report.pdf',
    'Graterra__Anne_roof-report.pdf'
  ].map(file => join(examplesDir, file));
  
  console.log(`🚀 Starting roof report test for core fields extraction`);
  console.log(`🏠 Processing ${roofReportFiles.length} roof report files...`);
  console.log(`🎯 Target fields: Customer Name, Property Address, Insurance Company\n`);
  
  const results: TestResult[] = [];
  
  for (const filePath of roofReportFiles) {
    const result = await testSingleFile(filePath);
    results.push(result);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  printDetailedResults(results);
  return results;
}

// Run the test
runRoofReportTest()
  .then(() => {
    console.log('\n✅ Roof report test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Roof report test failed:', error);
    process.exit(1);
  });