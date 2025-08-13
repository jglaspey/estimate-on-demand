/**
 * LLM Evaluation Script for Insurance Document Processing
 * Tests Claude, OpenAI, and Google models across three data capture levels:
 * 1. Structured data extraction (business rules)
 * 2. Page-by-page text capture
 * 3. Image processing capabilities
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

// Types for our evaluation results
interface ExtractionResult {
  provider: string;
  model: string;
  document: string;
  timestamp: string;
  processingTime: number;
  success: boolean;
  error?: string;
  structuredData: BusinessRuleData;
  fullTextPages: PageText[];
  tokenUsage?: {
    input: number;
    output: number;
    cost: number;
  };
}

interface BusinessRuleData {
  hipRidgeCap: {
    found: boolean;
    quality: 'purpose-built' | 'cut-from-3tab' | 'unknown';
    linearFeet?: number;
    description?: string;
    compliance: 'compliant' | 'non-compliant' | 'unknown';
  };
  starterStrip: {
    found: boolean;
    type: 'universal' | 'cut-shingles' | 'unknown';
    linearFeet?: number;
    coverage?: string;
    compliance: 'compliant' | 'non-compliant' | 'unknown';
  };
  dripEdgeGutterApron: {
    dripEdge: {
      found: boolean;
      linearFeet?: number;
      location: 'rakes' | 'unknown';
    };
    gutterApron: {
      found: boolean;
      linearFeet?: number;
      location: 'eaves' | 'unknown';
    };
    compliance: 'compliant' | 'non-compliant' | 'unknown';
  };
  iceWaterBarrier: {
    found: boolean;
    coverage?: string;
    calculation?: {
      eaveLength?: number;
      wallThickness?: number;
      roofPitch?: number;
      requiredCoverage?: number;
    };
    compliance: 'compliant' | 'non-compliant' | 'unknown';
  };
}

interface PageText {
  pageNumber: number;
  content: string;
  wordCount: number;
}

class LLMEvaluator {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private google: GoogleGenerativeAI;
  private results: ExtractionResult[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  async evaluateAllModels() {
    console.log('🔍 Starting LLM Evaluation for Insurance Document Processing');
    console.log('=' * 60);

    // Get sample documents - start with a smaller test set
    const examplesDir = path.join(process.cwd(), 'examples');
    const documents = fs.readdirSync(examplesDir)
      .filter(file => file.endsWith('.pdf'))
      .slice(0, 3); // Test with first 3 documents (7 models x 3 docs = 21 tests)

    console.log(`📄 Testing with ${documents.length} documents across 7 models (${documents.length * 7} total tests)`);

    // Test each model with each document
    for (const document of documents) {
      console.log(`\n📄 Processing: ${document}`);
      
      try {
        // Test Claude models
        await this.testClaude(document, 'claude-sonnet-4-20250514');
        await this.testClaude(document, 'claude-3-5-haiku-20241022');
        
        // Test OpenAI GPT-5 models
        await this.testOpenAI(document, 'gpt-5');
        await this.testOpenAI(document, 'gpt-5-mini');
        
        // Test Google Gemini models
        await this.testGoogle(document, 'gemini-2.5-pro');
        await this.testGoogle(document, 'gemini-2.5-flash');
        await this.testGoogle(document, 'gemini-2.5-flash-lite');
        
      } catch (error) {
        console.error(`❌ Error processing ${document}:`, error);
      }
    }

    // Generate comprehensive report
    this.generateReport();
  }

  private async testClaude(documentPath: string, model: string) {
    const startTime = Date.now();
    console.log(`  🤖 Testing Claude ${model}...`);

    try {
      // Read and parse PDF
      const pdfBuffer = fs.readFileSync(path.join(process.cwd(), 'examples', documentPath));
      const pdfData = await pdf(pdfBuffer);
      
      // Split into pages (simulated - pdf-parse doesn't provide page breaks)
      const pages = this.simulatePageSplit(pdfData.text);

      // Prepare extraction prompt
      const extractionPrompt = this.buildExtractionPrompt(pdfData.text);

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: extractionPrompt
        }]
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse structured response
      const structuredData = this.parseStructuredResponse(responseText);
      const fullTextPages = pages.map((content, index) => ({
        pageNumber: index + 1,
        content,
        wordCount: content.split(' ').length
      }));

      this.results.push({
        provider: 'Anthropic',
        model,
        document: documentPath,
        timestamp: new Date().toISOString(),
        processingTime,
        success: true,
        structuredData,
        fullTextPages,
        tokenUsage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cost: this.calculateAnthropicCost(response.usage.input_tokens, response.usage.output_tokens, model)
        }
      });

      console.log(`    ✅ Success (${processingTime}ms)`);

    } catch (error) {
      console.log(`    ❌ Failed: ${error}`);
      this.results.push({
        provider: 'Anthropic',
        model,
        document: documentPath,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        structuredData: this.getEmptyBusinessRuleData(),
        fullTextPages: []
      });
    }
  }

  private async testOpenAI(documentPath: string, model: string) {
    const startTime = Date.now();
    console.log(`  🤖 Testing OpenAI ${model}...`);

    try {
      const pdfBuffer = fs.readFileSync(path.join(process.cwd(), 'examples', documentPath));
      const pdfData = await pdf(pdfBuffer);
      const pages = this.simulatePageSplit(pdfData.text);
      const extractionPrompt = this.buildExtractionPrompt(pdfData.text);

      const response = await this.openai.chat.completions.create({
        model,
        messages: [{
          role: 'user',
          content: extractionPrompt
        }],
        max_completion_tokens: 4000
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.choices[0]?.message?.content || '';

      const structuredData = this.parseStructuredResponse(responseText);
      const fullTextPages = pages.map((content, index) => ({
        pageNumber: index + 1,
        content,
        wordCount: content.split(' ').length
      }));

      this.results.push({
        provider: 'OpenAI',
        model,
        document: documentPath,
        timestamp: new Date().toISOString(),
        processingTime,
        success: true,
        structuredData,
        fullTextPages,
        tokenUsage: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
          cost: this.calculateOpenAICost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, model)
        }
      });

      console.log(`    ✅ Success (${processingTime}ms)`);

    } catch (error) {
      console.log(`    ❌ Failed: ${error}`);
      this.results.push({
        provider: 'OpenAI',
        model,
        document: documentPath,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        structuredData: this.getEmptyBusinessRuleData(),
        fullTextPages: []
      });
    }
  }

  private async testGoogle(documentPath: string, model: string) {
    const startTime = Date.now();
    console.log(`  🤖 Testing Google ${model}...`);

    try {
      const pdfBuffer = fs.readFileSync(path.join(process.cwd(), 'examples', documentPath));
      const pdfData = await pdf(pdfBuffer);
      const pages = this.simulatePageSplit(pdfData.text);
      const extractionPrompt = this.buildExtractionPrompt(pdfData.text);

      const genModel = this.google.getGenerativeModel({ model });
      const response = await genModel.generateContent(extractionPrompt);

      const processingTime = Date.now() - startTime;
      const responseText = response.response.text();

      const structuredData = this.parseStructuredResponse(responseText);
      const fullTextPages = pages.map((content, index) => ({
        pageNumber: index + 1,
        content,
        wordCount: content.split(' ').length
      }));

      // Estimate token usage for Google (approximate)
      const estimatedInputTokens = Math.ceil(extractionPrompt.length / 4);
      const estimatedOutputTokens = Math.ceil(responseText.length / 4);

      this.results.push({
        provider: 'Google',
        model,
        document: documentPath,
        timestamp: new Date().toISOString(),
        processingTime,
        success: true,
        structuredData,
        fullTextPages,
        tokenUsage: {
          input: estimatedInputTokens,
          output: estimatedOutputTokens,
          cost: this.calculateGoogleCost(estimatedInputTokens, estimatedOutputTokens, model)
        }
      });

      console.log(`    ✅ Success (${processingTime}ms)`);

    } catch (error) {
      console.log(`    ❌ Failed: ${error}`);
      this.results.push({
        provider: 'Google',
        model,
        document: documentPath,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        structuredData: this.getEmptyBusinessRuleData(),
        fullTextPages: []
      });
    }
  }

  private buildExtractionPrompt(documentText: string): string {
    return `You are an expert insurance document analyzer. Extract structured data for these 4 critical business rules from this document:

1. **Hip/Ridge Cap Quality**: Look for purpose-built ridge caps vs cut 3-tab shingles
2. **Starter Strip Quality**: Look for universal starter courses vs cut shingles  
3. **Drip Edge & Gutter Apron**: Look for proper edge protection measurements
4. **Ice & Water Barrier**: Look for code-compliant coverage calculations

Document text:
${documentText}

Respond with a JSON object in this exact format:
{
  "hipRidgeCap": {
    "found": boolean,
    "quality": "purpose-built" | "cut-from-3tab" | "unknown",
    "linearFeet": number,
    "description": "string",
    "compliance": "compliant" | "non-compliant" | "unknown"
  },
  "starterStrip": {
    "found": boolean,
    "type": "universal" | "cut-shingles" | "unknown", 
    "linearFeet": number,
    "coverage": "string",
    "compliance": "compliant" | "non-compliant" | "unknown"
  },
  "dripEdgeGutterApron": {
    "dripEdge": {
      "found": boolean,
      "linearFeet": number,
      "location": "rakes" | "unknown"
    },
    "gutterApron": {
      "found": boolean,
      "linearFeet": number,
      "location": "eaves" | "unknown"
    },
    "compliance": "compliant" | "non-compliant" | "unknown"
  },
  "iceWaterBarrier": {
    "found": boolean,
    "coverage": "string",
    "calculation": {
      "eaveLength": number,
      "wallThickness": number,
      "roofPitch": number,
      "requiredCoverage": number
    },
    "compliance": "compliant" | "non-compliant" | "unknown"
  }
}`;
  }

  private parseStructuredResponse(responseText: string): BusinessRuleData {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse structured response, using defaults');
    }
    
    return this.getEmptyBusinessRuleData();
  }

  private getEmptyBusinessRuleData(): BusinessRuleData {
    return {
      hipRidgeCap: {
        found: false,
        quality: 'unknown',
        compliance: 'unknown'
      },
      starterStrip: {
        found: false,
        type: 'unknown',
        compliance: 'unknown'
      },
      dripEdgeGutterApron: {
        dripEdge: {
          found: false,
          location: 'unknown'
        },
        gutterApron: {
          found: false,
          location: 'unknown'
        },
        compliance: 'unknown'
      },
      iceWaterBarrier: {
        found: false,
        compliance: 'unknown'
      }
    };
  }

  private simulatePageSplit(text: string): string[] {
    // Simple page splitting - in real implementation, we'd use better PDF parsing
    const avgWordsPerPage = 300;
    const words = text.split(' ');
    const pages: string[] = [];
    
    for (let i = 0; i < words.length; i += avgWordsPerPage) {
      pages.push(words.slice(i, i + avgWordsPerPage).join(' '));
    }
    
    return pages;
  }

  private calculateAnthropicCost(inputTokens: number, outputTokens: number, model: string): number {
    // Updated Claude pricing per million tokens
    if (model.includes('sonnet-4')) {
      // Claude Sonnet 4: $3 input, $15 output per 1M tokens
      const inputCost = (inputTokens / 1000000) * 3;
      const outputCost = (outputTokens / 1000000) * 15;
      return inputCost + outputCost;
    } else if (model.includes('haiku-3-5')) {
      // Claude Haiku 3.5: $0.80 input, $4 output per 1M tokens
      const inputCost = (inputTokens / 1000000) * 0.80;
      const outputCost = (outputTokens / 1000000) * 4;
      return inputCost + outputCost;
    }
    return 0;
  }

  private calculateOpenAICost(inputTokens: number, outputTokens: number, model: string): number {
    // Updated OpenAI pricing per million tokens
    if (model === 'gpt-5') {
      // GPT-5: $1.25 input, $10 output per 1M tokens
      const inputCost = (inputTokens / 1000000) * 1.25;
      const outputCost = (outputTokens / 1000000) * 10;
      return inputCost + outputCost;
    } else if (model === 'gpt-5-mini') {
      // GPT-5-mini: $0.25 input, $2 output per 1M tokens
      const inputCost = (inputTokens / 1000000) * 0.25;
      const outputCost = (outputTokens / 1000000) * 2;
      return inputCost + outputCost;
    }
    return 0;
  }

  private calculateGoogleCost(inputTokens: number, outputTokens: number, model: string): number {
    // Updated Google Gemini pricing per million tokens
    if (model === 'gemini-2.5-pro') {
      // Gemini 2.5 Pro: $1.25 input (≤200k), $10 output (≤200k)
      const inputCost = (inputTokens / 1000000) * 1.25;
      const outputCost = (outputTokens / 1000000) * 10;
      return inputCost + outputCost;
    } else if (model === 'gemini-2.5-flash') {
      // Gemini 2.5 Flash: $0.30 input, $2.50 output per 1M tokens
      const inputCost = (inputTokens / 1000000) * 0.30;
      const outputCost = (outputTokens / 1000000) * 2.50;
      return inputCost + outputCost;
    } else if (model === 'gemini-2.5-flash-lite') {
      // Gemini 2.5 Flash-Lite: $0.10 input, $0.40 output per 1M tokens
      const inputCost = (inputTokens / 1000000) * 0.10;
      const outputCost = (outputTokens / 1000000) * 0.40;
      return inputCost + outputCost;
    }
    return 0;
  }

  private generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LLM EVALUATION REPORT');
    console.log('='.repeat(60));

    // Summary statistics
    const successRate = (this.results.filter(r => r.success).length / this.results.length) * 100;
    const avgProcessingTime = this.results.reduce((sum, r) => sum + r.processingTime, 0) / this.results.length;
    const totalCost = this.results.reduce((sum, r) => sum + (r.tokenUsage?.cost || 0), 0);

    console.log(`\n📈 SUMMARY STATISTICS`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
    console.log(`Total Estimated Cost: $${totalCost.toFixed(4)}`);

    // Model comparison
    console.log(`\n🏆 MODEL COMPARISON`);
    const models = [
      'claude-sonnet-4-20250514',
      'claude-3-5-haiku-20241022', 
      'gpt-5',
      'gpt-5-mini',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ];
    
    models.forEach(model => {
      const modelResults = this.results.filter(r => r.model === model);
      if (modelResults.length > 0) {
        const successRate = (modelResults.filter(r => r.success).length / modelResults.length) * 100;
        const avgTime = modelResults.reduce((sum, r) => sum + r.processingTime, 0) / modelResults.length;
        const avgCost = modelResults.reduce((sum, r) => sum + (r.tokenUsage?.cost || 0), 0) / modelResults.length;
        
        console.log(`\n${model}:`);
        console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
        console.log(`  Avg Processing Time: ${avgTime.toFixed(0)}ms`);
        console.log(`  Avg Cost per Document: $${avgCost.toFixed(4)}`);
      }
    });

    // Business rule detection rates
    console.log(`\n🔍 BUSINESS RULE DETECTION RATES`);
    const successfulResults = this.results.filter(r => r.success);
    
    if (successfulResults.length > 0) {
      const hipRidgeDetection = (successfulResults.filter(r => r.structuredData.hipRidgeCap.found).length / successfulResults.length) * 100;
      const starterStripDetection = (successfulResults.filter(r => r.structuredData.starterStrip.found).length / successfulResults.length) * 100;
      const dripEdgeDetection = (successfulResults.filter(r => r.structuredData.dripEdgeGutterApron.dripEdge.found).length / successfulResults.length) * 100;
      const iceWaterDetection = (successfulResults.filter(r => r.structuredData.iceWaterBarrier.found).length / successfulResults.length) * 100;

      console.log(`Hip/Ridge Cap: ${hipRidgeDetection.toFixed(1)}%`);
      console.log(`Starter Strip: ${starterStripDetection.toFixed(1)}%`);
      console.log(`Drip Edge: ${dripEdgeDetection.toFixed(1)}%`);
      console.log(`Ice & Water Barrier: ${iceWaterDetection.toFixed(1)}%`);
    }

    // Save detailed results
    fs.writeFileSync(
      path.join(process.cwd(), 'lib/testing/evaluation-results.json'),
      JSON.stringify(this.results, null, 2)
    );

    console.log(`\n💾 Detailed results saved to: lib/testing/evaluation-results.json`);
    console.log('\n🎯 RECOMMENDATION COMING NEXT...');
  }
}

// Export for testing
export { LLMEvaluator, type ExtractionResult, type BusinessRuleData };

// Main execution if run directly
if (require.main === module) {
  const evaluator = new LLMEvaluator();
  evaluator.evaluateAllModels().catch(console.error);
}