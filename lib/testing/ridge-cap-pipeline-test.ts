/**
 * Ridge Cap Analysis Pipeline Test
 * 
 * Tests the complete pipeline from document text to UI-ready data:
 * 1. Claude Line Item Extractor
 * 2. Claude Measurement Extractor  
 * 3. Ridge Cap Rule Analyzer
 * 4. Data mapping to UI format
 */

import { claudeLineItemExtractor } from '../extraction/claude-line-item-extractor';
import { claudeMeasurementExtractor } from '../extraction/claude-measurement-extractor';
import { ridgeCapAnalyzer } from '../analysis/ridge-cap-analyzer';
import { mapDatabaseToRidgeCapData } from '../ridge-cap-data-mapper';

// Test data - simulating real document text
const SAMPLE_ESTIMATE_TEXT = `
INSURANCE CLAIM ESTIMATE

Policy Number: NEA47803
Claim Number: 1354565-242889-014101
Insured: Evans, Robert
Date of Loss: 05/21/2024

LINE ITEMS - EXTERIOR ROOFING

1. Remove composition shingles          2,450 SF    $1.25    $3,062.50
2. Install laminated composition shingles 2,450 SF   $3.75    $9,187.50
3. Hip/Ridge cap - Standard profile     6 LF        $42.90   $257.40
4. Starter strip - Universal            180 LF      $2.15    $387.00
5. Drip edge - Aluminum                 85 LF       $3.25    $276.25

TOTAL ROOFING: $13,170.65
`;

const SAMPLE_ROOF_REPORT_TEXT = `
EAGLEVIEW ROOF REPORT

Property: 123 Main Street, Dallas, TX 75201
Report Date: 05/21/2024

ROOF MEASUREMENTS:
Total Roof Area: 2,450 SF
Roofing Squares: 24.5

LINEAR MEASUREMENTS:
Ridges: 26 LF
Hips: 93 LF
Total Ridge/Hip: 119 LF
Eaves: 180 LF
Rakes: 85 LF
Valleys: 42 LF

ROOF CHARACTERISTICS:
Predominant Pitch: 8:12
Number of Stories: 2
Roof Type: Gable with Hip sections
`;

async function testRidgeCapPipeline() {
  console.log('🧪 Testing Ridge Cap Analysis Pipeline\n');
  
  try {
    // Step 1: Test Line Item Extraction
    console.log('📋 Step 1: Testing Line Item Extraction');
    console.log('=====================================');
    
    const lineItemResult = await claudeLineItemExtractor.extractLineItems(
      SAMPLE_ESTIMATE_TEXT,
      [SAMPLE_ESTIMATE_TEXT],
      'test-job-001'
    );
    
    console.log(`✅ Found ${lineItemResult.lineItems.length} total line items`);
    console.log(`🏠 Roof type: ${lineItemResult.roofType.roofType} (${Math.round(lineItemResult.roofType.confidence * 100)}% confidence)`);
    console.log(`🔧 Ridge cap items: ${lineItemResult.ridgeCapItems.length}`);
    
    if (lineItemResult.ridgeCapItems.length > 0) {
      const ridgeItem = lineItemResult.ridgeCapItems[0];
      console.log(`   └─ ${ridgeItem.description}`);
      console.log(`   └─ Quantity: ${ridgeItem.quantity.value} ${ridgeItem.quantity.unit}`);
      console.log(`   └─ Quality: ${ridgeItem.ridgeCapQuality}`);
      console.log(`   └─ Unit Price: $${ridgeItem.unitPrice}`);
    }
    
    console.log(`💰 Extraction cost: $${lineItemResult.cost.toFixed(4)}\n`);
    
    // Step 2: Test Measurement Extraction
    console.log('📏 Step 2: Testing Measurement Extraction');
    console.log('=========================================');
    
    const measurementResult = await claudeMeasurementExtractor.extractMeasurements(
      SAMPLE_ROOF_REPORT_TEXT,
      [SAMPLE_ROOF_REPORT_TEXT],
      'test-job-001'
    );
    
    console.log(`✅ Ridge length: ${measurementResult.measurements.ridgeLength} LF`);
    console.log(`✅ Hip length: ${measurementResult.measurements.hipLength} LF`);
    console.log(`✅ Total ridge/hip: ${measurementResult.measurements.totalRidgeHip} LF`);
    console.log(`✅ Total roof area: ${measurementResult.measurements.totalRoofArea} SF`);
    console.log(`✅ Confidence: ${Math.round((measurementResult.measurements.confidence || 0) * 100)}%`);
    
    if (measurementResult.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${measurementResult.warnings.join(', ')}`);
    }
    
    console.log(`💰 Extraction cost: $${measurementResult.cost.toFixed(4)}\n`);
    
    // Step 3: Test Ridge Cap Analysis
    console.log('🏠 Step 3: Testing Ridge Cap Business Rule Analysis');
    console.log('==================================================');
    
    const analysisInput = {
      lineItems: lineItemResult.lineItems,
      ridgeCapItems: lineItemResult.ridgeCapItems,
      roofMeasurements: measurementResult.measurements,
      roofType: lineItemResult.roofType,
      jobId: 'test-job-001'
    };
    
    const analysisResult = await ridgeCapAnalyzer.analyzeRidgeCapCompliance(analysisInput);
    
    console.log(`✅ Analysis status: ${analysisResult.status}`);
    console.log(`✅ Analysis path: ${analysisResult.analysisPath}`);
    console.log(`✅ Material status: ${analysisResult.materialStatus}`);
    console.log(`✅ Confidence: ${Math.round(analysisResult.confidence * 100)}%`);
    console.log(`✅ Estimate quantity: ${analysisResult.estimateQuantity}`);
    console.log(`✅ Required quantity: ${analysisResult.requiredQuantity}`);
    console.log(`✅ Variance: ${analysisResult.variance} (${analysisResult.varianceType})`);
    console.log(`✅ Cost impact: $${analysisResult.costImpact.toFixed(2)}`);
    
    console.log('\n📝 Reasoning:');
    console.log(analysisResult.reasoning);
    
    if (analysisResult.supplementRecommendation) {
      console.log('\n💡 Supplement Recommendation:');
      console.log(analysisResult.supplementRecommendation);
    }
    
    console.log('\n📄 Documentation Note:');
    console.log(analysisResult.documentationNote);
    
    // Step 4: Test Data Mapping to UI Format
    console.log('\n🎨 Step 4: Testing Data Mapping to UI Format');
    console.log('============================================');
    
    // Simulate database job structure
    const mockDatabaseJob = {
      id: 'test-job-001',
      customerName: 'Evans, Robert',
      customerAddress: '123 Main Street, Dallas, TX 75201',
      carrier: 'Test Insurance',
      claimNumber: '1354565-242889-014101',
      dateOfLoss: '2024-05-21',
      originalEstimate: 13170.65,
      status: 'ANALYSIS_READY',
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ridgeHipLength: measurementResult.measurements.totalRidgeHip,
      extractedLineItems: lineItemResult.lineItems,
      mistralExtractions: [{
        id: 'ext-001',
        jobId: 'test-job-001',
        extractedFields: {
          lineItems: lineItemResult.lineItems,
          roofMeasurements: measurementResult.measurements,
          roofType: lineItemResult.roofType
        },
        extractedAt: new Date().toISOString()
      }]
    };
    
    // Convert analysis result to RuleAnalysisResult format
    const mockRuleAnalysisResult = {
      ruleName: 'ridge_cap',
      status: analysisResult.status,
      confidence: analysisResult.confidence,
      reasoning: analysisResult.reasoning,
      costImpact: analysisResult.costImpact,
      estimateQuantity: analysisResult.estimateQuantity,
      requiredQuantity: analysisResult.requiredQuantity,
      variance: analysisResult.variance,
      varianceType: analysisResult.varianceType,
      materialStatus: analysisResult.materialStatus,
      currentSpecification: analysisResult.currentSpecification
    };
    
    const uiData = mapDatabaseToRidgeCapData(mockDatabaseJob as any, mockRuleAnalysisResult as any);
    
    console.log('✅ UI Data Mapping Results:');
    console.log(`   Estimate Quantity: ${uiData.estimateQuantity}`);
    console.log(`   Required Quantity: ${uiData.requiredQuantity}`);
    console.log(`   Ridge Length: ${uiData.ridgeLength} LF`);
    console.log(`   Hip Length: ${uiData.hipLength} LF`);
    console.log(`   Variance: ${uiData.variance}`);
    console.log(`   Cost Impact: $${uiData.costImpact?.toFixed(2)}`);
    console.log(`   Confidence: ${Math.round((uiData.confidence || 0) * 100)}%`);
    console.log(`   Roof Type: ${uiData.roofType}`);
    console.log(`   Ridge Cap Type: ${uiData.ridgeCapType}`);
    console.log(`   Compliance Status: ${uiData.complianceStatus}`);
    
    // Step 5: Summary
    console.log('\n🎯 Pipeline Test Summary');
    console.log('========================');
    console.log(`✅ Line Item Extraction: ${lineItemResult.lineItems.length} items found`);
    console.log(`✅ Ridge Cap Detection: ${lineItemResult.ridgeCapItems.length} ridge cap items`);
    console.log(`✅ Roof Type Classification: ${lineItemResult.roofType.roofType}`);
    console.log(`✅ Measurement Extraction: ${measurementResult.measurements.totalRidgeHip} LF total`);
    console.log(`✅ Business Rule Analysis: ${analysisResult.status}`);
    console.log(`✅ UI Data Mapping: Complete`);
    
    const totalCost = lineItemResult.cost + measurementResult.cost;
    console.log(`💰 Total API Cost: $${totalCost.toFixed(4)}`);
    
    if (analysisResult.status === 'SUPPLEMENT_NEEDED') {
      console.log(`💡 Supplement Value: $${analysisResult.costImpact.toFixed(2)}`);
      console.log(`📊 ROI: ${((analysisResult.costImpact / totalCost) - 1).toFixed(0)}x`);
    }
    
    console.log('\n🎉 Pipeline test completed successfully!');
    
    return {
      lineItemResult,
      measurementResult,
      analysisResult,
      uiData,
      totalCost
    };
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    throw error;
  }
}

// Export test function
export { testRidgeCapPipeline };

// Run test if called directly
if (require.main === module) {
  testRidgeCapPipeline()
    .then(results => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}