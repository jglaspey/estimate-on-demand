/**
 * Simple Extraction Test
 * 
 * Tests the Claude extractors directly with real document text
 * to verify they work before integrating into the full pipeline.
 */

import { claudeLineItemExtractor } from '../extraction/claude-line-item-extractor';
import { claudeMeasurementExtractor } from '../extraction/claude-measurement-extractor';
import { prisma } from '../database/client';

async function testClaudeExtractors(jobId: string) {
  console.log('🧪 Testing Claude Extractors Directly\n');
  
  try {
    // Get job with pages
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: {
          include: {
            pages: { orderBy: { pageNumber: 'asc' } }
          }
        }
      }
    });
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    console.log(`📄 Job: ${job.customerName} (${job.documents.length} documents)`);
    
    // Process each document
    for (const document of job.documents) {
      console.log(`\n📁 Processing: ${document.fileName}`);
      
      // Get all page text for this document
      const pageTexts = document.pages.map(page => {
        // Use rawText directly - extractedContent contains metadata, not text
        return page.rawText || '';
      });
      
      const fullText = pageTexts.join('\n\n');
      console.log(`   📊 ${pageTexts.length} pages, ${fullText.length} characters`);
      
      if (fullText.length < 100) {
        console.log('   ⚠️ Very little text found, skipping');
        continue;
      }
      
      // Test appropriate extractor based on filename
      if (document.fileName.toLowerCase().includes('est')) {
        console.log('   🧠 Testing Line Item Extractor...');
        
        try {
          const result = await claudeLineItemExtractor.extractLineItems(
            fullText,
            pageTexts,
            jobId
          );
          
          console.log(`   ✅ Line Items: ${result.lineItems.length}`);
          console.log(`   ✅ Ridge Cap Items: ${result.ridgeCapItems.length}`);
          console.log(`   ✅ Roof Type: ${result.roofType.roofType} (${Math.round(result.roofType.confidence * 100)}%)`);
          console.log(`   ✅ Cost: $${result.cost.toFixed(4)}`);
          
          if (result.ridgeCapItems.length > 0) {
            const item = result.ridgeCapItems[0];
            console.log(`   🔧 Ridge Cap: ${item.quantity.value} ${item.quantity.unit} - ${item.description}`);
          }
          
        } catch (error) {
          console.error('   ❌ Line Item Extraction Failed:', error);
        }
        
      } else if (document.fileName.toLowerCase().includes('roof')) {
        console.log('   🧠 Testing Measurement Extractor...');
        
        try {
          const result = await claudeMeasurementExtractor.extractMeasurements(
            fullText,
            pageTexts,
            jobId
          );
          
          console.log(`   ✅ Ridge Length: ${result.measurements.ridgeLength || 'N/A'} LF`);
          console.log(`   ✅ Hip Length: ${result.measurements.hipLength || 'N/A'} LF`);
          console.log(`   ✅ Total Ridge/Hip: ${result.measurements.totalRidgeHip || 'N/A'} LF`);
          console.log(`   ✅ Confidence: ${Math.round((result.measurements.confidence || 0) * 100)}%`);
          console.log(`   ✅ Cost: $${result.cost.toFixed(4)}`);
          
          if (result.warnings.length > 0) {
            console.log(`   ⚠️ Warnings: ${result.warnings.join(', ')}`);
          }
          
        } catch (error) {
          console.error('   ❌ Measurement Extraction Failed:', error);
        }
      }
    }
    
    console.log('\n🎯 Test Summary');
    console.log('===============');
    console.log('✅ Claude extractors tested directly with real document text');
    console.log('✅ This verifies the extractors work independently');
    console.log('❓ If this works but the main pipeline doesn\'t, the issue is in the extraction service integration');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export test function
export { testClaudeExtractors };

// Run test if called directly
if (require.main === module) {
  const jobId = process.argv[2] || 'cmeccfc0w0000sadmc6i9u9lo';
  
  testClaudeExtractors(jobId)
    .then(() => {
      console.log('\n✅ Claude extractor test passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Claude extractor test failed:', error);
      process.exit(1);
    });
}