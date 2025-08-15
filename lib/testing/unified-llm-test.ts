/**
 * Unified LLM Testing - Direct PDF Input
 * Tests 5 PDFs across all models with identical approach
 * No text parsing - direct PDF input to preserve structure
 * Generates one JSON file per model for easy comparison
 */

import path from 'path';
import fs from 'fs';

import { config } from 'dotenv';

// Load .env from project root
config({ path: path.join(__dirname, '..', '..', '.env') });

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize AI clients (only if API keys are available)
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const google = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

// Test configuration
const TEST_CONFIG = {
  models: [
    { name: 'claude-sonnet-4', provider: 'anthropic', id: 'claude-sonnet-4-20250514' },
    { name: 'claude-haiku-3.5', provider: 'anthropic', id: 'claude-3-5-haiku-20241022' },
    { name: 'gpt-5', provider: 'openai', id: 'gpt-5' },
    { name: 'gpt-5-mini', provider: 'openai', id: 'gpt-5-mini' },
    { name: 'gemini-flash', provider: 'google', id: 'gemini-2.5-flash' },
  ],
  testDocuments: [
    'Evans___Bob_NE_5916_estimate.pdf',
    'Fritch__Jeanne_NE_5919_estimate.pdf', 
    'Gerloff__Brian_estimate.pdf',
    'Gutz__Charlie_NE_6033_estimate.pdf',
    'Hunt__Jamie_NE_6201_estimate.pdf'
  ]
};

// Simplified, consistent extraction prompt
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

interface TestResult {
  document: string;
  timestamp: string;
  processingTime: number;
  success: boolean;
  data: any;
  error?: string;
  cost?: number;
}

interface ModelResults {
  model: string;
  provider: string;
  totalTests: number;
  successfulTests: number;
  averageTime: number;
  totalCost: number;
  results: TestResult[];
}

// Helper function to convert PDF to base64
function pdfToBase64(filePath: string): string {
  const pdfBuffer = fs.readFileSync(filePath);
  return pdfBuffer.toString('base64');
}

// Test single document with Anthropic model
async function testAnthropicModel(modelId: string, pdfPath: string, document: string): Promise<TestResult> {
  const startTime = Date.now();
  
  if (!anthropic) {
    throw new Error('Anthropic client not initialized - missing API key');
  }
  
  try {
    const pdfBase64 = pdfToBase64(pdfPath);
    
    const response = await anthropic.messages.create({
      model: modelId,
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

    const processingTime = Date.now() - startTime;
    const content = response.content[0];
    
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const data = JSON.parse(content.text);
    
    // Calculate approximate cost (Claude pricing)
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = modelId.includes('sonnet-4') 
      ? (inputTokens * 15 + outputTokens * 75) / 1000000  // Sonnet 4 pricing
      : (inputTokens * 0.8 + outputTokens * 4) / 1000000; // Haiku pricing

    return {
      document,
      timestamp: new Date().toISOString(),
      processingTime,
      success: true,
      data,
      cost
    };
  } catch (error) {
    return {
      document,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test single document with OpenAI model  
async function testOpenAIModel(modelId: string, pdfPath: string, document: string): Promise<TestResult> {
  const startTime = Date.now();
  
  if (!openai) {
    throw new Error('OpenAI client not initialized - missing API key');
  }
  
  try {
    const pdfBase64 = pdfToBase64(pdfPath);
    
    const response = await openai.chat.completions.create({
      model: modelId,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: EXTRACTION_PROMPT
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${pdfBase64}`
            }
          }
        ]
      }]
    });

    const processingTime = Date.now() - startTime;
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No response content');
    }

    const data = JSON.parse(content);
    
    // Calculate cost (OpenAI pricing)
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = modelId.includes('gpt-5-mini')
      ? (inputTokens * 0.25 + outputTokens * 1) / 1000000  // GPT-5-mini pricing
      : (inputTokens * 2.5 + outputTokens * 10) / 1000000; // GPT-5 pricing

    return {
      document,
      timestamp: new Date().toISOString(),
      processingTime,
      success: true,
      data,
      cost
    };
  } catch (error) {
    return {
      document,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test single document with Google model
async function testGoogleModel(modelId: string, pdfPath: string, document: string): Promise<TestResult> {
  const startTime = Date.now();
  
  if (!google) {
    throw new Error('Google client not initialized - missing API key');
  }
  
  try {
    const pdfBase64 = pdfToBase64(pdfPath);
    const model = google.getGenerativeModel({ model: modelId });
    
    const response = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      }
    ]);

    const processingTime = Date.now() - startTime;
    const content = response.response.text();
    const data = JSON.parse(content);
    
    // Calculate cost (Gemini pricing)
    const cost = 0.001; // Approximate Flash pricing

    return {
      document,
      timestamp: new Date().toISOString(),
      processingTime,
      success: true,
      data,
      cost
    };
  } catch (error) {
    return {
      document,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test single model across all documents
async function testModel(modelConfig: any): Promise<ModelResults> {
  console.log(`\n🧪 Testing ${modelConfig.name}...`);
  
  const results: TestResult[] = [];
  let totalCost = 0;
  let totalTime = 0;
  
  for (const document of TEST_CONFIG.testDocuments) {
    const pdfPath = path.join(__dirname, '..', '..', 'examples', document);
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`  ❌ ${document} - File not found`);
      continue;
    }
    
    console.log(`  📄 Testing ${document}...`);
    
    let result: TestResult;
    
    switch (modelConfig.provider) {
      case 'anthropic':
        result = await testAnthropicModel(modelConfig.id, pdfPath, document);
        break;
      case 'openai':
        result = await testOpenAIModel(modelConfig.id, pdfPath, document);
        break;
      case 'google':
        result = await testGoogleModel(modelConfig.id, pdfPath, document);
        break;
      default:
        throw new Error(`Unknown provider: ${modelConfig.provider}`);
    }
    
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ ${document} - ${result.processingTime}ms`);
      totalCost += result.cost || 0;
      totalTime += result.processingTime;
    } else {
      console.log(`  ❌ ${document} - ${result.error}`);
    }
    
    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successfulTests = results.filter(r => r.success).length;
  
  return {
    model: modelConfig.name,
    provider: modelConfig.provider,
    totalTests: results.length,
    successfulTests,
    averageTime: successfulTests > 0 ? totalTime / successfulTests : 0,
    totalCost,
    results
  };
}

// Main test runner
async function runUnifiedTest() {
  console.log('🚀 Starting Unified LLM Test - Direct PDF Input');
  
  // Filter models based on available API keys
  const availableModels = TEST_CONFIG.models.filter(model => {
    switch (model.provider) {
      case 'anthropic': return !!anthropic;
      case 'openai': return !!openai;
      case 'google': return !!google;
      default: return false;
    }
  });
  
  console.log(`🔑 Available API keys: ${availableModels.map(m => m.provider).join(', ')}`);
  console.log(`📋 Testing ${availableModels.length} models x ${TEST_CONFIG.testDocuments.length} documents\n`);
  
  if (availableModels.length === 0) {
    console.error('❌ No API keys available! Please check your .env file.');
    return;
  }
  
  const allResults: ModelResults[] = [];
  
  for (const modelConfig of availableModels) {
    try {
      const modelResults = await testModel(modelConfig);
      allResults.push(modelResults);
      
      // Save individual model results
      const outputFile = path.join(__dirname, `${modelConfig.name}-results.json`);
      fs.writeFileSync(outputFile, JSON.stringify(modelResults, null, 2));
      
      console.log(`💾 Saved results to ${outputFile}`);
      
    } catch (error) {
      console.error(`❌ Failed to test ${modelConfig.name}:`, error);
    }
  }
  
  // Generate comparison table
  generateComparisonTable(allResults);
  
  console.log('\n✅ Unified LLM Test Complete!');
  console.log('📊 Check the comparison table above and individual JSON files for detailed results.');
}

// Generate comparison table
function generateComparisonTable(allResults: ModelResults[]) {
  console.log('\n📊 COMPARISON TABLE\n');
  console.log('Model                 | Tests | Success | Avg Time | Total Cost | Success Rate');
  console.log('---------------------|-------|---------|----------|------------|-------------');
  
  // Sort by success rate, then by speed
  const sortedResults = allResults.sort((a, b) => {
    const successRateA = a.successfulTests / a.totalTests;
    const successRateB = b.successfulTests / b.totalTests;
    
    if (successRateA !== successRateB) {
      return successRateB - successRateA; // Higher success rate first
    }
    
    return a.averageTime - b.averageTime; // Faster first
  });
  
  sortedResults.forEach(result => {
    const successRate = ((result.successfulTests / result.totalTests) * 100).toFixed(1);
    const avgTime = (result.averageTime / 1000).toFixed(1);
    const cost = result.totalCost.toFixed(4);
    
    console.log(
      `${result.model.padEnd(20)} | ${result.totalTests.toString().padStart(5)} | ${result.successfulTests.toString().padStart(7)} | ${avgTime.padStart(6)}s | $${cost.padStart(8)} | ${successRate.padStart(9)}%`
    );
  });
  
  // Find best performing model
  const bestModel = sortedResults[0];
  if (bestModel && bestModel.successfulTests === bestModel.totalTests) {
    console.log(`\n🏆 RECOMMENDATION: ${bestModel.model} - 100% success rate, ${(bestModel.averageTime/1000).toFixed(1)}s avg time`);
  }
}

// Run the test
if (require.main === module) {
  runUnifiedTest().catch(console.error);
}

export { runUnifiedTest };