/**
 * Quick LLM Evaluation - Test top 3 models for faster results
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';

interface QuickResult {
  model: string;
  provider: string;
  success: boolean;
  processingTime: number;
  cost?: number;
  extractedFields: number;
  error?: string;
}

class QuickEvaluator {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private google: GoogleGenerativeAI;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  async runQuickTest() {
    console.log('🚀 Quick LLM Evaluation - Top 3 Models');
    console.log('='*50);

    // Test with one document first
    const testDoc = 'Evans___Bob_NE_5916_estimate.pdf';
    const pdfPath = path.join(process.cwd(), 'examples', testDoc);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(pdfBuffer);

    const extractionPrompt = `Extract key insurance information from this document and return JSON:
{
  "hipRidgeCap": {"found": boolean, "quality": string},
  "starterStrip": {"found": boolean, "type": string},
  "dripEdge": {"found": boolean, "linearFeet": number},
  "iceWaterBarrier": {"found": boolean, "coverage": string}
}

Document: ${pdfData.text.substring(0, 3000)}...`;

    const results: QuickResult[] = [];

    // Test Claude Sonnet 4
    console.log('🤖 Testing Claude Sonnet 4...');
    try {
      const start = Date.now();
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: extractionPrompt }]
      });
      const processingTime = Date.now() - start;
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const extractedFields = this.countExtractedFields(responseText);
      const cost = (response.usage.input_tokens / 1000000) * 3 + (response.usage.output_tokens / 1000000) * 15;

      results.push({
        model: 'Claude Sonnet 4',
        provider: 'Anthropic',
        success: true,
        processingTime,
        cost,
        extractedFields
      });
      console.log(`  ✅ Success (${processingTime}ms, $${cost.toFixed(4)}, ${extractedFields} fields)`);
    } catch (error) {
      results.push({
        model: 'Claude Sonnet 4',
        provider: 'Anthropic', 
        success: false,
        processingTime: 0,
        extractedFields: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('  ❌ Failed');
    }

    // Test Gemini Flash-Lite (fastest from initial results)
    console.log('🤖 Testing Gemini 2.5 Flash-Lite...');
    try {
      const start = Date.now();
      const model = this.google.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const response = await model.generateContent(extractionPrompt);
      const processingTime = Date.now() - start;
      const responseText = response.response.text();
      const extractedFields = this.countExtractedFields(responseText);
      const estimatedTokens = Math.ceil(extractionPrompt.length / 4) + Math.ceil(responseText.length / 4);
      const cost = (estimatedTokens / 1000000) * 0.10; // Approximate cost

      results.push({
        model: 'Gemini 2.5 Flash-Lite',
        provider: 'Google',
        success: true,
        processingTime,
        cost,
        extractedFields
      });
      console.log(`  ✅ Success (${processingTime}ms, $${cost.toFixed(4)}, ${extractedFields} fields)`);
    } catch (error) {
      results.push({
        model: 'Gemini 2.5 Flash-Lite',
        provider: 'Google',
        success: false,
        processingTime: 0,
        extractedFields: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('  ❌ Failed');
    }

    // Test GPT-5-mini
    console.log('🤖 Testing GPT-5-mini...');
    try {
      const start = Date.now();
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: extractionPrompt }],
        max_completion_tokens: 1000
      });
      const processingTime = Date.now() - start;
      const responseText = response.choices[0]?.message?.content || '';
      const extractedFields = this.countExtractedFields(responseText);
      const cost = ((response.usage?.prompt_tokens || 0) / 1000000) * 0.25 + 
                   ((response.usage?.completion_tokens || 0) / 1000000) * 2;

      results.push({
        model: 'GPT-5-mini',
        provider: 'OpenAI',
        success: true,
        processingTime,
        cost,
        extractedFields
      });
      console.log(`  ✅ Success (${processingTime}ms, $${cost.toFixed(4)}, ${extractedFields} fields)`);
    } catch (error) {
      results.push({
        model: 'GPT-5-mini',
        provider: 'OpenAI',
        success: false,
        processingTime: 0,
        extractedFields: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('  ❌ Failed');
    }

    // Generate quick report
    console.log('\n' + '='*50);
    console.log('📊 QUICK EVALUATION RESULTS');
    console.log('='*50);

    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      // Sort by processing time
      successful.sort((a, b) => a.processingTime - b.processingTime);
      
      console.log('\n🏆 SPEED RANKING:');
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.model}: ${result.processingTime}ms (${result.extractedFields} fields, $${result.cost?.toFixed(4)})`);
      });

      // Sort by cost
      successful.sort((a, b) => (a.cost || 0) - (b.cost || 0));
      
      console.log('\n💰 COST RANKING:');
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.model}: $${result.cost?.toFixed(4)} (${result.processingTime}ms, ${result.extractedFields} fields)`);
      });

      // Sort by extracted fields
      successful.sort((a, b) => b.extractedFields - a.extractedFields);
      
      console.log('\n🎯 ACCURACY RANKING:');
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.model}: ${result.extractedFields} fields (${result.processingTime}ms, $${result.cost?.toFixed(4)})`);
      });
    }

    if (results.some(r => !r.success)) {
      console.log('\n❌ FAILED MODELS:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.model}: ${result.error}`);
      });
    }

    // Save results
    fs.writeFileSync(
      path.join(process.cwd(), 'lib/testing/quick-results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n💾 Results saved to: lib/testing/quick-results.json');
    console.log('\n🎯 RECOMMENDATION:');
    
    if (successful.length > 0) {
      const fastest = successful.reduce((min, r) => r.processingTime < min.processingTime ? r : min);
      const cheapest = successful.reduce((min, r) => (r.cost || 0) < (min.cost || 0) ? r : min);
      const mostAccurate = successful.reduce((max, r) => r.extractedFields > max.extractedFields ? r : max);
      
      console.log(`🏃 Fastest: ${fastest.model} (${fastest.processingTime}ms)`);
      console.log(`💰 Cheapest: ${cheapest.model} ($${cheapest.cost?.toFixed(4)})`);
      console.log(`🎯 Most Accurate: ${mostAccurate.model} (${mostAccurate.extractedFields} fields)`);
    }
  }

  private countExtractedFields(response: string): number {
    // Count how many business rule fields were extracted
    const fields = ['hipRidgeCap', 'starterStrip', 'dripEdge', 'iceWaterBarrier'];
    return fields.filter(field => response.toLowerCase().includes(field.toLowerCase())).length;
  }
}

// Run if executed directly
if (require.main === module) {
  const evaluator = new QuickEvaluator();
  evaluator.runQuickTest().catch(console.error);
}