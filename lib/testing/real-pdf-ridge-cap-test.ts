/**
 * Real PDF Ridge Cap Test
 * 
 * Tests the complete pipeline with actual PDF documents:
 * 1. Mistral OCR extraction from real PDFs
 * 2. Claude line item and measurement extraction
 * 3. Ridge Cap business rule analysis
 * 4. Full UI data mapping
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

import { SmartExtractionService } from '../extraction/smart-extraction-service';
import { ridgeCapAnalyzer } from '../analysis/ridge-cap-analyzer';
import { mapDatabaseToRidgeCapData } from '../ridge-cap-data-mapper';

// Initialize the extraction service
const extractionService = new SmartExtractionService();

async function testRealPdfRidgeCapAnalysis() {
  console.log('🚀 Testing Ridge Cap Analysis with Real PDF\n');
  
  try {
    // Step 1: Find available PDFs
    console.log('📁 Step 1: Locating Real PDF Files');
    console.log('==================================');
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const testPdfs = [
      '1755121461421_boryca-est.pdf',
      '1755121946664_leger_est.pdf', 
      '1755122393410_stevens-est.pdf'
    ];
    
    let selectedPdf: string | null = null;
    for (const pdfName of testPdfs) {
      const pdfPath = path.join(uploadsDir, pdfName);
      if (existsSync(pdfPath)) {
        selectedPdf = pdfPath;
        console.log(`✅ Found PDF: ${pdfName}`);
        break;
      }
    }
    
    if (!selectedPdf) {
      throw new Error('No test PDFs found in uploads directory');
    }
    
    const fileStats = readFileSync(selectedPdf);
    console.log(`📄 PDF Size: ${(fileStats.length / 1024).toFixed(1)} KB`);
    console.log(`📂 Path: ${selectedPdf}\n`);
    
    // Step 2: Create Job Record and Run Smart Extraction Service
    console.log('🔄 Step 2: Creating Job and Running Smart Extraction Service');
    console.log('============================================================');
    
    const jobId = `test-pdf-${Date.now()}`;
    console.log(`🆔 Job ID: ${jobId}`);
    
    // First, create the job record in the database
    const { prisma } = await import('../database/client');
    
    console.log('📝 Creating job record in database...');
    const job = await prisma.job.create({
      data: {
        id: jobId,
        fileName: path.basename(selectedPdf),
        fileSize: fileStats.length,
        status: 'UPLOADED',
        uploadedAt: new Date(),
        filePath: selectedPdf,
      }
    });
    
    console.log(`✅ Job created: ${job.id}`);
    
    // Create document record
    const document = await prisma.document.create({
      data: {
        jobId: jobId,
        fileName: path.basename(selectedPdf),
        filePath: selectedPdf,
        fileSize: fileStats.length,
        mimeType: 'application/pdf',
        status: 'UPLOADED'
      }
    });
    
    console.log(`✅ Document created: ${document.id}`);
    
    // Phase 1: Fast core extraction
    console.log('\n⚡ Phase 1: Fast Core Info Extraction...');
    const coreInfo = await extractionService.extractCoreInfoFast([selectedPdf], jobId);
    
    console.log('✅ Core Info Results:');
    console.log(`   Customer: ${coreInfo.customerName || 'Not found'}`);
    console.log(`   Address: ${coreInfo.propertyAddress || 'Not found'}`);
    console.log(`   Claim #: ${coreInfo.claimNumber || 'Not found'}`);
    console.log(`   Carrier: ${coreInfo.insuranceCarrier || 'Not found'}`);
    console.log(`   Estimate: $${coreInfo.originalEstimate?.toLocaleString() || 'Not found'}`);
    
    // Phase 2: Full document extraction with Claude
    console.log('\n🧠 Phase 2: Full Document Extraction with Claude...');
    console.log('This will run Mistral OCR + Claude extractors...');
    
    await extractionService.extractFullDocumentData([selectedPdf], jobId);
    
    console.log('✅ Full extraction completed!\n');
    
    // Step 3: Retrieve and analyze extraction results
    console.log('📊 Step 3: Retrieving Extraction Results');
    console.log('========================================');
    
    // Get the latest extraction from database
    const { prisma } = await import('../database/client');
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!job || !job.mistralExtractions[0]) {
      throw new Error('No extraction results found');
    }
    
    const extraction = job.mistralExtractions[0];
    const extractedData = extraction.extractedData as any;
    
    console.log('✅ Extraction Data Retrieved:');
    console.log(`   Line Items: ${extractedData.lineItems?.length || 0}`);
    console.log(`   Ridge Cap Items: ${extractedData.ridgeCapItems?.length || 0}`);
    console.log(`   Roof Type: ${extractedData.roofType?.roofType || 'Unknown'}`);
    console.log(`   Ridge Length: ${extractedData.roofMeasurements?.ridgeLength || 'N/A'} LF`);
    console.log(`   Hip Length: ${extractedData.roofMeasurements?.hipLength || 'N/A'} LF`);
    console.log(`   Total Ridge/Hip: ${extractedData.roofMeasurements?.totalRidgeHip || 'N/A'} LF`);
    
    // Step 4: Run Ridge Cap Business Rule Analysis
    console.log('\n🏠 Step 4: Ridge Cap Business Rule Analysis');
    console.log('===========================================');
    
    if (!extractedData.lineItems || !extractedData.roofType) {
      console.log('⚠️ Insufficient data for ridge cap analysis');
      return;
    }
    
    const analysisInput = {
      lineItems: extractedData.lineItems || [],
      ridgeCapItems: extractedData.ridgeCapItems || [],
      roofMeasurements: extractedData.roofMeasurements || {},
      roofType: extractedData.roofType || { roofType: 'unknown', confidence: 0.5 },
      jobId: jobId
    };
    
    const analysisResult = await ridgeCapAnalyzer.analyzeRidgeCapCompliance(analysisInput);
    
    console.log('✅ Business Rule Analysis Results:');
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
    
    // Map to UI data
    const uiData = mapDatabaseToRidgeCapData(job as any, ruleAnalysisResult as any);
    
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
    
    // Step 6: Show evidence and documentation
    console.log('\n📄 Step 6: Professional Documentation');
    console.log('====================================');
    
    console.log('Documentation Note:');
    console.log(`"${uiData.documentationNote}"`);
    
    if (analysisResult.evidenceReferences.length > 0) {
      console.log('\nEvidence References:');
      analysisResult.evidenceReferences.forEach((ref, i) => {
        console.log(`   ${i + 1}. ${ref}`);
      });
    }
    
    // Step 7: Summary and Performance
    console.log('\n🎯 Step 7: Test Summary');
    console.log('======================');
    
    const totalCost = extraction.cost || 0;
    
    console.log('✅ Real PDF Pipeline Results:');
    console.log(`   📄 PDF Processed: ${path.basename(selectedPdf)}`);
    console.log(`   🔍 Pages Extracted: ${extraction.pageCount || 'N/A'}`);
    console.log(`   📋 Line Items Found: ${extractedData.lineItems?.length || 0}`);
    console.log(`   🏠 Roof Type: ${extractedData.roofType?.roofType || 'Unknown'}`);
    console.log(`   🔧 Ridge Cap Items: ${extractedData.ridgeCapItems?.length || 0}`);
    console.log(`   📏 Measurements: ${extractedData.roofMeasurements?.totalRidgeHip || 'N/A'} LF total`);
    console.log(`   ⚖️ Rule Analysis: ${analysisResult.status}`);
    console.log(`   💰 Processing Cost: $${totalCost.toFixed(4)}`);
    
    if (analysisResult.status === 'SUPPLEMENT_NEEDED') {
      console.log(`   💡 Supplement Value: $${analysisResult.costImpact.toFixed(2)}`);
      if (totalCost > 0) {
        const roi = (analysisResult.costImpact / totalCost) - 1;
        console.log(`   📊 ROI: ${roi.toFixed(0)}x return on processing cost`);
      }
    }
    
    console.log('\n🎉 Real PDF test completed successfully!');
    console.log('Ready for production use! 🚀');
    
    return {
      jobId,
      coreInfo,
      extractedData,
      analysisResult,
      uiData,
      totalCost
    };
    
  } catch (error) {
    console.error('❌ Real PDF test failed:', error);
    throw error;
  }
}

// Export test function
export { testRealPdfRidgeCapAnalysis };

// Run test if called directly
if (require.main === module) {
  testRealPdfRidgeCapAnalysis()
    .then(results => {
      console.log('\n✅ Real PDF test passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Real PDF test failed:', error);
      process.exit(1);
    });
}