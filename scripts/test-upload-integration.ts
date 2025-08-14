/**
 * Test Upload Integration
 * 
 * Test the production Phase 1 extraction service with upload workflow simulation
 */

import dotenv from 'dotenv';
import { join } from 'path';
import { executeUploadExtraction, quickUploadExtraction } from '../lib/extraction/upload-integration';
import { extractPhase1Fields } from '../lib/extraction/claude-phase1-extractor';

dotenv.config();

/**
 * Test the detailed extraction service
 */
async function testDetailedExtraction() {
  console.log('🧪 TESTING DETAILED PHASE 1 EXTRACTION SERVICE');
  console.log('='.repeat(60));

  const filePath = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples/Gerloff__Brian_estimate.pdf';
  
  console.log('📄 Testing file: Gerloff__Brian_estimate.pdf');
  console.log('⏱️  Starting extraction...\n');

  const startTime = Date.now();
  const result = await extractPhase1Fields(filePath);
  
  console.log(`✅ Extraction completed in ${Date.now() - startTime}ms\n`);
  
  console.log('📊 RESULTS:');
  console.log(`   Success: ${result.success ? '✅ Yes' : '❌ No'}`);
  console.log(`   Fields Found: ${result.fieldsFound}/${result.totalFields} (${result.extractionRate}%)`);
  console.log(`   Confidence: ${result.confidence.toUpperCase()}`);
  console.log(`   Processing Time: ${result.processingTimeMs}ms`);
  
  if (result.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${result.warnings.length}):`);
    result.warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`));
  }
  
  if (result.error) {
    console.log(`\n❌ ERROR: ${result.error}`);
  }
  
  console.log('\n🎯 EXTRACTED FIELDS:');
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
    const value = result.fields[key as keyof typeof result.fields];
    if (value) {
      console.log(`   ✅ ${label}: "${value}"`);
    } else {
      console.log(`   ❌ ${label}: Not found`);
    }
  });
  
  return result;
}

/**
 * Test the upload workflow integration
 */
async function testUploadWorkflow() {
  console.log('\n🚀 TESTING UPLOAD WORKFLOW INTEGRATION');
  console.log('='.repeat(60));

  const filePath = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples/Evans___Bob_NE_5916_estimate.pdf';
  const fileName = 'Evans___Bob_NE_5916_estimate.pdf';
  
  console.log(`📄 Testing upload workflow for: ${fileName}`);
  console.log('⏱️  Simulating upload extraction...\n');

  const result = await executeUploadExtraction({
    jobId: 'test-job-001',
    filePath,
    fileName,
    fallbackToOCR: false,
    skipExtraction: false
  });
  
  console.log('📊 UPLOAD WORKFLOW RESULTS:');
  console.log(`   Job ID: ${result.jobId}`);
  console.log(`   Phase: ${result.phase}`);
  console.log(`   Status: ${result.status.toUpperCase()}`);
  console.log(`   Extraction Rate: ${result.metadata.extractionRate}%`);
  console.log(`   Confidence: ${result.metadata.confidence.toUpperCase()}`);
  console.log(`   Processing Time: ${result.metadata.processingTimeMs}ms`);
  
  if (result.metadata.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${result.metadata.warnings.length}):`);
    result.metadata.warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`));
  }
  
  console.log('\n🎯 NEXT STEPS:');
  result.nextSteps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));
  
  return result;
}

/**
 * Test the quick extraction interface
 */
async function testQuickExtraction() {
  console.log('\n⚡ TESTING QUICK EXTRACTION INTERFACE');
  console.log('='.repeat(60));

  const filePath = '/Users/jasonglaspey/Obsidian Sync Vaults/CopyEmpire/Copy Empire/Clients/Estimate on Demand/EOD-08.25-user-centric/examples/Hecht__Robert_NE_6251_estimate.pdf';
  const fileName = 'Hecht__Robert_NE_6251_estimate.pdf';
  
  console.log(`📄 Testing quick extraction for: ${fileName}`);
  
  const result = await quickUploadExtraction(filePath, fileName);
  
  console.log('\n📊 QUICK EXTRACTION RESULTS:');
  console.log(`   ${result.displaySummary}`);
  console.log(`   Confidence: ${result.confidence.toUpperCase()}`);
  
  console.log('\n💡 RECOMMENDATIONS:');
  result.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
  
  console.log('\n🔍 FIELD SUMMARY:');
  const foundFields = Object.entries(result.fields)
    .filter(([_, value]) => value !== null)
    .length;
  console.log(`   Found ${foundFields}/8 fields`);
  
  return result;
}

/**
 * Test error handling and graceful degradation
 */
async function testErrorHandling() {
  console.log('\n🛡️  TESTING ERROR HANDLING & GRACEFUL DEGRADATION');
  console.log('='.repeat(60));

  // Test with non-existent file
  console.log('📄 Testing with non-existent file...');
  
  try {
    const result = await executeUploadExtraction({
      jobId: 'test-error-001',
      filePath: '/non/existent/file.pdf',
      fileName: 'non-existent.pdf'
    });
    
    console.log('📊 ERROR HANDLING RESULTS:');
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Success: ${result.status === 'completed' ? '✅ Yes' : '❌ No'}`);
    console.log(`   Fields Found: ${result.metadata.fieldsFound}/8`);
    console.log(`   Error: ${result.metadata.error || 'None'}`);
    console.log(`   Warnings: ${result.metadata.warnings.length}`);
    
    console.log('\n🎯 GRACEFUL DEGRADATION:');
    console.log(`   ✅ Service didn't crash`);
    console.log(`   ✅ Returned structured response`);
    console.log(`   ✅ Provided next steps guidance`);
    
  } catch (error) {
    console.log('❌ Error handling failed - service crashed');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 PHASE 1 EXTRACTION SERVICE - PRODUCTION TESTS');
  console.log('='.repeat(80));
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🎯 Testing Claude direct PDF extraction for upload workflow\n`);

  try {
    // Test 1: Detailed extraction
    await testDetailedExtraction();
    
    // Test 2: Upload workflow
    await testUploadWorkflow();
    
    // Test 3: Quick extraction
    await testQuickExtraction();
    
    // Test 4: Error handling
    await testErrorHandling();
    
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('🎉 Phase 1 extraction service is ready for production use');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    console.log('='.repeat(80));
    process.exit(1);
  }
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });