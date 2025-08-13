/**
 * Direct PDF Test
 * Test feeding raw PDF files directly to models
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

class DirectPdfTester {
  private claude: Anthropic;
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI;
  
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  private buildExtractionPrompt(): string {
    return `Extract these specific values from this insurance estimate document:

ROOF MEASUREMENTS:
- Total Area (in SF)
- Squares 
- Pitch
- Stories
- Eaves (in LF)
- Rakes (in LF)
- Ridges (in LF)
- Valleys (in LF)

MATERIALS:
- Hip/Ridge Cap: quantity, unit, description
- Starter Strip: quantity, unit, description  
- Drip Edge: quantity, unit, description
- Gutter Apron: quantity, unit, description
- Ice & Water Barrier: quantity, unit, description

Return only JSON in this format:
{
  "roofMeasurements": {
    "totalArea": number,
    "squares": number,
    "pitch": "string",
    "stories": number,
    "eaves": number,
    "rakes": number,
    "ridges": number,
    "valleys": number
  },
  "materials": {
    "hipRidgeCap": {"quantity": number, "unit": "string", "description": "string"},
    "starterStrip": {"quantity": number, "unit": "string", "description": "string"},
    "dripEdge": {"quantity": number, "unit": "string", "description": "string"},
    "gutterApron": {"quantity": number, "unit": "string", "description": "string"},
    "iceWaterBarrier": {"quantity": number, "unit": "string", "description": "string"}
  }
}`;
  }

  async testClaudeSonnet4WithPdf(pdfPath: string): Promise<any> {
    console.log('🤖 Testing Claude Sonnet 4 with raw PDF...');
    
    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const base64Pdf = pdfBuffer.toString('base64');
      
      // Try Claude with PDF
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.buildExtractionPrompt()
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf
              }
            }
          ]
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('✅ Claude Sonnet 4 accepted PDF directly!');
      return { success: true, response: responseText };
      
    } catch (error) {
      console.log('❌ Claude Sonnet 4 PDF error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async testGeminiWithPdf(pdfPath: string): Promise<any> {
    console.log('🤖 Testing Gemini Flash with raw PDF...');
    
    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      const model = this.gemini.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1
        }
      });

      // Try Gemini with PDF as file data
      const result = await model.generateContent([
        this.buildExtractionPrompt(),
        {
          inlineData: {
            data: pdfBuffer.toString('base64'),
            mimeType: 'application/pdf'
          }
        }
      ]);

      const responseText = result.response.text();
      console.log('✅ Gemini Flash accepted PDF directly!');
      return { success: true, response: responseText };
      
    } catch (error) {
      console.log('❌ Gemini Flash PDF error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async testGPT5WithPdf(pdfPath: string): Promise<any> {
    console.log('🤖 Testing GPT-5 with raw PDF...');
    
    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      // Try GPT-5 with PDF (not sure if supported)
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.buildExtractionPrompt()
            },
            {
              type: 'document',
              document: pdfBuffer.toString('base64'),
              document_type: 'pdf'
            }
          ]
        }],
        max_completion_tokens: 4000
      });

      const responseText = response.choices[0]?.message?.content || '';
      console.log('✅ GPT-5 accepted PDF directly!');
      return { success: true, response: responseText };
      
    } catch (error) {
      console.log('❌ GPT-5 PDF error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async testClaudeHaikuWithPdf(pdfPath: string): Promise<any> {
    console.log('🤖 Testing Claude Haiku 3.5 with raw PDF...');
    
    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const base64Pdf = pdfBuffer.toString('base64');
      
      // Try Claude Haiku with PDF
      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.buildExtractionPrompt()
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf
              }
            }
          ]
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('✅ Claude Haiku 3.5 accepted PDF directly!');
      return { success: true, response: responseText };
      
    } catch (error) {
      console.log('❌ Claude Haiku 3.5 PDF error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async runDirectPdfTest() {
    console.log('📄 DIRECT PDF FEEDING TEST');
    console.log('='.repeat(50));
    console.log('Testing if models can accept raw PDF files directly\n');

    const testFile = 'Evans___Bob_NE_5916_estimate.pdf';
    const documentPath = path.join(process.cwd(), 'examples', testFile);
    
    if (!fs.existsSync(documentPath)) {
      console.log('❌ Test file not found:', testFile);
      return;
    }

    console.log(`📄 Testing with: ${testFile}\n`);

    // Test each model with direct PDF
    const claudeSonnetResult = await this.testClaudeSonnet4WithPdf(documentPath);
    console.log();
    
    const claudeHaikuResult = await this.testClaudeHaikuWithPdf(documentPath);
    console.log();
    
    const geminiResult = await this.testGeminiWithPdf(documentPath);
    console.log();
    
    const gptResult = await this.testGPT5WithPdf(documentPath);
    console.log();

    // Summary
    console.log('📊 DIRECT PDF SUPPORT SUMMARY:');
    console.log(`  Claude Sonnet 4: ${claudeSonnetResult.success ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);
    console.log(`  Claude Haiku 3.5: ${claudeHaikuResult.success ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);
    console.log(`  Gemini Flash: ${geminiResult.success ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);
    console.log(`  GPT-5: ${gptResult.success ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);

    const supportedModels = [claudeSonnetResult, claudeHaikuResult, geminiResult, gptResult].filter(r => r.success);
    
    if (supportedModels.length > 0) {
      console.log(`\n🎉 ${supportedModels.length} model(s) support direct PDF input!`);
      console.log('💡 Next step: Test extraction accuracy with supported models');
      
      // Show a sample response if available
      const sampleResult = supportedModels[0];
      if (sampleResult.response) {
        console.log('\n📝 Sample extraction result:');
        console.log('-'.repeat(30));
        console.log(sampleResult.response.substring(0, 500) + '...');
      }
    } else {
      console.log('\n❌ No models support direct PDF input');
      console.log('💡 Next step: Use pdf2pic to convert PDFs to images');
    }
  }
}

if (require.main === module) {
  const tester = new DirectPdfTester();
  tester.runDirectPdfTest().catch(console.error);
}