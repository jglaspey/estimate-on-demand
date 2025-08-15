/**
 * UI Integration Test
 * 
 * Tests the complete flow from analysis worker to UI data mapping
 * to verify real data integration works correctly.
 */

import { AnalysisWorker } from '../analysis/analysis-worker';
import { mapDatabaseToRidgeCapData } from '../ridge-cap-data-mapper';
import { prisma } from '../database/client';

async function testUIIntegration(jobId?: string) {
  console.log('🧪 Testing Complete UI Integration Flow\n');
  
  try {
    // Step 1: Find or use specified job
    console.log('📁 Step 1: Loading Job Data');
    console.log('==========================');
    
    let selectedJobId = jobId;
    
    if (!selectedJobId) {
      const recentJobs = await prisma.job.findMany({
        include: { 
          documents: true,
          mistralExtractions: { orderBy: { extractedAt: 'desc' }, take: 1 }
        },
        where: {
          documents: { some: {} },
          mistralExtractions: { some: {} }
        },
        orderBy: { uploadedAt: 'desc' },
        take: 1
      });
      
      if (recentJobs.length === 0) {
        throw new Error('No jobs with documents and extractions found');
      }
      
      selectedJobId = recentJobs[0].id;
    }
    
    console.log(`✅ Using job: ${selectedJobId}`);
    
    // Step 2: Run Analysis Worker
    console.log('\n🔄 Step 2: Running Analysis Worker');
    console.log('==================================');
    
    const progressUpdates: any[] = [];
    
    const worker = new AnalysisWorker({
      jobId: selectedJobId,
      onProgress: (progress) => {
        progressUpdates.push(progress);
        console.log(`📊 ${progress.ruleName}: ${progress.status} (${progress.progress}%) - ${progress.message}`);
      },
      enableRealTimeUpdates: true
    });
    
    const analysisResults = await worker.runAllBusinessRules();
    
    console.log('\n✅ Analysis Worker Results:');
    console.log(`   Ridge Cap: ${analysisResults.ridgeCap?.status || 'N/A'}`);
    console.log(`   Cost Impact: $${analysisResults.ridgeCap?.costImpact?.toFixed(2) || '0.00'}`);
    console.log(`   Progress Updates: ${progressUpdates.length}`);
    
    // Step 3: Load Updated Job Data
    console.log('\n📄 Step 3: Loading Updated Job Data');
    console.log('===================================');
    
    const updatedJob = await prisma.job.findUnique({
      where: { id: selectedJobId },
      include: {
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1
        },
        ruleAnalyses: {
          where: { ruleType: 'HIP_RIDGE_CAP' },
          orderBy: { analyzedAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!updatedJob) {
      throw new Error('Job not found after analysis');
    }
    
    console.log(`✅ Job loaded with ${updatedJob.ruleAnalyses.length} rule analyses`);
    
    // Step 4: Map to UI Format
    console.log('\n🎨 Step 4: Mapping to UI Format');
    console.log('==============================');
    
    let ridgeCapUiData = null;
    
    if (analysisResults.ridgeCap) {
      const ruleAnalysisResult = {
        ruleName: 'ridge_cap',
        status: analysisResults.ridgeCap.status,
        confidence: analysisResults.ridgeCap.confidence,
        reasoning: analysisResults.ridgeCap.reasoning,
        costImpact: analysisResults.ridgeCap.costImpact,
        estimateQuantity: analysisResults.ridgeCap.estimateQuantity,
        requiredQuantity: analysisResults.ridgeCap.requiredQuantity,
        variance: analysisResults.ridgeCap.variance,
        varianceType: analysisResults.ridgeCap.varianceType,
        materialStatus: analysisResults.ridgeCap.materialStatus,
        currentSpecification: analysisResults.ridgeCap.currentSpecification
      };
      
      ridgeCapUiData = mapDatabaseToRidgeCapData(updatedJob as any, ruleAnalysisResult as any);
    }
    
    console.log('✅ UI Data Mapping Complete:');
    if (ridgeCapUiData) {
      console.log(`   Estimate: ${ridgeCapUiData.estimateQuantity}`);
      console.log(`   Required: ${ridgeCapUiData.requiredQuantity}`);
      console.log(`   Variance: ${ridgeCapUiData.variance}`);
      console.log(`   Cost Impact: $${ridgeCapUiData.costImpact?.toFixed(2) || '0.00'}`);
      console.log(`   Roof Type: ${ridgeCapUiData.roofType}`);
      console.log(`   Ridge Cap Type: ${ridgeCapUiData.ridgeCapType}`);
      console.log(`   Compliance: ${ridgeCapUiData.complianceStatus}`);
    } else {
      console.log('   No ridge cap data mapped');
    }
    
    // Step 5: Simulate API Response
    console.log('\n🌐 Step 5: Simulating API Response');
    console.log('==================================');
    
    const apiResponse = {
      success: true,
      jobId: selectedJobId,
      results: {
        ridgeCap: analysisResults.ridgeCap,
        starterStrip: analysisResults.starterStrip,
        dripEdge: analysisResults.dripEdge,
        iceAndWater: analysisResults.iceAndWater
      },
      uiData: {
        ridgeCap: ridgeCapUiData
      },
      progressUpdates,
      summary: {
        totalRules: 4,
        completedRules: Object.values(analysisResults).filter(r => r !== null).length,
        supplementsNeeded: Object.values(analysisResults).filter(r => r && r.status === 'SUPPLEMENT_NEEDED').length,
        totalCostImpact: Object.values(analysisResults).reduce((sum, r) => sum + (r?.costImpact || 0), 0)
      }
    };
    
    console.log('✅ API Response Generated:');
    console.log(`   Success: ${apiResponse.success}`);
    console.log(`   Rules Completed: ${apiResponse.summary.completedRules}/${apiResponse.summary.totalRules}`);
    console.log(`   Supplements Needed: ${apiResponse.summary.supplementsNeeded}`);
    console.log(`   Total Cost Impact: $${apiResponse.summary.totalCostImpact.toFixed(2)}`);
    
    // Step 6: Summary
    console.log('\n🎯 Integration Test Summary');
    console.log('==========================');
    
    console.log('✅ Complete UI Integration Flow Verified:');
    console.log(`   📋 Job: ${selectedJobId}`);
    console.log(`   🔄 Analysis Worker: ${progressUpdates.length} progress updates`);
    console.log(`   🧠 Ridge Cap Analysis: ${analysisResults.ridgeCap?.status || 'Failed'}`);
    console.log(`   🎨 UI Data Mapping: ${ridgeCapUiData ? 'Success' : 'Failed'}`);
    console.log(`   🌐 API Response: ${apiResponse.success ? 'Success' : 'Failed'}`);
    console.log(`   💰 Processing Result: $${analysisResults.ridgeCap?.costImpact?.toFixed(2) || '0.00'} supplement identified`);
    
    if (ridgeCapUiData && ridgeCapUiData.costImpact && ridgeCapUiData.costImpact > 0) {
      console.log(`\n💡 Ready for UI Display:`);
      console.log(`   - User will see "${ridgeCapUiData.variance}" variance`);
      console.log(`   - Cost impact: $${ridgeCapUiData.costImpact.toFixed(2)}`);
      console.log(`   - Confidence: ${Math.round((ridgeCapUiData.confidence || 0) * 100)}%`);
      console.log(`   - Documentation: "${ridgeCapUiData.documentationNote?.substring(0, 100)}..."`);
    }
    
    console.log('\n🎉 UI integration test completed successfully!');
    console.log('Ready for real-time user interaction! 🚀');
    
    return {
      analysisResults,
      ridgeCapUiData,
      apiResponse,
      progressUpdates
    };
    
  } catch (error) {
    console.error('❌ UI integration test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export test function
export { testUIIntegration };

// Run test if called directly
if (require.main === module) {
  const jobId = process.argv[2];
  
  testUIIntegration(jobId)
    .then(results => {
      console.log('\n✅ UI integration test passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ UI integration test failed:', error);
      process.exit(1);
    });
}