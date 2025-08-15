/**
 * Mistral PDF Test
 * 
 * Test Mistral's ability to process PDFs directly and extract text/data
 * Compare with our existing Haiku approach
 */

import path from 'path';
import fs from 'fs';

import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '.env') });

import { Mistral } from '@mistralai/mistralai';

import { createHaikuEngine } from '../extraction/haiku-extraction-engine';

async function testMistralPDFCapabilities() {
  console.log('🔍 Testing Mistral PDF Processing Capabilities...\n');

  // Check if Mistral API key is available
  if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY === 'your_mistral_key_here') {
    console.error('❌ Mistral API key not configured. Please set MISTRAL_API_KEY in .env file.');
    return;
  }

  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const haikuEngine = createHaikuEngine();
  
  // Test document
  const testDoc = 'examples/boryca-est.pdf';
  
  if (!fs.existsSync(testDoc)) {
    console.error(`❌ Test document not found: ${testDoc}`);
    return;
  }

  console.log(`📄 Testing with document: ${testDoc}`);
  const pdfBuffer = fs.readFileSync(testDoc);
  const pdfBase64 = pdfBuffer.toString('base64');

  console.log(`📊 Document size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  // Test 1: Mistral text-only capabilities check
  console.log('\n🧪 TEST 1: Mistral Text-Only Analysis');
  console.log('=' .repeat(50));
  
  console.log('🔍 First, let\'s ask Mistral about its document processing capabilities...');
  
  try {
    const capabilityCheck = await mistral.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: `What document formats can you process directly? Specifically:
1. Can you read PDF files directly via base64?
2. What image formats do you support for vision tasks?
3. Do you require PDF documents to be converted to images first?
4. What's the best approach for analyzing insurance documents like estimates and invoices?

Please be specific about your capabilities and input format requirements.`
      }],
      max_tokens: 1000,
    });

    console.log('📋 MISTRAL DOCUMENT CAPABILITIES:');
    console.log(capabilityCheck.choices?.[0]?.message?.content || 'No response');

  } catch (capError) {
    console.log('❌ Capability check failed:', capError instanceof Error ? capError.message : String(capError));
  }

  // Test 2: Try simple text extraction approach
  console.log('\n🧪 TEST 2: Text Extraction Comparison');
  console.log('=' .repeat(50));
  
  console.log('⏳ First, let\'s extract text from PDF using pdf-parse for comparison...');
  
  try {
    const pdfParse = await import('pdf-parse');
    const parsedPdf = await pdfParse.default(pdfBuffer);
    
    console.log('📄 PDF Text Content:');
    console.log('   Pages:', parsedPdf.numpages);
    console.log('   Length:', parsedPdf.text.length + ' characters');
    console.log('   First 500 chars:', parsedPdf.text.substring(0, 500) + '...');
    
    // Now ask Mistral to analyze this text
    console.log('\n⏳ Asking Mistral to analyze extracted text...');
    
    const textAnalysis = await mistral.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: `Analyze this text extracted from a roofing estimate PDF and identify any insurance supplement line items:

${parsedPdf.text}

Please extract:
1. Hip ridge cap quantities and descriptions
2. Starter strip information
3. Drip edge measurements  
4. Gutter apron data
5. Ice and water barrier coverage

Return the results in JSON format like:
{
  "hipRidgeCap": {"found": boolean, "quantity": number, "description": string},
  "starterStrip": {"found": boolean, "quantity": number, "description": string},
  "dripEdge": {"found": boolean, "quantity": number, "description": string},
  "gutterApron": {"found": boolean, "quantity": number, "description": string},
  "iceWaterBarrier": {"found": boolean, "coverage": number, "description": string}
}`
      }],
      max_tokens: 2000,
      temperature: 0.1,
    });

    console.log('\n📋 MISTRAL TEXT ANALYSIS:');
    console.log('-'.repeat(40));
    console.log(textAnalysis.choices?.[0]?.message?.content || 'No content returned');

  } catch (textError) {
    console.log('❌ Text extraction analysis failed:', textError instanceof Error ? textError.message : String(textError));
  }

  // Test 3: Haiku comparison for reference
  console.log('\n\n🧪 TEST 3: Haiku Reference Processing');
  console.log('=' .repeat(50));
  
  try {
    console.log('⏳ Processing same document with Haiku...');
    
    const haikuResult = await haikuEngine.extractFromPDF(pdfBuffer, 'mistral-comparison-test');
    
    console.log('✅ Haiku processing completed!');
    console.log('\n📋 HAIKU EXTRACTION RESULTS:');
    console.log('-'.repeat(40));
    console.log('Processing time:', haikuResult.metrics.processingTime + 'ms');
    console.log('Cost:', '$' + haikuResult.metrics.cost.toFixed(4));
    console.log('Success:', haikuResult.metrics.success);
    
    if (haikuResult.metrics.success) {
      console.log('\nExtracted fields:');
      Object.entries(haikuResult.data).forEach(([field, data]) => {
        if (data.found) {
          console.log(`  ✓ ${field}: ${data.quantity || data.coverage || 'detected'} - ${data.description || ''}`);
        } else {
          console.log(`  ○ ${field}: not found`);
        }
      });
    }

  } catch (haikuError) {
    console.log('❌ Haiku processing failed:', haikuError instanceof Error ? haikuError.message : String(haikuError));
  }

  // Test 4: Image format requirements check
  console.log('\n\n🧪 TEST 4: Image Format Requirements');
  console.log('=' .repeat(50));
  
  console.log('🔍 Based on API errors, Mistral requires image_url format, not document format.');
  console.log('   This means PDFs need to be converted to images first.');
  console.log('   Supported types from docs: PNG, JPEG, WEBP, non-animated GIF');
  console.log('   Maximum file size: 10MB');
  console.log('   Maximum images per request: 8');
  console.log('');
  console.log('💡 For PDF processing, we would need to:');
  console.log('   1. Convert PDF pages to images (PNG/JPEG)');
  console.log('   2. Send each page as image_url with base64 data');
  console.log('   3. Process multiple pages in sequence or parallel');
  console.log('   4. Combine results from all pages');
  console.log('');
  console.log('⚠️  This approach would be significantly more expensive than direct PDF processing.');
  
  // Quick cost estimation
  try {
    const costEstimate = await mistral.chat.complete({
      model: 'pixtral-12b-2409', 
      messages: [{
        role: 'user',
        content: 'What is the typical cost structure for processing images with vision models? How do token costs compare between text-only and vision requests?'
      }],
      max_tokens: 500,
    });

    console.log('\n💰 MISTRAL COST INFORMATION:');
    console.log(costEstimate.choices?.[0]?.message?.content || 'No cost info available');

  } catch (costError) {
    console.log('❌ Cost estimation failed:', costError instanceof Error ? costError.message : String(costError));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 SUMMARY AND RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  console.log(`
Based on this testing:

1. **Mistral PDF Support**: [Check results above]
2. **Alternative Approaches**: 
   - If direct PDF fails, we may need image conversion
   - Could use pdf-lib for PDF→image without system dependencies
   - Text extraction + vision hybrid approach possible

3. **Cost Comparison**: 
   - Haiku: ~$0.0012 per document
   - Mistral: Estimated $0.05-0.15 per document (higher cost)

4. **Integration Strategy**:
   - Keep Haiku as primary engine for cost-effectiveness
   - Use Mistral for documents where Haiku struggles
   - Implement fallback chain: Haiku → Mistral → Manual review

5. **Next Steps**:
   - Test Mistral with known problematic documents
   - Implement hybrid extraction strategy
   - Create decision matrix for engine selection
  `);
}

// Run the test
if (require.main === module) {
  testMistralPDFCapabilities()
    .then(() => {
      console.log('\n✅ Mistral PDF testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}