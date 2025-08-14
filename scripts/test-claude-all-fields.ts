/**
 * Claude Direct PDF Test: All 8 Priority Fields
 * 
 * Test Claude 3.5 Haiku with direct PDF input to extract all 8 fields:
 * - Customer Name
 * - Date of Loss
 * - Carrier 
 * - Claim Rep
 * - Estimator
 * - Property Address
 * - Claim Number
 * - Policy Number
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface AllFields {
  customerName: string | null;
  dateOfLoss: string | null;
  carrier: string | null;
  claimRep: string | null;
  estimator: string | null;
  propertyAddress: string | null;
  claimNumber: string | null;
  policyNumber: string | null;
}

interface TestResult {
  fileName: string;
  processingTime: number;
  fields: AllFields;
  fieldsFound: number;
  success: boolean;
  error?: string;
}

/**
 * Extract all 8 priority fields by sending PDF directly to Claude Haiku
 */
async function extractAllFieldsFromPDF(filePath: string): Promise<AllFields> {
  const pdfBuffer = readFileSync(filePath);
  const base64Pdf = pdfBuffer.toString('base64');

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

Instructions:
- Look carefully at headers, letterheads, customer info sections, and document details
- Customer names may be formatted as "BRIAN_GERLOFF_&_CHR2" or "John Smith"
- Date of Loss might appear as "DOS", "Date of Loss", or "Loss Date"
- Claim Rep might be the person signing the letter or listed as adjuster/representative
- Estimator might be the same as Claim Rep or listed separately
- Property address should be complete (street, city, state, zip)
- Claim numbers are often alphanumeric codes
- Policy numbers are often alphanumeric codes starting with letters like "POL-"
- Look in multiple places: headers, customer info sections, signatures, contact info
- Return null for any field you cannot find confidently
- Return ONLY the JSON object, no explanations`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 800,
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

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]) as AllFields;
}

/**
 * Test a single file with direct PDF approach
 */
async function testSingleFile(filePath: string): Promise<TestResult> {
  const startTime = Date.now();
  const fileName = filePath.split('/').pop() || 'unknown';
  
  try {
    console.log(`🔬 Processing: ${fileName}`);
    
    // Send PDF directly to Claude
    const fields = await extractAllFieldsFromPDF(filePath);
    
    const fieldsFound = Object.values(fields).filter(v => v !== null && v !== '').length;
    const processingTime = Date.now() - startTime;
    
    console.log(`   ⏱️  ${processingTime}ms | 📊 ${fieldsFound}/8 fields`);
    
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
      fields: {
        customerName: null, dateOfLoss: null, carrier: null, claimRep: null,
        estimator: null, propertyAddress: null, claimNumber: null, policyNumber: null
      },
      fieldsFound: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Print results as a comprehensive table
 */
function printResultsTable(results: TestResult[]) {
  console.log('\n' + '='.repeat(150));
  console.log('🧪 CLAUDE DIRECT PDF - ALL 8 PRIORITY FIELDS EXTRACTION TEST');
  console.log('='.repeat(150));
  
  // Print each document's results in detail
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.fileName}`);
    console.log(`   ⏱️  Time: ${result.processingTime}ms | 📊 Fields: ${result.fieldsFound}/8 | ✅ Success: ${result.success ? 'Yes' : 'No'}`);
    
    if (result.success) {
      const fieldLabels = [
        ['customerName', '👤 Customer Name'],
        ['propertyAddress', '🏠 Property Address'], 
        ['carrier', '🏢 Carrier'],
        ['claimRep', '👨‍💼 Claim Rep'],
        ['estimator', '📝 Estimator'],
        ['dateOfLoss', '📅 Date of Loss'],
        ['claimNumber', '🔢 Claim Number'],
        ['policyNumber', '📋 Policy Number']
      ];
      
      fieldLabels.forEach(([key, label]) => {
        const value = result.fields[key as keyof AllFields];
        if (value) {
          console.log(`      ✅ ${label}: "${value}"`);
        } else {
          console.log(`      ❌ ${label}: Not found`);
        }
      });
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
  });
  
  // Summary statistics
  const successfulResults = results.filter(r => r.success);
  const perfectScores = results.filter(r => r.fieldsFound === 8).length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length);
  const totalFields = results.reduce((sum, r) => sum + r.fieldsFound, 0);
  
  console.log('\n' + '='.repeat(150));
  console.log('📊 SUMMARY STATISTICS:');
  console.log(`   📁 Files Processed: ${results.length}`);
  console.log(`   ✅ Successful Extractions: ${successfulResults.length}/${results.length}`);
  console.log(`   🎯 Perfect Scores (8/8 fields): ${perfectScores}/${results.length}`);
  console.log(`   📊 Total Fields Found: ${totalFields}/${results.length * 8} (${((totalFields / (results.length * 8)) * 100).toFixed(1)}%)`);
  console.log(`   ⏱️  Average Processing Time: ${avgTime}ms`);
  
  // Field-by-field success rates
  const fieldKeys = ['customerName', 'propertyAddress', 'carrier', 'claimRep', 'estimator', 'dateOfLoss', 'claimNumber', 'policyNumber'];
  const fieldLabels = ['👤 Customer Name', '🏠 Property Address', '🏢 Carrier', '👨‍💼 Claim Rep', '📝 Estimator', '📅 Date of Loss', '🔢 Claim Number', '📋 Policy Number'];
  
  console.log('\n📋 FIELD SUCCESS RATES:');
  fieldKeys.forEach((key, index) => {
    const found = results.filter(r => r.fields[key as keyof AllFields] !== null && r.fields[key as keyof AllFields] !== '').length;
    const percentage = ((found / results.length) * 100).toFixed(1);
    console.log(`   ${fieldLabels[index]}: ${found}/${results.length} (${percentage}%)`);
  });
  
  // Performance tiers
  console.log('\n🎯 PERFORMANCE TIERS:');
  const tier1 = results.filter(r => r.fieldsFound >= 7).length; // 7-8 fields
  const tier2 = results.filter(r => r.fieldsFound >= 5 && r.fieldsFound < 7).length; // 5-6 fields  
  const tier3 = results.filter(r => r.fieldsFound >= 3 && r.fieldsFound < 5).length; // 3-4 fields
  const tier4 = results.filter(r => r.fieldsFound < 3).length; // 0-2 fields
  
  console.log(`   🏆 Excellent (7-8 fields): ${tier1}/${results.length} (${((tier1/results.length)*100).toFixed(1)}%)`);
  console.log(`   🥈 Good (5-6 fields): ${tier2}/${results.length} (${((tier2/results.length)*100).toFixed(1)}%)`);
  console.log(`   🥉 Fair (3-4 fields): ${tier3}/${results.length} (${((tier3/results.length)*100).toFixed(1)}%)`);
  console.log(`   ❌ Poor (0-2 fields): ${tier4}/${results.length} (${((tier4/results.length)*100).toFixed(1)}%)`);
  
  console.log('\n' + '='.repeat(150));
}

/**
 * Main test function
 */
async function runAllFieldsTest() {
  const examplesDir = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples';
  
  // Same 10 estimate files for comparison
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
  
  console.log(`🚀 Starting Claude Direct PDF test for ALL 8 priority fields`);
  console.log(`📄 Processing ${estimateFiles.length} estimate files with direct PDF input...`);
  console.log(`🎯 Target fields: Customer Name, Date of Loss, Carrier, Claim Rep, Estimator, Property Address, Claim Number, Policy Number`);
  console.log(`🧠 Model: Claude 3.5 Haiku (direct PDF processing)\n`);
  
  const results: TestResult[] = [];
  
  for (const filePath of estimateFiles) {
    const result = await testSingleFile(filePath);
    results.push(result);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  printResultsTable(results);
  return results;
}

// Run the test
runAllFieldsTest()
  .then(() => {
    console.log('\n✅ Claude Direct PDF All Fields test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Claude Direct PDF All Fields test failed:', error);
    process.exit(1);
  });