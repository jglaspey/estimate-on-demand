/**
 * PDF to Image Extraction Test
 * Convert PDFs to images and test extraction using vision models
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';

interface VisionExtractionResult {
  document: string;
  pageCount: number;
  claudeSonnet4: any;
  claudeHaiku: any;
  geminiFlash: any;
  gpt5Mini: any;
  allMatch: boolean;
  differences: string[];
}

class PdfToImageExtractor {
  private claude: Anthropic;
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI;
  
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  private buildVisionPrompt(): string {
    return `You are looking at an insurance roofing estimate document. Extract these specific values:

ROOF MEASUREMENTS:
- Total Area (in SF)
- Squares (total area ÷ 100)
- Pitch (e.g., "7/12")
- Stories (building levels)
- Eaves (in LF)
- Rakes (in LF)
- Ridges (in LF)
- Valleys (in LF)

MATERIALS:
- Hip/Ridge Cap: quantity in LF, description
- Starter Strip: quantity in LF, description
- Drip Edge: quantity in LF, description
- Gutter Apron: quantity in LF, description (look for "Counterflashing" or "Apron flashing")
- Ice & Water Barrier: quantity in SF or LF, description

CRITICAL: Extract exact numbers as shown. Return null for missing fields, not 0.

Return only this JSON structure:
{
  "totalArea": number|null,
  "squares": number|null,
  "pitch": "string"|null,
  "stories": number|null,
  "eaves": number|null,
  "rakes": number|null,
  "ridges": number|null,
  "valleys": number|null,
  "hipRidgeCapQuantity": number|null,
  "hipRidgeCapDescription": "string"|null,
  "starterStripQuantity": number|null,
  "starterStripDescription": "string"|null,
  "dripEdgeQuantity": number|null,
  "dripEdgeDescription": "string"|null,
  "gutterApronQuantity": number|null,
  "gutterApronDescription": "string"|null,
  "iceWaterBarrierQuantity": number|null,
  "iceWaterBarrierDescription": "string"|null
}`;
  }

  async convertPdfToImages(pdfPath: string): Promise<string[]> {
    console.log('  📸 Converting PDF to images...');
    
    const outputDir = path.join(process.cwd(), 'temp', 'pdf-images');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
      density: 200,      // DPI for better quality
      saveFilename: path.basename(pdfPath, '.pdf'),
      savePath: outputDir,
      format: 'png',
      width: 2000,       // Max width for clarity
      height: 2600      // Max height for clarity
    };

    const converter = fromPath(pdfPath, options);
    const imagePaths: string[] = [];

    try {
      // Convert first 3 pages max (most estimates are 1-2 pages)
      for (let i = 1; i <= 3; i++) {
        try {
          const result = await converter(i);
          if (result.path) {
            imagePaths.push(result.path);
            console.log(`    ✅ Page ${i} converted`);
          }
        } catch (error) {
          // No more pages
          break;
        }
      }
    } catch (error) {
      console.error('    ❌ PDF conversion error:', error);
    }

    return imagePaths;
  }

  async extractWithClaudeSonnet4(imagePaths: string[]): Promise<any> {
    try {
      // Convert images to base64
      const imageContents = imagePaths.map(imgPath => {
        const imageBuffer = fs.readFileSync(imgPath);
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/png' as const,
            data: imageBuffer.toString('base64')
          }
        };
      });

      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: this.buildVisionPrompt() },
            ...imageContents
          ]
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('    Claude Sonnet 4 vision extraction failed:', error);
    }
    
    return null;
  }

  async extractWithClaudeHaiku(imagePaths: string[]): Promise<any> {
    try {
      const imageContents = imagePaths.map(imgPath => {
        const imageBuffer = fs.readFileSync(imgPath);
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/png' as const,
            data: imageBuffer.toString('base64')
          }
        };
      });

      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: this.buildVisionPrompt() },
            ...imageContents
          ]
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('    Claude Haiku vision extraction failed:', error);
    }
    
    return null;
  }

  async extractWithGeminiFlash(imagePaths: string[]): Promise<any> {
    try {
      const model = this.gemini.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1
        }
      });

      // Gemini expects images as inline data
      const imageParts = imagePaths.map(imgPath => {
        const imageBuffer = fs.readFileSync(imgPath);
        return {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/png'
          }
        };
      });

      const result = await model.generateContent([
        this.buildVisionPrompt(),
        ...imageParts
      ]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('    Gemini Flash vision extraction failed:', error);
    }
    
    return null;
  }

  async extractWithGPT5Mini(imagePaths: string[]): Promise<any> {
    try {
      // Convert images to base64 URLs for GPT
      const imageUrls = imagePaths.map(imgPath => {
        const imageBuffer = fs.readFileSync(imgPath);
        const base64 = imageBuffer.toString('base64');
        return {
          type: 'image_url' as const,
          image_url: {
            url: `data:image/png;base64,${base64}`
          }
        };
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: this.buildVisionPrompt() },
            ...imageUrls
          ]
        }],
        max_completion_tokens: 4000,
        temperature: 0
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('    GPT-5-mini vision extraction failed:', error);
    }
    
    return null;
  }

  private compareExtractions(results: any[]): { allMatch: boolean; differences: string[] } {
    const differences: string[] = [];
    
    // Get all fields from all results
    const allFields = new Set<string>();
    results.forEach(result => {
      if (result) {
        Object.keys(result).forEach(key => allFields.add(key));
      }
    });

    // Compare each field across all models
    for (const field of allFields) {
      const values = results.map(r => r ? r[field] : undefined);
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
      
      if (uniqueValues.length > 1) {
        const fieldValues = results.map((r, i) => 
          `${['Sonnet4', 'Haiku', 'Gemini', 'GPT5m'][i]}=${JSON.stringify(r ? r[field] : undefined)}`
        ).join(', ');
        differences.push(`${field}: ${fieldValues}`);
      }
    }

    return {
      allMatch: differences.length === 0,
      differences
    };
  }

  async testVisionExtraction() {
    console.log('👁️  PDF TO IMAGE VISION EXTRACTION TEST');
    console.log('='.repeat(60));
    console.log('Converting PDFs to images and testing vision model extraction\n');

    const examplesDir = path.join(process.cwd(), 'examples');
    const documents = fs.readdirSync(examplesDir)
      .filter(file => file.endsWith('.pdf') && file.includes('estimate'))
      .slice(0, 3); // Test with 3 documents first

    if (documents.length === 0) {
      console.log('❌ No estimate PDFs found');
      return;
    }

    const results: VisionExtractionResult[] = [];

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const pdfPath = path.join(examplesDir, document);
      
      console.log(`\n📄 Document ${i + 1}/${documents.length}: ${document}`);
      
      // Convert PDF to images
      const imagePaths = await this.convertPdfToImages(pdfPath);
      
      if (imagePaths.length === 0) {
        console.log('  ❌ Failed to convert PDF to images');
        continue;
      }
      
      console.log(`  📑 Converted to ${imagePaths.length} image(s)`);
      
      // Test with each vision model
      console.log('  🤖 Testing Claude Sonnet 4 (vision)...');
      const sonnet4Result = await this.extractWithClaudeSonnet4(imagePaths);
      
      console.log('  🤖 Testing Claude Haiku 3.5 (vision)...');
      const haikuResult = await this.extractWithClaudeHaiku(imagePaths);
      
      console.log('  🤖 Testing Gemini Flash (vision)...');
      const geminiResult = await this.extractWithGeminiFlash(imagePaths);
      
      console.log('  🤖 Testing GPT-5-mini (vision)...');
      const gpt5MiniResult = await this.extractWithGPT5Mini(imagePaths);
      
      // Compare results
      const comparison = this.compareExtractions([
        sonnet4Result,
        haikuResult,
        geminiResult,
        gpt5MiniResult
      ]);
      
      const result: VisionExtractionResult = {
        document,
        pageCount: imagePaths.length,
        claudeSonnet4: sonnet4Result,
        claudeHaiku: haikuResult,
        geminiFlash: geminiResult,
        gpt5Mini: gpt5MiniResult,
        allMatch: comparison.allMatch,
        differences: comparison.differences
      };
      
      results.push(result);
      
      console.log(`  ${comparison.allMatch ? '✅ PERFECT MATCH!' : `❌ ${comparison.differences.length} differences found`}`);
      
      // Clean up temp images
      imagePaths.forEach(imgPath => {
        try {
          fs.unlinkSync(imgPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    }

    // Generate report
    this.generateVisionExtractionReport(results);
    
    // Summary
    const perfectMatches = results.filter(r => r.allMatch).length;
    console.log(`\n🎯 VISION EXTRACTION RESULTS:`);
    console.log(`  Perfect Matches: ${perfectMatches}/${results.length} documents`);
    console.log(`  Success Rate: ${(perfectMatches/results.length*100).toFixed(1)}%`);
    
    if (perfectMatches === results.length) {
      console.log(`  ✅ BREAKTHROUGH! Vision extraction achieves perfect consistency!`);
    } else if (perfectMatches > results.length / 2) {
      console.log(`  🎉 Major improvement with vision approach!`);
    } else {
      console.log(`  📊 Vision extraction shows mixed results`);
    }
    
    console.log(`\n📁 Detailed report: lib/testing/VISION_EXTRACTION_RESULTS.md`);
  }

  private generateVisionExtractionReport(results: VisionExtractionResult[]) {
    let report = '# Vision-Based PDF Extraction Results\n\n';
    report += `**Test Date**: ${new Date().toISOString()}\n`;
    report += `**Method**: PDF converted to images, then vision model extraction\n`;
    report += `**Models**: Claude Sonnet 4, Claude Haiku 3.5, Gemini Flash, GPT-5-mini\n\n`;

    // Summary
    report += '## Summary\n\n';
    report += '| Document | Pages | Perfect Match | Differences |\n';
    report += '|----------|-------|---------------|-------------|\n';
    
    results.forEach(result => {
      const status = result.allMatch ? '✅ YES' : '❌ NO';
      const diffCount = result.differences.length;
      report += `| ${result.document} | ${result.pageCount} | ${status} | ${diffCount} |\n`;
    });
    
    const perfectMatches = results.filter(r => r.allMatch).length;
    report += `\n**Success Rate: ${perfectMatches}/${results.length} (${(perfectMatches/results.length*100).toFixed(1)}%)**\n\n`;

    // Detailed analysis
    report += '## Detailed Analysis\n\n';
    
    results.forEach(result => {
      report += `### ${result.document}\n\n`;
      report += `- **Pages**: ${result.pageCount}\n`;
      
      if (result.allMatch) {
        report += '- ✅ **Perfect Match** - All models extracted identical values\n\n';
        
        // Show sample extracted values
        if (result.claudeSonnet4) {
          const sampleFields = ['totalArea', 'hipRidgeCapQuantity', 'gutterApronQuantity'];
          report += 'Sample extracted values:\n';
          sampleFields.forEach(field => {
            const value = result.claudeSonnet4[field];
            if (value !== undefined && value !== null) {
              report += `- ${field}: ${JSON.stringify(value)}\n`;
            }
          });
        }
      } else {
        report += `- ❌ **Differences Found** (${result.differences.length})\n\n`;
        report += 'Discrepancies:\n';
        result.differences.slice(0, 5).forEach(diff => {
          report += `- ${diff}\n`;
        });
        if (result.differences.length > 5) {
          report += `- ... and ${result.differences.length - 5} more\n`;
        }
      }
      report += '\n';
    });

    // Comparison to previous methods
    report += '## Method Comparison\n\n';
    report += '| Method | Success Rate | Notes |\n';
    report += '|--------|--------------|-------|\n';
    report += '| Text Parsing | 40% | pdf-parse destroys structure |\n';
    report += '| Direct PDF | 0% | Complex prompt caused confusion |\n';
    report += `| Vision (Images) | ${(perfectMatches/results.length*100).toFixed(1)}% | This test |\n\n`;

    // Recommendations
    report += '## Recommendations\n\n';
    if (perfectMatches === results.length) {
      report += '🎉 **VISION EXTRACTION IS THE SOLUTION!**\n\n';
      report += '- Perfect consistency achieved across all models\n';
      report += '- PDF structure preserved through visual representation\n';
      report += '- Proceed with vision-based extraction pipeline\n';
    } else {
      report += '📊 **VISION SHOWS PROMISE**\n\n';
      report += '- Better than direct PDF approach\n';
      report += '- May need prompt refinement for consistency\n';
      report += '- Consider model-specific optimizations\n';
    }

    fs.writeFileSync(
      path.join(process.cwd(), 'lib/testing/VISION_EXTRACTION_RESULTS.md'),
      report
    );
  }
}

if (require.main === module) {
  const extractor = new PdfToImageExtractor();
  extractor.testVisionExtraction().catch(console.error);
}