/**
 * Text Extraction Comparison
 * 
 * Compare Haiku's direct PDF processing vs text extraction approaches
 * Test if pre-extracting text gives better results for some models
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '.env') });

import { Mistral } from '@mistralai/mistralai';
import { createHaikuEngine } from '../extraction/haiku-extraction-engine';
import pdfParse from 'pdf-parse';

async function compareTextExtractionMethods() {
  console.log('📊 Text Extraction Method Comparison\n');

  // Test document
  const testDoc = 'examples/boryca-est.pdf';
  
  if (!fs.existsSync(testDoc)) {
    console.error(`❌ Test document not found: ${testDoc}`);
    return;
  }

  const pdfBuffer = fs.readFileSync(testDoc);
  console.log(`📄 Testing with: ${testDoc} (${(pdfBuffer.length / 1024).toFixed(1)} KB)\n`);

  // Extract text first
  console.log('🔍 Step 1: Extract text using pdf-parse');
  const parsedPdf = await pdfParse(pdfBuffer);
  
  console.log(`   Pages: ${parsedPdf.numpages}`);
  console.log(`   Text length: ${parsedPdf.text.length} characters`);
  console.log(`   First 200 chars: "${parsedPdf.text.substring(0, 200).replace(/\s+/g, ' ')}..."`);

  // Standard extraction prompt
  const EXTRACTION_PROMPT = `Analyze this insurance estimate text and extract roofing supplement information.

Return ONLY valid JSON in this exact format:
{
  "hipRidgeCap": {"found": boolean, "quantity": number | null, "description": string | null, "quality": string | null},
  "starterStrip": {"found": boolean, "quantity": number | null, "description": string | null, "type": string | null},
  "dripEdge": {"found": boolean, "quantity": number | null, "description": string | null, "location": string | null},
  "gutterApron": {"found": boolean, "quantity": number | null, "description": string | null, "location": string | null},
  "iceWaterBarrier": {"found": boolean, "coverage": number | null, "description": string | null, "calculation": string | null}
}

Look for these specific items:
- Hip/Ridge Cap: Ridge cap, hip cap materials
- Starter Strip: Starter strip, starter course materials  
- Drip Edge: Drip edge at rakes (roof edges)
- Gutter Apron: Gutter apron or flashing at eaves
- Ice & Water Barrier: Ice and water shield/barrier

TEXT TO ANALYZE:
${parsedPdf.text}`;

  const results = [];

  // Test 1: Haiku with direct PDF
  console.log('\n🧪 Test 1: Haiku Direct PDF Processing');
  console.log('-'.repeat(50));
  
  try {
    const haikuEngine = createHaikuEngine();
    const startTime = Date.now();
    
    const haikuResult = await haikuEngine.extractFromPDF(pdfBuffer, 'text-comparison');
    const haikuTime = Date.now() - startTime;
    
    console.log(`✅ Haiku completed: ${haikuTime}ms, $${haikuResult.metrics.cost.toFixed(4)}`);
    console.log('📋 Results:');
    Object.entries(haikuResult.data).forEach(([field, data]) => {
      if (data.found) {
        console.log(`   ✓ ${field}: ${data.quantity || data.coverage || 'detected'} - ${data.description || 'no description'}`);
      } else {
        console.log(`   ○ ${field}: not found`);
      }
    });
    
    results.push({
      method: 'Haiku Direct PDF',
      success: haikuResult.metrics.success,
      time: haikuTime,
      cost: haikuResult.metrics.cost,
      fieldsFound: Object.values(haikuResult.data).filter(f => f.found).length,
      data: haikuResult.data
    });

  } catch (error) {
    console.log(`❌ Haiku failed: ${error instanceof Error ? error.message : String(error)}`);
    results.push({
      method: 'Haiku Direct PDF',
      success: false,
      time: 0,
      cost: 0,
      fieldsFound: 0,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Mistral with extracted text
  console.log('\n🧪 Test 2: Mistral Text Analysis');
  console.log('-'.repeat(50));
  
  if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY !== 'your_mistral_key_here') {
    try {
      const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
      const startTime = Date.now();
      
      const mistralResult = await mistral.chat.complete({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: EXTRACTION_PROMPT
        }],
        max_tokens: 2000,
        temperature: 0.1,
      });
      
      const mistralTime = Date.now() - startTime;
      
      const content = mistralResult.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in Mistral response');
      }
      
      console.log(`✅ Mistral completed: ${mistralTime}ms`);
      console.log('📋 Raw response:');
      console.log(content);
      
      // Try to parse JSON from response
      let extractedData;
      try {
        let jsonText = content.trim();
        if (jsonText.startsWith('```json')) {
          const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
          if (match) jsonText = match[1];
        } else if (jsonText.startsWith('```')) {
          const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
          if (match) jsonText = match[1];
        }
        
        extractedData = JSON.parse(jsonText);
        
        console.log('📊 Parsed results:');
        Object.entries(extractedData).forEach(([field, data]: [string, any]) => {
          if (data.found) {
            console.log(`   ✓ ${field}: ${data.quantity || data.coverage || 'detected'} - ${data.description || 'no description'}`);
          } else {
            console.log(`   ○ ${field}: not found`);
          }
        });
        
        results.push({
          method: 'Mistral Text Analysis',
          success: true,
          time: mistralTime,
          cost: 0.001, // Rough estimate
          fieldsFound: Object.values(extractedData).filter((f: any) => f.found).length,
          data: extractedData
        });
        
      } catch (parseError) {
        console.log('❌ Failed to parse JSON from Mistral response');
        results.push({
          method: 'Mistral Text Analysis',
          success: false,
          time: mistralTime,
          cost: 0,
          fieldsFound: 0,
          error: 'JSON parsing failed',
          rawResponse: content
        });
      }

    } catch (error) {
      console.log(`❌ Mistral failed: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        method: 'Mistral Text Analysis',
        success: false,
        time: 0,
        cost: 0,
        fieldsFound: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    console.log('⏭️ Skipping Mistral test - API key not configured');
  }

  // Test 3: Haiku with pre-extracted text (for comparison)
  console.log('\n🧪 Test 3: Haiku with Pre-extracted Text');
  console.log('-'.repeat(50));
  
  try {
    const haikuEngine = createHaikuEngine();
    const startTime = Date.now();
    
    // Create a mock "PDF" from the extracted text for Haiku to process
    // This won't work directly since Haiku expects PDF format, so we'll skip this
    console.log('⏭️ Skipping - Haiku requires PDF format, not plain text');
    
  } catch (error) {
    console.log(`❌ Haiku text processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Summary comparison
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n📋 Results Table:');
  console.log('┌─────────────────────────┬─────────┬──────────┬─────────────┬─────────────┐');
  console.log('│ Method                  │ Success │ Fields   │ Time (ms)   │ Cost ($)    │');
  console.log('├─────────────────────────┼─────────┼──────────┼─────────────┼─────────────┤');
  
  results.forEach(result => {
    const success = result.success ? '✅ Yes' : '❌ No';
    const fields = `${result.fieldsFound}/5`;
    const time = result.time.toString();
    const cost = result.cost.toFixed(4);
    
    console.log(`│ ${result.method.padEnd(23)} │ ${success.padEnd(7)} │ ${fields.padEnd(8)} │ ${time.padStart(11)} │ ${cost.padStart(11)} │`);
  });
  console.log('└─────────────────────────┴─────────┴──────────┴─────────────┴─────────────┘');

  console.log('\n🎯 KEY INSIGHTS:');
  
  const haikuResult = results.find(r => r.method === 'Haiku Direct PDF');
  const mistralResult = results.find(r => r.method === 'Mistral Text Analysis');
  
  if (haikuResult && mistralResult) {
    console.log(`   • Haiku found ${haikuResult.fieldsFound} fields vs Mistral's ${mistralResult.fieldsFound}`);
    console.log(`   • Cost difference: Haiku $${haikuResult.cost.toFixed(4)} vs Mistral ~$${mistralResult.cost.toFixed(4)}`);
    console.log(`   • Speed: Haiku ${haikuResult.time}ms vs Mistral ${mistralResult.time}ms`);
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   • Haiku\'s direct PDF processing remains most cost-effective');
  console.log('   • Mistral requires image conversion for vision capabilities');
  console.log('   • Text extraction + Mistral could be fallback for failed Haiku attempts');
  console.log('   • Consider hybrid approach: Haiku first, then Mistral for low-confidence results');

  // Save results
  const outputPath = 'lib/testing/text-extraction-comparison-results.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    document: testDoc,
    textStats: {
      pages: parsedPdf.numpages,
      textLength: parsedPdf.text.length,
      firstChars: parsedPdf.text.substring(0, 500)
    },
    results,
    summary: {
      bestAccuracy: results.reduce((best, curr) => curr.fieldsFound > best.fieldsFound ? curr : best),
      bestCost: results.reduce((best, curr) => curr.cost < best.cost ? curr : best),
      bestSpeed: results.reduce((best, curr) => curr.time < best.time ? curr : best)
    }
  }, null, 2));

  console.log(`\n💾 Detailed results saved to: ${outputPath}`);
}

// Run the comparison
if (require.main === module) {
  compareTextExtractionMethods()
    .then(() => {
      console.log('\n✅ Text extraction comparison complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Comparison failed:', error);
      process.exit(1);
    });
}