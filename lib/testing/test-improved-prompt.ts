/**
 * Test Improved Extraction Prompt
 * Compare the enhanced prompt against our previous results
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import pdf from 'pdf-parse';

import { buildImprovedExtractionPrompt } from './improved-extraction-prompt';

interface ImprovedTestResult {
  model: string;
  provider: string;
  document: string;
  timestamp: string;
  processingTime: number;
  cost: number;
  success: boolean;
  extractedData: any;
  fieldsFound: number;
  newFieldsFound: string[];
  error?: string;
}

class ImprovedPromptTester {
  private claude: Anthropic;
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI;
  
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  private countExtractedFields(data: any): number {
    let count = 0;
    
    // Count roof measurements
    if (data.roofMeasurements) {
      Object.values(data.roofMeasurements).forEach(value => {
        if (value !== null && value !== undefined) count++;
      });
    }
    
    // Count materials
    if (data.materials) {
      Object.values(data.materials).forEach((material: any) => {
        if (material && typeof material === 'object') {
          Object.values(material).forEach(value => {
            if (value !== null && value !== undefined) count++;
          });
        }
      });
    }
    
    return count;
  }

  private findNewFields(data: any, previousResults: any): string[] {
    const newFields: string[] = [];
    
    // Check for gutter apron (previously only found by Claude)
    if (data.materials?.gutterApron?.quantity && !previousResults.materials?.gutterApron?.quantity) {
      newFields.push('gutterApron.quantity');
    }
    
    // Check for missing roof measurements
    const roofFields = ['totalArea', 'squares', 'pitch', 'stories', 'eaves', 'rakes', 'ridges', 'valleys'];
    roofFields.forEach(field => {
      if (data.roofMeasurements?.[field] && !previousResults.roofMeasurements?.[field]) {
        newFields.push(`roofMeasurements.${field}`);
      }
    });
    
    // Check for material descriptions
    const materials = ['hipRidgeCap', 'starterStrip', 'dripEdge', 'gutterApron', 'iceWaterBarrier'];
    materials.forEach(material => {
      if (data.materials?.[material]?.description && !previousResults.materials?.[material]?.description) {
        newFields.push(`${material}.description`);
      }
    });
    
    return newFields;
  }

  async testClaudeHaiku(documentPath: string, documentText: string): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: buildImprovedExtractionPrompt(documentText)
        }]
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const cost = (response.usage.input_tokens / 1000000) * 0.80 + (response.usage.output_tokens / 1000000) * 4;

      let extractedData = { roofMeasurements: {}, materials: {} };
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn(`Claude Haiku JSON parsing failed for ${path.basename(documentPath)}`);
      }

      const fieldsFound = this.countExtractedFields(extractedData);

      return {
        model: 'claude-3-5-haiku-20241022',
        provider: 'Anthropic',
        document: path.basename(documentPath),
        timestamp: new Date().toISOString(),
        processingTime,
        cost,
        success: true,
        extractedData,
        fieldsFound,
        newFieldsFound: []
      };

    } catch (error) {
      return {
        model: 'claude-3-5-haiku-20241022',
        provider: 'Anthropic',
        document: path.basename(documentPath),
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cost: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedData: { roofMeasurements: {}, materials: {} },
        fieldsFound: 0,
        newFieldsFound: []
      };
    }
  }

  async testGeminiFlashLite(documentPath: string, documentText: string): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const response = await model.generateContent(buildImprovedExtractionPrompt(documentText));

      const processingTime = Date.now() - startTime;
      const responseText = response.response.text();
      
      const estimatedTokens = Math.ceil(buildImprovedExtractionPrompt(documentText).length / 4) + Math.ceil(responseText.length / 4);
      const cost = (estimatedTokens / 1000000) * 0.10;

      let extractedData = { roofMeasurements: {}, materials: {} };
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn(`Gemini Flash-Lite JSON parsing failed for ${path.basename(documentPath)}`);
      }

      const fieldsFound = this.countExtractedFields(extractedData);

      return {
        model: 'gemini-2.5-flash-lite',
        provider: 'Google',
        document: path.basename(documentPath),
        timestamp: new Date().toISOString(),
        processingTime,
        cost,
        success: true,
        extractedData,
        fieldsFound,
        newFieldsFound: []
      };

    } catch (error) {
      return {
        model: 'gemini-2.5-flash-lite',
        provider: 'Google',
        document: path.basename(documentPath),
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cost: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedData: { roofMeasurements: {}, materials: {} },
        fieldsFound: 0,
        newFieldsFound: []
      };
    }
  }

  async testGPT5Mini(documentPath: string, documentText: string): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [{
          role: 'user',
          content: buildImprovedExtractionPrompt(documentText)
        }],
        max_completion_tokens: 4000
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.choices[0]?.message?.content || '';
      const cost = ((response.usage?.prompt_tokens || 0) / 1000000) * 0.25 + 
                   ((response.usage?.completion_tokens || 0) / 1000000) * 2;

      let extractedData = { roofMeasurements: {}, materials: {} };
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn(`GPT-5-mini JSON parsing failed for ${path.basename(documentPath)}`);
      }

      const fieldsFound = this.countExtractedFields(extractedData);

      return {
        model: 'gpt-5-mini',
        provider: 'OpenAI',
        document: path.basename(documentPath),
        timestamp: new Date().toISOString(),
        processingTime,
        cost,
        success: true,
        extractedData,
        fieldsFound,
        newFieldsFound: []
      };

    } catch (error) {
      return {
        model: 'gpt-5-mini',
        provider: 'OpenAI',
        document: path.basename(documentPath),
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cost: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedData: { roofMeasurements: {}, materials: {} },
        fieldsFound: 0,
        newFieldsFound: []
      };
    }
  }

  async runImprovedTest() {
    console.log('🚀 Testing Improved Extraction Prompt');
    console.log('='*50);
    console.log('Models: Claude Haiku 3.5, Gemini Flash-Lite, GPT-5-mini');
    console.log('Enhanced prompt with comprehensive terminology coverage\n');

    // Load previous results for comparison
    let previousResults: any = {};
    try {
      const prevData = fs.readFileSync(path.join(process.cwd(), 'lib/testing/extraction-comparison-results.json'), 'utf8');
      previousResults = JSON.parse(prevData);
    } catch (e) {
      console.log('No previous results found for comparison');
    }

    const results: ImprovedTestResult[] = [];
    const examplesDir = path.join(process.cwd(), 'examples');
    const documents = fs.readdirSync(examplesDir)
      .filter(file => file.endsWith('.pdf'))
      .slice(0, 3); // Test with 3 documents for comparison

    console.log(`📄 Documents to process: ${documents.length}`);
    documents.forEach((doc, i) => console.log(`${i+1}. ${doc}`));
    console.log();

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const documentPath = path.join(examplesDir, document);
      
      console.log(`📄 Processing ${i+1}/${documents.length}: ${document}`);
      
      const pdfBuffer = fs.readFileSync(documentPath);
      const pdfData = await pdf(pdfBuffer);
      
      // Find previous results for this document
      const prevDocResults = previousResults.results?.filter((r: any) => r.document === document) || [];
      
      // Test with all 3 models
      console.log('  🤖 Testing Claude Haiku 3.5...');
      const claudeResult = await this.testClaudeHaiku(documentPath, pdfData.text);
      const prevClaude = prevDocResults.find((r: any) => r.model.includes('haiku'));
      if (prevClaude) {
        claudeResult.newFieldsFound = this.findNewFields(claudeResult.extractedData, prevClaude.extractedData);
      }
      results.push(claudeResult);
      console.log(`    ${claudeResult.success ? '✅' : '❌'} ${claudeResult.processingTime}ms, ${claudeResult.fieldsFound} fields, ${claudeResult.newFieldsFound.length} new`);
      
      console.log('  🤖 Testing Gemini Flash-Lite...');
      const geminiResult = await this.testGeminiFlashLite(documentPath, pdfData.text);
      const prevGemini = prevDocResults.find((r: any) => r.model.includes('flash-lite'));
      if (prevGemini) {
        geminiResult.newFieldsFound = this.findNewFields(geminiResult.extractedData, prevGemini.extractedData);
      }
      results.push(geminiResult);
      console.log(`    ${geminiResult.success ? '✅' : '❌'} ${geminiResult.processingTime}ms, ${geminiResult.fieldsFound} fields, ${geminiResult.newFieldsFound.length} new`);
      
      console.log('  🤖 Testing GPT-5-mini...');
      const gptResult = await this.testGPT5Mini(documentPath, pdfData.text);
      const prevGPT = prevDocResults.find((r: any) => r.model.includes('gpt-5-mini'));
      if (prevGPT) {
        gptResult.newFieldsFound = this.findNewFields(gptResult.extractedData, prevGPT.extractedData);
      }
      results.push(gptResult);
      console.log(`    ${gptResult.success ? '✅' : '❌'} ${gptResult.processingTime}ms, ${gptResult.fieldsFound} fields, ${gptResult.newFieldsFound.length} new`);
      
      console.log();
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    fs.writeFileSync(
      path.join(process.cwd(), 'lib/testing/improved-prompt-results.json'),
      JSON.stringify({
        testRun: timestamp,
        testType: 'improved-prompt-comparison',
        promptVersion: 'v2-comprehensive-terminology',
        results
      }, null, 2)
    );

    // Generate comparison report
    this.generateImprovementReport(results);

    console.log('\n🎉 Improved prompt test completed!');
    console.log('\n📁 Results saved:');
    console.log('  • lib/testing/improved-prompt-results.json');
    console.log('  • lib/testing/IMPROVEMENT_REPORT.md');
    
    // Quick summary
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    const avgFields = results.reduce((sum, r) => sum + r.fieldsFound, 0) / results.length;
    const totalNewFields = results.reduce((sum, r) => sum + r.newFieldsFound.length, 0);
    
    console.log('\n📊 Quick Summary:');
    console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`  Average Time: ${avgTime.toFixed(0)}ms`);
    console.log(`  Average Fields Extracted: ${avgFields.toFixed(1)}`);
    console.log(`  Total New Fields Found: ${totalNewFields}`);
  }

  private generateImprovementReport(results: ImprovedTestResult[]) {
    let report = '# Improved Prompt Test Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Prompt Version**: v2-comprehensive-terminology\n`;
    report += `**Test Goal**: Improve extraction accuracy with detailed terminology\n\n`;

    // Model performance comparison
    const modelStats = new Map<string, { fieldsFound: number; newFields: number; avgTime: number; avgCost: number }>();
    
    results.forEach(result => {
      if (!modelStats.has(result.model)) {
        modelStats.set(result.model, { fieldsFound: 0, newFields: 0, avgTime: 0, avgCost: 0 });
      }
      const stats = modelStats.get(result.model)!;
      stats.fieldsFound += result.fieldsFound;
      stats.newFields += result.newFieldsFound.length;
      stats.avgTime += result.processingTime;
      stats.avgCost += result.cost;
    });

    report += '## 📊 Model Performance with Improved Prompt\n\n';
    modelStats.forEach((stats, model) => {
      const count = results.filter(r => r.model === model).length;
      report += `### ${model}\n`;
      report += `- **Average Fields Extracted**: ${(stats.fieldsFound / count).toFixed(1)}\n`;
      report += `- **New Fields Found**: ${stats.newFields}\n`;
      report += `- **Average Time**: ${(stats.avgTime / count).toFixed(0)}ms\n`;
      report += `- **Average Cost**: $${(stats.avgCost / count).toFixed(4)}\n\n`;
    });

    // Document-by-document improvements
    report += '## 📄 Document-by-Document Improvements\n\n';
    const documents = [...new Set(results.map(r => r.document))];
    
    documents.forEach(document => {
      const docResults = results.filter(r => r.document === document);
      report += `### ${document}\n\n`;
      
      docResults.forEach(result => {
        const modelName = result.model.includes('haiku') ? 'Claude Haiku' :
                         result.model.includes('flash-lite') ? 'Gemini Flash-Lite' : 'GPT-5-mini';
        
        report += `**${modelName}**:\n`;
        report += `- Fields extracted: ${result.fieldsFound}\n`;
        if (result.newFieldsFound.length > 0) {
          report += `- New fields: ${result.newFieldsFound.join(', ')}\n`;
        }
        report += '\n';
      });
    });

    fs.writeFileSync(
      path.join(process.cwd(), 'lib/testing/IMPROVEMENT_REPORT.md'),
      report
    );
  }
}

if (require.main === module) {
  const tester = new ImprovedPromptTester();
  tester.runImprovedTest().catch(console.error);
}