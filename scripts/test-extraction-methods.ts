/**
 * Compare Extraction Methods Test
 * 
 * Test both Pixtral vision model and OCR + Claude analysis
 * to see which extracts priority fields more reliably
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Mistral } from '@mistralai/mistralai';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MISTRAL_OCR_MODEL = 'mistral-ocr-2505';
const MISTRAL_VISION_MODEL = 'pixtral-12b-2409';

const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface PriorityFields {
  customerName?: string;
  propertyAddress?: string;
  claimNumber?: string;
  policyNumber?: string;
  dateOfLoss?: string;
  carrier?: string;
  claimRep?: string;
  estimator?: string;
  originalEstimate?: string;
}

interface TestResult {
  method: string;
  processingTime: number;
  fields: PriorityFields;
  fieldsFound: number;
  success: boolean;
  error?: string;
}

/**
 * Method 1: Pixtral Vision Model - Direct document analysis
 */
async function testPixtralVision(filePath: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Testing Pixtral Vision Model...`);
    
    // Convert PDF to base64 (we'll process first 3 pages as images)
    const pdfBuffer = readFileSync(filePath);
    const base64Pdf = pdfBuffer.toString('base64');
    
    const prompt = `Analyze this insurance document and extract the following 9 priority fields. Return ONLY a JSON object with the exact structure shown:

{
  "customerName": "full customer name or null",
  "propertyAddress": "complete property address or null",
  "claimNumber": "claim number or null",
  "policyNumber": "policy number or null", 
  "dateOfLoss": "date of loss or null",
  "carrier": "insurance company name or null",
  "claimRep": "claim representative name or null",
  "estimator": "estimator name or null",
  "originalEstimate": "total estimate amount as string or null"
}

Instructions:
- Look carefully at headers, customer information sections, and document details
- For addresses, include the complete address with city, state, zip
- For dollar amounts, include just the number (no $ symbol)
- Return null for any field you cannot find with confidence
- Return ONLY the JSON object, no explanations`;

    const response = await mistral.chat.complete({
      model: MISTRAL_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: `data:application/pdf;base64,${base64Pdf}`
          }
        ]
      }],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Pixtral');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const fields = JSON.parse(jsonMatch[0]) as PriorityFields;
    const fieldsFound = Object.values(fields).filter(v => v !== null && v !== '').length;
    
    console.log(`✅ Pixtral completed: ${fieldsFound}/9 fields found`);

    return {
      method: 'Pixtral Vision',
      processingTime: Date.now() - startTime,
      fields,
      fieldsFound,
      success: true
    };

  } catch (error) {
    console.error(`❌ Pixtral failed:`, error);
    return {
      method: 'Pixtral Vision',
      processingTime: Date.now() - startTime,
      fields: {},
      fieldsFound: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Method 2: OCR + Claude Analysis
 */
async function testOCRPlusClaude(filePath: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Testing OCR + Claude Analysis...`);
    
    // Step 1: Extract text with Mistral OCR
    const pdfBuffer = readFileSync(filePath);
    const base64Pdf = pdfBuffer.toString('base64');
    
    const ocrResponse = await fetch('https://api.mistral.ai/v1/ocr', {
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

    if (!ocrResponse.ok) {
      throw new Error(`OCR failed: ${ocrResponse.status}`);
    }

    const ocrResult = await ocrResponse.json();
    const pages = ocrResult.pages || [];
    const fullText = pages
      .map((page: any) => page.markdown || page.text || '')
      .join('\n\n');

    console.log(`📄 OCR extracted ${fullText.length} characters`);

    // Step 2: Analyze with Claude
    const prompt = `Analyze this extracted text from an insurance document and extract the following 9 priority fields. Return ONLY a JSON object:

{
  "customerName": "full customer name or null",
  "propertyAddress": "complete property address or null", 
  "claimNumber": "claim number or null",
  "policyNumber": "policy number or null",
  "dateOfLoss": "date of loss or null",
  "carrier": "insurance company name or null",
  "claimRep": "claim representative name or null",
  "estimator": "estimator name or null",
  "originalEstimate": "total estimate amount as string or null"
}

Instructions:
- Look for customer information, claim details, and totals
- Customer names may be formatted like "BRIAN_GERLOFF_&_CHR2" or normal format
- Claim reps might be at the top of letters (like "Janel Albaugh")
- For dollar amounts, use just the number without $ symbol
- Return null for fields you cannot find confidently
- Return ONLY the JSON object

Document text:
${fullText}`;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const claudeContent = claudeResponse.content[0];
    if (claudeContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = claudeContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const fields = JSON.parse(jsonMatch[0]) as PriorityFields;
    const fieldsFound = Object.values(fields).filter(v => v !== null && v !== '').length;
    
    console.log(`✅ OCR + Claude completed: ${fieldsFound}/9 fields found`);

    return {
      method: 'OCR + Claude',
      processingTime: Date.now() - startTime,
      fields,
      fieldsFound,
      success: true
    };

  } catch (error) {
    console.error(`❌ OCR + Claude failed:`, error);
    return {
      method: 'OCR + Claude',
      processingTime: Date.now() - startTime,
      fields: {},
      fieldsFound: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Print comparison results
 */
function printResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 EXTRACTION METHOD COMPARISON RESULTS');
  console.log('='.repeat(80));

  const fieldLabels = [
    'customerName', 'propertyAddress', 'claimNumber', 'policyNumber',
    'dateOfLoss', 'carrier', 'claimRep', 'estimator', 'originalEstimate'
  ];

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.method.toUpperCase()}`);
    console.log(`   ⏱️  Processing Time: ${result.processingTime}ms`);
    console.log(`   📊 Fields Found: ${result.fieldsFound}/9`);
    console.log(`   ✅ Success: ${result.success ? 'Yes' : 'No'}`);
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }

    if (result.success && result.fieldsFound > 0) {
      console.log(`   🎯 Extracted Fields:`);
      fieldLabels.forEach(field => {
        const value = result.fields[field as keyof PriorityFields];
        if (value) {
          console.log(`      ✅ ${field}: "${value}"`);
        }
      });
    }
  });

  // Comparison summary
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 1) {
    console.log('\n📊 COMPARISON SUMMARY:');
    successfulResults.forEach(result => {
      console.log(`   ${result.method}: ${result.fieldsFound}/9 fields (${result.processingTime}ms)`);
    });

    const best = successfulResults.reduce((prev, current) => 
      current.fieldsFound > prev.fieldsFound ? current : prev
    );
    console.log(`\n🏆 WINNER: ${best.method} with ${best.fieldsFound}/9 fields`);
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Main test function
 */
async function runComparisonTest(filePath: string) {
  console.log(`🚀 Starting extraction method comparison test\n`);
  console.log(`📄 File: ${filePath.split('/').pop()}\n`);

  const results: TestResult[] = [];

  // Test Method 1: Pixtral Vision
  const pixtralnResult = await testPixtralVision(filePath);
  results.push(pixtralnResult);

  console.log(''); // Spacing

  // Test Method 2: OCR + Claude
  const ocrClaudeResult = await testOCRPlusClaude(filePath);
  results.push(ocrClaudeResult);

  // Print comparison
  printResults(results);

  return results;
}

// Run the test
const filePath = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples/Gerloff__Brian_estimate.pdf';

runComparisonTest(filePath)
  .then(() => {
    console.log('✅ Comparison test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });