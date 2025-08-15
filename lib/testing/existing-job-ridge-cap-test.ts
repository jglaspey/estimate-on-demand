/**
 * Existing Job Ridge Cap Test
 * 
 * Tests the Ridge Cap analysis pipeline using an existing job
 * with real uploaded documents and extractions.
 */

import { ridgeCapAnalyzer } from '../analysis/ridge-cap-analyzer';
import { mapDatabaseToRidgeCapData } from '../ridge-cap-data-mapper';
import { prisma } from '../database/client';
import { claudeLineItemExtractor } from '../extraction/claude-line-item-extractor';
import { claudeMeasurementExtractor } from '../extraction/claude-measurement-extractor';

async function testExistingJobRidgeCapAnalysis(jobId?: string) {
  console.log('🚀 Testing Ridge Cap Analysis with Existing Job\n');
  
  try {
    // Step 1: Get existing job from database
    console.log('📁 Step 1: Loading Existing Job from Database');
    console.log('=============================================');
    
    // Use provided jobId or find the most recent job with documents
    let selectedJobId = jobId;
    
    if (!selectedJobId) {
      const recentJobs = await prisma.job.findMany({
        include: { 
          documents: true,
          mistralExtractions: { orderBy: { extractedAt: 'desc' }, take: 1 }
        },
        where: {
          documents: { some: {} } // Has at least one document
        },
        orderBy: { uploadedAt: 'desc' },
        take: 1
      });
      
      if (recentJobs.length === 0) {
        throw new Error('No jobs with documents found');
      }
      
      selectedJobId = recentJobs[0].id;
    }
    
    // Load the full job with all relations
    const job = await prisma.job.findUnique({
      where: { id: selectedJobId },
      include: {
        documents: {
          include: {
            pages: { orderBy: { pageNumber: 'asc' } }
          }
        },
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
    
    if (!job) {
      throw new Error(`Job ${selectedJobId} not found`);
    }
    
    console.log(`✅ Loaded Job: ${job.id}`);
    console.log(`   Customer: ${job.customerName || 'Unknown'}`);
    console.log(`   Files: ${job.fileName}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Documents: ${job.documents.length}`);
    console.log(`   Pages: ${job.documents.reduce((sum, doc) => sum + doc.pages.length, 0)}`);
    console.log(`   Existing Extractions: ${job.mistralExtractions.length}`);
    console.log(`   Existing Rule Analyses: ${job.ruleAnalyses.length}\n`);
    
    // Step 2: Get document text for fresh extraction
    console.log('📄 Step 2: Gathering Document Content');
    console.log('=====================================');
    
    let estimateText = '';
    let roofReportText = '';
    const allPages: string[] = [];
    
    for (const document of job.documents) {
      console.log(`📄 Processing ${document.fileName}...`);
      
      const isEstimate = document.fileName.toLowerCase().includes('estimate') || 
                        document.fileName.toLowerCase().includes('est');
      
      const isRoofReport = document.fileName.toLowerCase().includes('roof') ||
                          document.fileName.toLowerCase().includes('report');
      
      // Combine all page text for this document
      const documentText = document.pages
        .map(page => {
          // Try to get markdownText, fall back to extractedContent
          if (typeof page.extractedContent === 'object' && page.extractedContent !== null) {
            const content = page.extractedContent as any;
            return content.markdownText || content.text || JSON.stringify(content);
          }
          return page.rawText || '';
        })
        .join('\n\n');
      
      allPages.push(documentText);
      
      if (isEstimate) {
        estimateText += documentText + '\n\n';
        console.log(`   ✅ Added to estimate text (${documentText.length} chars)`);
      }
      
      if (isRoofReport) {
        roofReportText += documentText + '\n\n';
        console.log(`   ✅ Added to roof report text (${documentText.length} chars)`);
      }
    }
    
    console.log(`📊 Total content: ${estimateText.length + roofReportText.length} characters\n`);
    
    // Step 3: Run fresh Claude extractions
    console.log('🧠 Step 3: Running Fresh Claude Extractions');
    console.log('============================================');
    
    let lineItemResult;
    let measurementResult;
    
    if (estimateText.trim()) {
      console.log('📋 Extracting line items from estimate...');
      lineItemResult = await claudeLineItemExtractor.extractLineItems(
        estimateText,
        allPages,
        job.id
      );
      
      console.log(`✅ Line Item Extraction:`);
      console.log(`   Total Items: ${lineItemResult.lineItems.length}`);
      console.log(`   Ridge Cap Items: ${lineItemResult.ridgeCapItems.length}`);
      console.log(`   Roof Type: ${lineItemResult.roofType.roofType} (${Math.round(lineItemResult.roofType.confidence * 100)}% confidence)`);
      console.log(`   Cost: $${lineItemResult.cost.toFixed(4)}`);
      
      if (lineItemResult.ridgeCapItems.length > 0) {
        const item = lineItemResult.ridgeCapItems[0];
        console.log(`   Ridge Cap: ${item.quantity.value} ${item.quantity.unit} - ${item.description}`);
        console.log(`   Quality: ${item.ridgeCapQuality}`);
      }
    } else {
      console.log('⚠️ No estimate text found, skipping line item extraction');
    }
    
    if (roofReportText.trim()) {
      console.log('\n📏 Extracting measurements from roof report...');
      measurementResult = await claudeMeasurementExtractor.extractMeasurements(
        roofReportText,
        allPages,
        job.id
      );
      
      console.log(`✅ Measurement Extraction:`);
      console.log(`   Ridge Length: ${measurementResult.measurements.ridgeLength || 'N/A'} LF`);
      console.log(`   Hip Length: ${measurementResult.measurements.hipLength || 'N/A'} LF`);
      console.log(`   Total Ridge/Hip: ${measurementResult.measurements.totalRidgeHip || 'N/A'} LF`);
      console.log(`   Total Area: ${measurementResult.measurements.totalRoofArea || 'N/A'} SF`);
      console.log(`   Confidence: ${Math.round((measurementResult.measurements.confidence || 0) * 100)}%`);
      console.log(`   Cost: $${measurementResult.cost.toFixed(4)}`);
      
      if (measurementResult.warnings.length > 0) {
        console.log(`   ⚠️ Warnings: ${measurementResult.warnings.join(', ')}`);
      }
    } else {
      console.log('⚠️ No roof report text found, skipping measurement extraction');
    }
    
    // Step 4: Run Ridge Cap Business Rule Analysis
    console.log('\n🏠 Step 4: Ridge Cap Business Rule Analysis');
    console.log('===========================================');
    
    if (!lineItemResult && !measurementResult) {
      throw new Error('No extraction data available for analysis');
    }
    
    const analysisInput = {
      lineItems: lineItemResult?.lineItems || [],
      ridgeCapItems: lineItemResult?.ridgeCapItems || [],
      roofMeasurements: measurementResult?.measurements || {
        ridgeLength: null,
        hipLength: null,
        totalRidgeHip: null,
        confidence: 0.5,
        sourcePages: [],
        extractedFrom: 'other' as const
      },
      roofType: lineItemResult?.roofType || {
        roofType: 'laminated' as const,
        confidence: 0.5,
        reasoning: 'Default assumption',
        evidence: []
      },
      jobId: job.id
    };
    
    const analysisResult = await ridgeCapAnalyzer.analyzeRidgeCapCompliance(analysisInput);
    
    console.log('✅ Ridge Cap Analysis Results:');
    console.log(`   Status: ${analysisResult.status}`);
    console.log(`   Analysis Path: ${analysisResult.analysisPath}`);
    console.log(`   Confidence: ${Math.round(analysisResult.confidence * 100)}%`);
    console.log(`   Material Status: ${analysisResult.materialStatus}`);
    console.log(`   Estimate Quantity: ${analysisResult.estimateQuantity || 'N/A'}`);
    console.log(`   Required Quantity: ${analysisResult.requiredQuantity || 'N/A'}`);
    console.log(`   Variance: ${analysisResult.variance || 'N/A'} (${analysisResult.varianceType})`);
    console.log(`   Cost Impact: $${analysisResult.costImpact.toFixed(2)}`);
    
    console.log('\n📝 Analysis Reasoning:');
    console.log(`"${analysisResult.reasoning}"`);
    
    if (analysisResult.supplementRecommendation) {
      console.log('\n💡 Supplement Recommendation:');
      console.log(`"${analysisResult.supplementRecommendation}"`);
    }
    
    // Step 5: Map to UI Format
    console.log('\n🎨 Step 5: Mapping to UI Format');
    console.log('==============================');
    
    // Create mock rule analysis result for mapping
    const ruleAnalysisResult = {
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
    
    // Create mock database job structure for mapper
    const mockDbJob = {
      id: job.id,
      customerName: job.customerName,
      customerAddress: job.customerAddress,
      carrier: job.carrier,
      claimNumber: job.claimNumber,
      ridgeHipLength: measurementResult?.measurements.totalRidgeHip,
      extractedLineItems: lineItemResult?.lineItems || [],
      mistralExtractions: [{
        extractedFields: {
          lineItems: lineItemResult?.lineItems || [],
          roofMeasurements: measurementResult?.measurements || {},
          roofType: lineItemResult?.roofType || {}
        }
      }]
    };
    
    const uiData = mapDatabaseToRidgeCapData(mockDbJob as any, ruleAnalysisResult as any);
    
    console.log('✅ UI-Ready Data:');
    console.log(`   Estimate Quantity: ${uiData.estimateQuantity}`);
    console.log(`   Required Quantity: ${uiData.requiredQuantity}`);
    console.log(`   Ridge Length: ${uiData.ridgeLength} LF`);
    console.log(`   Hip Length: ${uiData.hipLength} LF`);
    console.log(`   Variance: ${uiData.variance}`);
    console.log(`   Cost Impact: $${uiData.costImpact?.toFixed(2) || '0.00'}`);
    console.log(`   Confidence: ${Math.round((uiData.confidence || 0) * 100)}%`);
    console.log(`   Roof Type: ${uiData.roofType}`);
    console.log(`   Ridge Cap Type: ${uiData.ridgeCapType}`);
    console.log(`   Compliance: ${uiData.complianceStatus}`);
    
    // Step 6: Summary
    console.log('\n🎯 Step 6: Real Document Test Summary');
    console.log('===================================');
    
    const totalCost = (lineItemResult?.cost || 0) + (measurementResult?.cost || 0);
    
    console.log('✅ Real Document Pipeline Results:');
    console.log(`   📋 Job: ${job.customerName} (${job.id})`);
    console.log(`   📄 Documents: ${job.documents.length} (${job.documents.map(d => d.fileName).join(', ')})`);
    console.log(`   📊 Pages Processed: ${job.documents.reduce((sum, doc) => sum + doc.pages.length, 0)}`);
    console.log(`   🔍 Line Items: ${lineItemResult?.lineItems.length || 0}`);
    console.log(`   🏠 Roof Type: ${lineItemResult?.roofType.roofType || 'Unknown'}`);
    console.log(`   🔧 Ridge Cap Items: ${lineItemResult?.ridgeCapItems.length || 0}`);
    console.log(`   📏 Measurements: ${measurementResult?.measurements.totalRidgeHip || 'N/A'} LF`);
    console.log(`   ⚖️ Analysis: ${analysisResult.status}`);
    console.log(`   💰 Processing Cost: $${totalCost.toFixed(4)}`);
    
    if (analysisResult.status === 'SUPPLEMENT_NEEDED') {
      console.log(`   💡 Supplement Value: $${analysisResult.costImpact.toFixed(2)}`);
      if (totalCost > 0) {
        const roi = (analysisResult.costImpact / totalCost);
        console.log(`   📊 ROI: ${roi.toFixed(0)}x processing cost`);
      }
    }
    
    // Step 7: Professional Documentation
    console.log('\n📄 Step 7: Professional Documentation');
    console.log('====================================');
    
    console.log('Documentation Note for Adjuster:');
    console.log(`"${uiData.documentationNote}"`);
    
    if (analysisResult.evidenceReferences.length > 0) {
      console.log('\nEvidence References:');
      analysisResult.evidenceReferences.forEach((ref, i) => {
        console.log(`   ${i + 1}. ${ref}`);
      });
    }
    
    console.log('\n🎉 Real document test completed successfully!');
    console.log('This demonstrates the complete pipeline working with actual insurance documents! 🚀');
    
    return {
      job,
      lineItemResult,
      measurementResult,
      analysisResult,
      uiData,
      totalCost
    };
    
  } catch (error) {
    console.error('❌ Real document test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export test function
export { testExistingJobRidgeCapAnalysis };

// Run test if called directly
if (require.main === module) {
  // You can pass a specific job ID as argument, or it will use the most recent
  const jobId = process.argv[2];
  
  testExistingJobRidgeCapAnalysis(jobId)
    .then(results => {
      console.log('\n✅ Real document test passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Real document test failed:', error);
      process.exit(1);
    });
}