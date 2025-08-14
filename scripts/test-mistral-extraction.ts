/**
 * Test Runner for Mistral Priority Field Extraction
 * 
 * Usage: npx tsx scripts/test-mistral-extraction.ts
 */

import dotenv from 'dotenv';
import { runPriorityExtractionTest } from '../lib/testing/mistral-priority-extraction-test';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🧪 Running Mistral Priority Field Extraction Test Suite...\n');
    
    const results = await runPriorityExtractionTest();
    
    console.log('\n✅ Test completed successfully!');
    
    // Summary stats
    const estimateFields = Object.keys(results.estimate.priorityFields).length;
    const roofFields = Object.keys(results.roofReport.priorityFields).length;
    const combinedFields = Object.keys(results.combinedFields).length;
    
    console.log('\n📈 SUMMARY STATS:');
    console.log(`Estimate fields extracted: ${estimateFields}/9`);
    console.log(`Roof report fields extracted: ${roofFields}/9`);
    console.log(`Combined fields: ${combinedFields}/9`);
    console.log(`Total processing time: ${results.estimate.processingTimeMs + results.roofReport.processingTimeMs}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();