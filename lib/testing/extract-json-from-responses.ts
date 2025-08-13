/**
 * Helper to extract JSON from markdown-wrapped responses
 * This will show us what Sonnet 4 and Gemini actually extracted
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root
config({ path: path.join(__dirname, '..', '..', '.env') });

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

const EXTRACTION_PROMPT = `Extract insurance document data and return ONLY valid JSON:

{
  "hipRidgeCap": {
    "found": boolean,
    "quantity": number | null,
    "description": string | null,
    "quality": "purpose-built" | "cut-from-3tab" | null
  },
  "starterStrip": {
    "found": boolean,
    "quantity": number | null, 
    "description": string | null,
    "type": "universal" | "cut-shingles" | null
  },
  "dripEdge": {
    "found": boolean,
    "quantity": number | null,
    "description": string | null,
    "location": "rakes" | null
  },
  "gutterApron": {
    "found": boolean,
    "quantity": number | null,
    "description": string | null,
    "location": "eaves" | null
  },
  "iceWaterBarrier": {
    "found": boolean,
    "coverage": number | null,
    "description": string | null,
    "calculation": string | null
  }
}

Rules:
- Use null for missing data, never 0 or empty string
- Extract exact quantities from line items
- Identify material quality/type when specified
- Return only JSON, no explanations`;

// Helper function to extract JSON from markdown-wrapped responses
function extractJsonFromResponse(response: string): any {
  // Remove markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.log('Failed to parse extracted JSON:', e);
      return null;
    }
  }
  
  // Try to parse as direct JSON
  try {
    return JSON.parse(response);
  } catch (e) {
    console.log('Failed to parse direct JSON:', e);
    return null;
  }
}

// Helper function to convert PDF to base64
function pdfToBase64(filePath: string): string {
  const pdfBuffer = fs.readFileSync(filePath);
  return pdfBuffer.toString('base64');
}

async function testModelWithResponse(modelName: string, documentName: string) {
  const pdfPath = path.join(__dirname, '..', '..', 'examples', documentName);
  
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ ${documentName} not found`);
    return;
  }

  console.log(`\n📄 Testing ${modelName} with ${documentName}...`);
  
  try {
    const pdfBase64 = pdfToBase64(pdfPath);
    let rawResponse: string;
    
    if (modelName === 'claude-sonnet-4') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT
            }
          ]
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }
      rawResponse = content.text;
      
    } else if (modelName === 'gemini-flash') {
      const model = google.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const response = await model.generateContent([
        EXTRACTION_PROMPT,
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        }
      ]);

      rawResponse = response.response.text();
    } else {
      console.log(`❌ Unknown model: ${modelName}`);
      return;
    }

    console.log(`\n--- RAW RESPONSE FROM ${modelName} ---`);
    console.log(rawResponse);
    console.log(`\n--- ATTEMPTING JSON EXTRACTION ---`);
    
    const extractedData = extractJsonFromResponse(rawResponse);
    if (extractedData) {
      console.log(`✅ Successfully extracted JSON:`);
      console.log(JSON.stringify(extractedData, null, 2));
    } else {
      console.log(`❌ Could not extract valid JSON`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function compareExtractions() {
  console.log('🔍 COMPREHENSIVE COMPARISON ACROSS ALL 5 DOCUMENTS\n');
  
  const testDocuments = [
    'Evans___Bob_NE_5916_estimate.pdf',
    'Fritch__Jeanne_NE_5919_estimate.pdf', 
    'Gerloff__Brian_estimate.pdf',
    'Gutz__Charlie_NE_6033_estimate.pdf',
    'Hunt__Jamie_NE_6201_estimate.pdf'
  ];

  // Load Haiku results for comparison
  const haikuResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'claude-haiku-3.5-results.json'), 'utf8'));
  
  for (const document of testDocuments) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 DOCUMENT: ${document}`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Get Claude Haiku result for comparison
    const haikuResult = haikuResults.results.find((r: any) => r.document === document);
    
    // Test Claude Sonnet 4
    console.log('--- CLAUDE SONNET 4 ---');
    const sonnetData = await getModelExtraction('claude-sonnet-4', document);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test Gemini Flash
    console.log('\n--- GEMINI FLASH ---');
    const geminiData = await getModelExtraction('gemini-flash', document);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show Haiku result
    console.log('\n--- CLAUDE HAIKU 3.5 ---');
    if (haikuResult) {
      console.log(JSON.stringify(haikuResult.data, null, 2));
    } else {
      console.log('❌ No Haiku result found');
    }
    
    // Compare key differences
    console.log('\n🔍 KEY DIFFERENCES:');
    compareResults(sonnetData, geminiData, haikuResult?.data, document);
  }
}

async function getModelExtraction(modelName: string, documentName: string): Promise<any> {
  const pdfPath = path.join(__dirname, '..', '..', 'examples', documentName);
  
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ ${documentName} not found`);
    return null;
  }

  try {
    const pdfBase64 = pdfToBase64(pdfPath);
    let rawResponse: string;
    
    if (modelName === 'claude-sonnet-4') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT
            }
          ]
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }
      rawResponse = content.text;
      
    } else if (modelName === 'gemini-flash') {
      const model = google.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const response = await model.generateContent([
        EXTRACTION_PROMPT,
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        }
      ]);

      rawResponse = response.response.text();
    } else {
      console.log(`❌ Unknown model: ${modelName}`);
      return null;
    }

    const extractedData = extractJsonFromResponse(rawResponse);
    if (extractedData) {
      console.log('✅ Success:');
      console.log(JSON.stringify(extractedData, null, 2));
      return extractedData;
    } else {
      console.log('❌ Could not extract valid JSON');
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function compareResults(sonnet: any, gemini: any, haiku: any, documentName: string) {
  if (!sonnet || !gemini || !haiku) {
    console.log('❌ Missing data for comparison');
    return;
  }
  
  const fields = ['hipRidgeCap', 'starterStrip', 'dripEdge', 'gutterApron', 'iceWaterBarrier'];
  
  fields.forEach(field => {
    const sonnetVal = sonnet[field];
    const geminiVal = gemini[field];
    const haikuVal = haiku[field];
    
    // Check for differences in "found" status
    const foundValues = [sonnetVal?.found, geminiVal?.found, haikuVal?.found];
    if (new Set(foundValues).size > 1) {
      console.log(`🚨 ${field.toUpperCase()} DETECTION DIFFERS:`);
      console.log(`   Sonnet: ${sonnetVal?.found}, Gemini: ${geminiVal?.found}, Haiku: ${haikuVal?.found}`);
    }
    
    // Check for differences in quantities
    const quantities = [sonnetVal?.quantity, geminiVal?.quantity, haikuVal?.quantity];
    if (new Set(quantities.filter(q => q !== null)).size > 1) {
      console.log(`💰 ${field.toUpperCase()} QUANTITY DIFFERS:`);
      console.log(`   Sonnet: ${sonnetVal?.quantity}, Gemini: ${geminiVal?.quantity}, Haiku: ${haikuVal?.quantity}`);
    }
    
    // Check for missing location data
    if (field === 'dripEdge' || field === 'gutterApron') {
      const locations = [sonnetVal?.location, geminiVal?.location, haikuVal?.location];
      if (new Set(locations).size > 1) {
        console.log(`📍 ${field.toUpperCase()} LOCATION DIFFERS:`);
        console.log(`   Sonnet: ${sonnetVal?.location}, Gemini: ${geminiVal?.location}, Haiku: ${haikuVal?.location}`);
      }
    }
  });
}

if (require.main === module) {
  compareExtractions().catch(console.error);
}

export { extractJsonFromResponse };