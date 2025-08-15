/**
 * Test the production-ready Haiku extraction engine
 */

import path from 'path';

import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '.env') });

import { createHaikuEngine } from '../extraction/haiku-extraction-engine';

async function testProductionEngine() {
  console.log('🧪 Testing Production Haiku Extraction Engine\n');
  
  try {
    const engine = createHaikuEngine();
    console.log('✅ Engine initialized successfully');
    console.log('📋 Engine info:', JSON.stringify(engine.getEngineInfo(), null, 2));
    
    // Test with one of our proven documents
    const testDocument = path.join(__dirname, '..', '..', 'examples', 'Evans___Bob_NE_5916_estimate.pdf');
    
    console.log('\n🚀 Testing extraction...');
    const result = await engine.extractFromFile(testDocument, 'test-001');
    
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log('Data:', JSON.stringify(result.data, null, 2));
    console.log('\n📈 METRICS:');
    console.log(`Processing Time: ${result.metrics.processingTime}ms`);
    console.log(`Cost: $${result.metrics.cost.toFixed(4)}`);
    console.log(`Token Usage: ${result.metrics.tokenUsage.input} input, ${result.metrics.tokenUsage.output} output`);
    console.log(`Success: ${result.metrics.success}`);
    
    if (!result.metrics.success) {
      console.log(`Error: ${result.metrics.error}`);
      return;
    }
    
    // Validate the extraction
    console.log('\n🔍 VALIDATION:');
    const validation = engine.validateExtraction(result.data);
    console.log(`Completeness Score: ${validation.score.toFixed(1)}%`);
    console.log(`Fields Found: ${validation.fieldsFound}/${validation.totalFields}`);
    console.log(`Has Gutter Apron: ${validation.hasGutterApron ? '✅' : '❌'}`);
    console.log(`Has Location Data: ${validation.hasLocationData ? '✅' : '❌'}`);
    
    if (validation.criticalMissing.length > 0) {
      console.log(`Critical Missing: ${validation.criticalMissing.join(', ')}`);
    }
    
    // Expected results based on our testing
    console.log('\n✅ VERIFICATION AGAINST KNOWN RESULTS:');
    console.log(`Hip/Ridge Cap: ${result.data.hipRidgeCap.quantity} (expected: 104.25) ${result.data.hipRidgeCap.quantity === 104.25 ? '✅' : '❌'}`);
    console.log(`Starter Strip: ${result.data.starterStrip.quantity} (expected: 101.91) ${result.data.starterStrip.quantity === 101.91 ? '✅' : '❌'}`);
    console.log(`Drip Edge: ${result.data.dripEdge.quantity} (expected: 324.99) ${result.data.dripEdge.quantity === 324.99 ? '✅' : '❌'}`);
    console.log(`Gutter Apron: ${result.data.gutterApron.quantity} (expected: 37) ${result.data.gutterApron.quantity === 37 ? '✅' : '❌'}`);
    console.log(`Ice Water Barrier: ${result.data.iceWaterBarrier.coverage} (expected: 389.63) ${result.data.iceWaterBarrier.coverage === 389.63 ? '✅' : '❌'}`);
    
    const allCorrect = 
      result.data.hipRidgeCap.quantity === 104.25 &&
      result.data.starterStrip.quantity === 101.91 &&
      result.data.dripEdge.quantity === 324.99 &&
      result.data.gutterApron.quantity === 37 &&
      result.data.iceWaterBarrier.coverage === 389.63;
    
    console.log(`\n🎯 OVERALL RESULT: ${allCorrect ? '✅ PERFECT MATCH' : '❌ DISCREPANCY DETECTED'}`);
    
    if (allCorrect) {
      console.log('\n🚀 Production engine ready for deployment!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testProductionEngine().catch(console.error);
}

export { testProductionEngine };