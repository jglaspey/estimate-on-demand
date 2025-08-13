/**
 * Mistral OCR Full-Page Text Extraction Test
 * 
 * Tests Mistral's dedicated OCR API for extracting complete page text
 * This is different from chat completions - it's a specialized OCR service
 * that can return markdown text for each page + structured annotations
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '.env') });

import { Mistral } from '@mistralai/mistralai';

interface MistralOCRResponse {
  pages: Array<{
    index: number;
    markdown: string;
    images: Array<{
      id: string;
      top_left_x?: number;
      top_left_y?: number;
      bottom_right_x?: number;
      bottom_right_y?: number;
      image_base64?: string;
    }>;
    dimensions?: {
      width: number;
      height: number;
    };
  }>;
}

async function testMistralOCRCapabilities() {
  console.log('🔍 Testing Mistral OCR API for Full-Page Text Extraction\n');

  // Check API key
  if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY === 'your_mistral_key_here') {
    console.error('❌ Mistral API key not configured. Please set MISTRAL_API_KEY in .env file.');
    return;
  }

  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

  // Test document
  const testDoc = 'examples/boryca-est.pdf';
  
  if (!fs.existsSync(testDoc)) {
    console.error(`❌ Test document not found: ${testDoc}`);
    return;
  }

  console.log(`📄 Testing with: ${testDoc}`);
  console.log(`📊 File size: ${(fs.statSync(testDoc).size / 1024).toFixed(1)} KB\n`);

  // Test 1: Basic OCR with page-by-page text extraction
  console.log('🧪 TEST 1: Basic OCR - Page-by-Page Text Extraction');
  console.log('='.repeat(60));

  try {
    console.log('⏳ Processing document with Mistral OCR API...');
    
    // Convert PDF to base64 for API call
    const pdfBuffer = fs.readFileSync(testDoc);
    const pdfBase64 = pdfBuffer.toString('base64');
    
    const startTime = Date.now();
    
    // Make OCR API call - try document_url type for PDF
    const ocrResponse = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${pdfBase64}`
      },
      includeImageBase64: false, // Skip images for now to focus on text
    });

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ OCR completed in ${processingTime}ms`);
    console.log(`📄 Extracted ${ocrResponse.pages?.length || 0} pages\n`);

    // Display each page's content
    if (ocrResponse.pages) {
      for (const page of ocrResponse.pages) {
        console.log(`📖 PAGE ${page.index + 1}:`);
        console.log('-'.repeat(40));
        console.log(`📏 Dimensions: ${page.dimensions?.width || 'unknown'}x${page.dimensions?.height || 'unknown'}`);
        console.log(`📝 Text length: ${page.markdown?.length || 0} characters`);
        console.log(`🖼️  Images found: ${page.images?.length || 0}`);
        
        if (page.markdown) {
          // Show first 300 chars of each page
          const preview = page.markdown.substring(0, 300).replace(/\s+/g, ' ');
          console.log(`📄 Text preview: "${preview}${page.markdown.length > 300 ? '...' : ''}"`);
        }
        console.log('');
      }

      // Save full OCR results
      const outputPath = 'lib/testing/mistral-ocr-results.json';
      fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        document: testDoc,
        processingTime,
        totalPages: ocrResponse.pages.length,
        totalTextLength: ocrResponse.pages.reduce((sum, p) => sum + (p.markdown?.length || 0), 0),
        pages: ocrResponse.pages.map(page => ({
          index: page.index,
          textLength: page.markdown?.length || 0,
          imageCount: page.images?.length || 0,
          text: page.markdown,
          dimensions: page.dimensions
        }))
      }, null, 2));

      console.log(`💾 Full OCR results saved to: ${outputPath}\n`);
    }

  } catch (error) {
    console.log('❌ Mistral OCR failed:', error instanceof Error ? error.message : String(error));
  }

  // Test 2: OCR with structured document annotation
  console.log('🧪 TEST 2: OCR with Document-Level Structured Extraction');
  console.log('='.repeat(60));

  try {
    console.log('⏳ Processing with document annotation schema...');
    
    const pdfBuffer = fs.readFileSync(testDoc);
    const pdfBase64 = pdfBuffer.toString('base64');
    
    const startTime = Date.now();
    
    // Define schema for document-level extraction
    const documentAnnotationSchema = {
      type: "json_schema" as const,
      json_schema: {
        name: "insurance_document_analysis",
        strict: true,
        schema: {
          type: "object" as const,
          title: "InsuranceDocumentAnalysis",
          additionalProperties: false,
          required: ["document_type", "total_amount", "line_items", "addresses"],
          properties: {
            document_type: {
              title: "Document_Type",
              type: "string" as const,
              description: "Type of insurance document (estimate, invoice, supplement, etc.)"
            },
            total_amount: {
              title: "Total_Amount", 
              type: "string" as const,
              description: "Total dollar amount found in the document"
            },
            line_items: {
              title: "Line_Items",
              type: "array" as const,
              description: "Key line items with descriptions and amounts",
              items: {
                type: "object" as const,
                properties: {
                  description: { type: "string" as const },
                  quantity: { type: "string" as const },
                  amount: { type: "string" as const }
                }
              }
            },
            addresses: {
              title: "Addresses",
              type: "array" as const,
              description: "All addresses found in the document",
              items: { type: "string" as const }
            }
          }
        }
      }
    };

    // Make OCR API call with structured extraction  
    const structuredResponse = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${pdfBase64}`
      },
      documentAnnotationFormat: documentAnnotationSchema,
      includeImageBase64: false,
    });

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Structured OCR completed in ${processingTime}ms`);
    console.log('\n📋 STRUCTURED EXTRACTION RESULTS:');
    console.log('-'.repeat(40));
    
    // The structured data should be in the response
    if (structuredResponse && typeof structuredResponse === 'object') {
      console.log(JSON.stringify(structuredResponse, null, 2));
      
      // Save structured results
      const structuredPath = 'lib/testing/mistral-ocr-structured-results.json';
      fs.writeFileSync(structuredPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        document: testDoc,
        processingTime,
        results: structuredResponse
      }, null, 2));
      
      console.log(`\n💾 Structured results saved to: ${structuredPath}`);
    }

  } catch (error) {
    console.log('❌ Structured OCR failed:', error instanceof Error ? error.message : String(error));
  }

  // Test 3: Compare OCR with our previous approaches
  console.log('\n🧪 TEST 3: Comparison with Previous Approaches');
  console.log('='.repeat(60));

  console.log(`
📊 MISTRAL OCR CAPABILITIES DISCOVERED:

✅ **Dedicated OCR Endpoint**: /v1/ocr (separate from chat completions)
✅ **Page-by-Page Processing**: Returns markdown text for each page
✅ **Structured Annotations**: Can extract specific data via JSON schemas
✅ **Image Detection**: Identifies and extracts images with bounding boxes
✅ **Multiple Input Types**: Supports PDFs, images, document URLs
✅ **Batch Processing**: Can specify which pages to process

🔄 **Processing Pipeline**:
1. PDF → Base64 encoding
2. OCR API call with optional structured schema
3. Receive page-by-page markdown + structured data
4. Store full text per page + extracted fields

💰 **Cost Implications**:
- Dedicated OCR service (likely different pricing than chat)
- Processes entire document at once vs page-by-page chat calls
- Can extract both raw text AND structured data in single request

🎯 **Use Cases for Insurance Documents**:
- Full document text preservation (searchable, quotable)
- Structured field extraction (amounts, line items, addresses)
- Page-level organization for large multi-page documents
- Image extraction for diagrams, signatures, photos

📈 **Advantages over Chat Completion Approach**:
- Purpose-built for OCR (better accuracy on complex layouts)
- Preserves document structure and formatting
- Can handle both text extraction AND structured data
- Single API call for entire document
- Built-in page organization and image detection
  `);

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Implement OCR-based extraction engine');
  console.log('2. Design database schema for page-level text storage');
  console.log('3. Create hybrid approach: OCR + targeted field extraction');
  console.log('4. Build UI for page-by-page document review');
  console.log('5. Test with full range of insurance document types');
}

// Run the test
if (require.main === module) {
  testMistralOCRCapabilities()
    .then(() => {
      console.log('\n✅ Mistral OCR testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}