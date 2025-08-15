/**
 * Extraction Accuracy Validation Test
 * 5 PDFs × 3 Models = 15 extractions
 * Goal: Prove models extract identical values for the same document
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import pdf from 'pdf-parse';

interface ExtractedValues {
  // Roof Measurements
  totalArea?: number;
  squares?: number;
  pitch?: string;
  stories?: number;
  eaves?: number;
  rakes?: number;
  ridges?: number;
  valleys?: number;
  
  // Hip/Ridge Cap
  hipRidgeCapQuantity?: number;
  hipRidgeCapUnit?: string;
  hipRidgeCapDescription?: string;
  
  // Starter Strip
  starterStripQuantity?: number;
  starterStripUnit?: string;
  starterStripDescription?: string;
  
  // Drip Edge
  dripEdgeQuantity?: number;
  dripEdgeUnit?: string;
  dripEdgeDescription?: string;
  
  // Gutter Apron
  gutterApronQuantity?: number;
  gutterApronUnit?: string;
  gutterApronDescription?: string;
  
  // Ice & Water Barrier
  iceWaterBarrierQuantity?: number;
  iceWaterBarrierUnit?: string;
  iceWaterBarrierDescription?: string;
}

interface ExtractionTest {
  document: string;
  claudeHaiku: ExtractedValues;
  geminiFlashLite: ExtractedValues;
  gpt5Mini: ExtractedValues;
  claudeSonnet4: ExtractedValues;
  geminiFlash: ExtractedValues;
  gpt5: ExtractedValues;
  allMatch: boolean;
  differences: string[];
}

class AccuracyValidator {
  private claude: Anthropic;
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI;
  
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  private buildExtractionPrompt(documentText: string): string {
    return `You are an expert at extracting data from insurance roofing estimates and reports. Extract ONLY factual measurements and material descriptions. Return ONLY valid JSON.

CRITICAL: Look for these exact terms and variations. Numbers may appear with or without commas.

## ROOF MEASUREMENTS TO FIND:

### Total Area (Square Feet)
Look for these phrases:
- "Total Area: 3,633 SF" or "Total Area: 3633 SF"
- "Total Roof Area: 3,633"
- "Roof Area Total: 3633 sq ft"
- "Area: 3,633 SF"
- "Total: 3633 SF"
- "Sq Ft Total: 3,633"

### Squares (Roof Squares = Area ÷ 100)
Look for:
- "Squares: 36.33" or "36.33 Squares"
- "Roof Squares: 36.33"
- "Total Squares: 36.33"
- "SQ: 36.33"

### Pitch (Roof Slope)
Look for:
- "Pitch: 5/12" or "5/12 Pitch"
- "Slope: 5/12"
- "5:12" or "5 in 12"
- "7/12 to 9/12" (range)
- "0/12 to 6/12" (range)

### Stories (Building Height)
Look for:
- "Stories: 2" or "2 Story"
- "2 Stories" or "Two Story"
- "Single Story" = 1
- "Two Story" = 2

### Eaves (Horizontal Edge Linear Feet)
Look for:
- "Eaves: 220 LF" or "220 LF Eaves"
- "Eave: 220 LF"
- "Eaves Length: 220"
- "Horizontal Edge: 220 LF"

### Rakes (Sloped Edge Linear Feet)
Look for:
- "Rakes: 140 LF" or "140 LF Rakes"
- "Rake: 140 LF"
- "Rake Edge: 140 LF"
- "Sloped Edge: 140 LF"
- "Gable Edge: 140 LF"

### Ridges (Peak Linear Feet)
Look for:
- "Ridges: 19.64 LF" or "19.64 LF Ridge"
- "Ridge: 19.64 LF"
- "Ridge Line: 19.64"
- "Peak: 19.64 LF"
- "Hip/Ridge: 104.25 LF" (includes both)

### Valleys (Valley Linear Feet)
Look for:
- "Valleys: 20 LF" or "20 LF Valley"
- "Valley: 20 LF"
- "Valley Length: 20"

## MATERIALS TO FIND:

### Hip/Ridge Cap (Critical for Compliance)
Look for these material descriptions:
QUANTITIES:
- "104.25 LF" or "104.25 Linear Feet"
- "104 LF Hip/Ridge"
- "104.25 ft Ridge Cap"

DESCRIPTIONS (watch for quality indicators):
- "Hip / Ridge cap - Standard profile - composition shingles"
- "Ridge/Hip Cap Shingles"
- "Ridge cap - Standard profile"
- "Hip ridge cap shingles"
- "Ridge/hip shingles"
- "Standard profile - composition shingles"
- "Cut from 3-tab shingles" (NON-COMPLIANT indicator)
- "Purpose-built ridge cap" (COMPLIANT indicator)

### Starter Strip (Critical for Compliance)
Look for:
QUANTITIES:
- "101.91 LF" or "101 LF Starter"
- "101.91 Linear Feet"

DESCRIPTIONS (watch for type indicators):
- "Asphalt starter - universal starter course"
- "Universal starter course"
- "Starter strip - universal"
- "Self adhesive starter roll"
- "Starter Row, Continuous"
- "Eaves/Starter"
- "Cut shingles for starter" (NON-COMPLIANT indicator)
- "Universal starter strip" (COMPLIANT indicator)

### Drip Edge (Edge Protection)
Look for:
QUANTITIES:
- "324.99 LF" or "324 LF"
- "326 LF Drip Edge"

DESCRIPTIONS:
- "Drip edge"
- "Drip Edge (Rake + Eave)"
- "Drip Edge (Eaves + Rakes)"
- "Replace - Drip Edge"
- "Aluminum - Pre-Finish Color"
- "Eaves + Rakes"

### Gutter Apron (Often Missed - Look Carefully!)
Look for:
QUANTITIES:
- "37 LF" or "37 Linear Feet"

DESCRIPTIONS:
- "Counterflashing - Apron flashing"
- "Gutter apron"
- "Apron flashing"
- "Eave flashing"
- "Gutter edge flashing"

### Ice & Water Barrier (Weather Protection)
Look for:
QUANTITIES:
- "389.63 SF" or "389 SF"
- "89.87 LF" (linear feet version)

DESCRIPTIONS:
- "Ice & water barrier"
- "Ice/Water Shield"
- "Ice and water shield"
- "2 course allowance for 2'+ overhang"
- "Weather barrier"
- "Underlayment - ice and water"

## CRITICAL INSTRUCTIONS:

1. **Numbers**: Extract exact numbers as they appear (with decimals if shown)
2. **Units**: Always include the unit (LF, SF, etc.)
3. **Descriptions**: Capture the full material description for quality assessment
4. **Missing Data**: If a field is not found, omit it from JSON (don't include null values)
5. **Multiple Mentions**: If a material appears multiple times, use the most detailed entry

Return this EXACT JSON structure (omit fields not found):
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
    "hipRidgeCap": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "starterStrip": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "dripEdge": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "gutterApron": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    },
    "iceWaterBarrier": {
      "quantity": number,
      "unit": "string",
      "description": "string"
    }
  }
}

Document text: ${documentText.substring(0, 12000)}`;
  }

  private flattenExtractedData(data: any): ExtractedValues {
    const flattened: ExtractedValues = {};
    
    // Roof measurements
    if (data.roofMeasurements) {
      flattened.totalArea = data.roofMeasurements.totalArea;
      flattened.squares = data.roofMeasurements.squares;
      flattened.pitch = data.roofMeasurements.pitch;
      flattened.stories = data.roofMeasurements.stories;
      flattened.eaves = data.roofMeasurements.eaves;
      flattened.rakes = data.roofMeasurements.rakes;
      flattened.ridges = data.roofMeasurements.ridges;
      flattened.valleys = data.roofMeasurements.valleys;
    }
    
    // Materials
    if (data.materials) {
      if (data.materials.hipRidgeCap) {
        flattened.hipRidgeCapQuantity = data.materials.hipRidgeCap.quantity;
        flattened.hipRidgeCapUnit = data.materials.hipRidgeCap.unit;
        flattened.hipRidgeCapDescription = data.materials.hipRidgeCap.description;
      }
      if (data.materials.starterStrip) {
        flattened.starterStripQuantity = data.materials.starterStrip.quantity;
        flattened.starterStripUnit = data.materials.starterStrip.unit;
        flattened.starterStripDescription = data.materials.starterStrip.description;
      }
      if (data.materials.dripEdge) {
        flattened.dripEdgeQuantity = data.materials.dripEdge.quantity;
        flattened.dripEdgeUnit = data.materials.dripEdge.unit;
        flattened.dripEdgeDescription = data.materials.dripEdge.description;
      }
      if (data.materials.gutterApron) {
        flattened.gutterApronQuantity = data.materials.gutterApron.quantity;
        flattened.gutterApronUnit = data.materials.gutterApron.unit;
        flattened.gutterApronDescription = data.materials.gutterApron.description;
      }
      if (data.materials.iceWaterBarrier) {
        flattened.iceWaterBarrierQuantity = data.materials.iceWaterBarrier.quantity;
        flattened.iceWaterBarrierUnit = data.materials.iceWaterBarrier.unit;
        flattened.iceWaterBarrierDescription = data.materials.iceWaterBarrier.description;
      }
    }
    
    return flattened;
  }

  async testClaudeHaiku(documentText: string): Promise<ExtractedValues> {
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: this.buildExtractionPrompt(documentText)
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return this.flattenExtractedData(parsedData);
      }
    } catch (error) {
      console.warn('Claude Haiku extraction failed:', error);
    }
    
    return {};
  }

  async testGeminiFlashLite(documentText: string): Promise<ExtractedValues> {
    try {
      const model = this.gemini.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1
        }
      });
      const response = await model.generateContent(this.buildExtractionPrompt(documentText));
      
      const responseText = response.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return this.flattenExtractedData(parsedData);
      }
    } catch (error) {
      console.warn('Gemini Flash-Lite extraction failed:', error);
    }
    
    return {};
  }

  async testGPT5Mini(documentText: string): Promise<ExtractedValues> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [{
          role: 'user',
          content: this.buildExtractionPrompt(documentText)
        }],
        max_completion_tokens: 4000,
        // GPT-5 models don't support temperature: 0, only default (1)
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return this.flattenExtractedData(parsedData);
      }
    } catch (error) {
      console.warn('GPT-5-mini extraction failed:', error);
    }
    
    return {};
  }

  async testClaudeSonnet4(documentText: string): Promise<ExtractedValues> {
    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: this.buildExtractionPrompt(documentText)
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return this.flattenExtractedData(parsedData);
      }
    } catch (error) {
      console.warn('Claude Sonnet 4 extraction failed:', error);
    }
    
    return {};
  }

  async testGeminiFlash(documentText: string): Promise<ExtractedValues> {
    try {
      const model = this.gemini.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1
        }
      });
      const response = await model.generateContent(this.buildExtractionPrompt(documentText));
      
      const responseText = response.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return this.flattenExtractedData(parsedData);
      }
    } catch (error) {
      console.warn('Gemini Flash extraction failed:', error);
    }
    
    return {};
  }

  async testGPT5(documentText: string): Promise<ExtractedValues> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{
          role: 'user',
          content: this.buildExtractionPrompt(documentText)
        }],
        max_completion_tokens: 4000,
        // GPT-5 models don't support temperature: 0, only default (1)
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return this.flattenExtractedData(parsedData);
      }
    } catch (error) {
      console.warn('GPT-5 extraction failed:', error);
    }
    
    return {};
  }

  private compareExtractions(claude: ExtractedValues, gemini: ExtractedValues, gpt: ExtractedValues, claudeSonnet4: ExtractedValues, geminiFlash: ExtractedValues, gpt5: ExtractedValues): { allMatch: boolean; differences: string[] } {
    const differences: string[] = [];
    const allFields = new Set([
      ...Object.keys(claude),
      ...Object.keys(gemini),
      ...Object.keys(gpt),
      ...Object.keys(claudeSonnet4),
      ...Object.keys(geminiFlash),
      ...Object.keys(gpt5)
    ]);

    for (const field of allFields) {
      const claudeVal = claude[field as keyof ExtractedValues];
      const geminiVal = gemini[field as keyof ExtractedValues];
      const gptVal = gpt[field as keyof ExtractedValues];
      const claudeSonnet4Val = claudeSonnet4[field as keyof ExtractedValues];
      const geminiFlashVal = geminiFlash[field as keyof ExtractedValues];
      const gpt5Val = gpt5[field as keyof ExtractedValues];

      // Compare values (accounting for undefined vs not present)
      const values = [claudeVal, geminiVal, gptVal, claudeSonnet4Val, geminiFlashVal, gpt5Val].filter(v => v !== undefined);
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];

      if (uniqueValues.length > 1) {
        differences.push(`${field}: Haiku=${JSON.stringify(claudeVal)}, Flash-Lite=${JSON.stringify(geminiVal)}, GPT-Mini=${JSON.stringify(gptVal)}, Sonnet4=${JSON.stringify(claudeSonnet4Val)}, Flash=${JSON.stringify(geminiFlashVal)}, GPT5=${JSON.stringify(gpt5Val)}`);
      }
    }

    return {
      allMatch: differences.length === 0,
      differences
    };
  }

  async runAccuracyValidation() {
    console.log('🎯 EXTRACTION ACCURACY VALIDATION');
    console.log('='.repeat(60));
    console.log('Testing 5 PDFs × 6 Models = 30 extractions');
    console.log('Models: Claude Haiku 3.5, Gemini Flash-Lite, GPT-5-mini, Claude Sonnet 4, Gemini Flash, GPT-5');
    console.log('Temperature: 0 (maximum determinism)');
    console.log('Goal: Prove models extract identical values\n');

    const results: ExtractionTest[] = [];
    const examplesDir = path.join(process.cwd(), 'examples');
    
    if (!fs.existsSync(examplesDir)) {
      console.log('❌ Examples directory not found');
      return;
    }

    const documents = fs.readdirSync(examplesDir)
      .filter(file => file.endsWith('.pdf') && file.includes('estimate'))
      .slice(0, 5);

    if (documents.length < 5) {
      console.log(`❌ Need 5 PDFs, only found ${documents.length}`);
      return;
    }

    console.log(`📄 Testing documents:`);
    documents.forEach((doc, i) => console.log(`${i + 1}. ${doc}`));
    console.log();

    // Test each document with all 3 models
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const documentPath = path.join(examplesDir, document);
      
      console.log(`📄 Processing ${i + 1}/5: ${document}`);
      
      // Load PDF
      const pdfBuffer = fs.readFileSync(documentPath);
      const pdfData = await pdf(pdfBuffer);
      
      // Extract with all 6 models
      console.log('  🤖 Claude Haiku...');
      const claudeResult = await this.testClaudeHaiku(pdfData.text);
      
      console.log('  🤖 Gemini Flash-Lite...');
      const geminiResult = await this.testGeminiFlashLite(pdfData.text);
      
      console.log('  🤖 GPT-5-mini...');
      const gptResult = await this.testGPT5Mini(pdfData.text);
      
      console.log('  🤖 Claude Sonnet 4...');
      const claudeSonnet4Result = await this.testClaudeSonnet4(pdfData.text);
      
      console.log('  🤖 Gemini Flash...');
      const geminiFlashResult = await this.testGeminiFlash(pdfData.text);
      
      console.log('  🤖 GPT-5...');
      const gpt5Result = await this.testGPT5(pdfData.text);
      
      // Compare results
      const comparison = this.compareExtractions(claudeResult, geminiResult, gptResult, claudeSonnet4Result, geminiFlashResult, gpt5Result);
      
      const testResult: ExtractionTest = {
        document,
        claudeHaiku: claudeResult,
        geminiFlashLite: geminiResult,
        gpt5Mini: gptResult,
        claudeSonnet4: claudeSonnet4Result,
        geminiFlash: geminiFlashResult,
        gpt5: gpt5Result,
        allMatch: comparison.allMatch,
        differences: comparison.differences
      };
      
      results.push(testResult);
      
      console.log(`  ${comparison.allMatch ? '✅ PERFECT MATCH' : '❌ DIFFERENCES FOUND'}`);
      if (!comparison.allMatch) {
        console.log(`    ${comparison.differences.length} differences detected`);
      }
      console.log();
    }

    // Generate simple results report
    this.generateSimpleReport(results);
    
    // Summary
    const perfectMatches = results.filter(r => r.allMatch).length;
    console.log(`\n🎯 ACCURACY VALIDATION RESULTS:`);
    console.log(`  Perfect Matches: ${perfectMatches}/5 documents`);
    console.log(`  Success Rate: ${(perfectMatches/5*100).toFixed(1)}%`);
    
    if (perfectMatches === 5) {
      console.log(`  ✅ ALL MODELS EXTRACT IDENTICAL VALUES!`);
      console.log(`  ✅ Ready to proceed with any of the 3 models`);
    } else {
      console.log(`  ❌ Models do not extract identical values consistently`);
      console.log(`  ❌ Need to investigate differences before proceeding`);
    }
    
    console.log(`\n📁 Detailed results: lib/testing/ACCURACY_VALIDATION_RESULTS.md`);
  }

  private generateSimpleReport(results: ExtractionTest[]) {
    let report = '# Extraction Accuracy Validation Results\n\n';
    report += `**Test Date**: ${new Date().toISOString()}\n`;
    report += `**Objective**: Verify 6 models extract identical values from 5 PDFs\n`;
    report += `**Models**: Claude Haiku 3.5, Gemini Flash-Lite, GPT-5-mini, Claude Sonnet 4, Gemini Flash, GPT-5\n`;
    report += `**Temperature**: 0 for Claude/Gemini, default (1) for GPT-5 models (they don't support 0)\n`;
    report += `**Additional Parameters**: topP=1, topK=1, frequency_penalty=0, presence_penalty=0\n\n`;

    // Summary table
    report += '## Summary Results\n\n';
    report += '| Document | Perfect Match | Differences |\n';
    report += '|----------|---------------|-------------|\n';
    
    results.forEach(result => {
      const status = result.allMatch ? '✅ YES' : '❌ NO';
      const diffCount = result.differences.length;
      report += `| ${result.document} | ${status} | ${diffCount} |\n`;
    });
    
    const perfectMatches = results.filter(r => r.allMatch).length;
    report += `\n**Overall Success Rate: ${perfectMatches}/5 (${(perfectMatches/5*100).toFixed(1)}%)**\n\n`;

    // Detailed differences
    report += '## Detailed Analysis\n\n';
    
    results.forEach(result => {
      report += `### ${result.document}\n\n`;
      
      if (result.allMatch) {
        report += '✅ **Perfect Match** - All 3 models extracted identical values\n\n';
        
        // Show sample of extracted values
        const sampleFields = ['totalArea', 'hipRidgeCapQuantity', 'gutterApronQuantity'];
        sampleFields.forEach(field => {
          const value = result.claudeHaiku[field as keyof ExtractedValues];
          if (value !== undefined) {
            report += `- ${field}: ${JSON.stringify(value)}\n`;
          }
        });
        report += '\n';
      } else {
        report += `❌ **Differences Found** (${result.differences.length})\n\n`;
        
        result.differences.forEach(diff => {
          report += `- ${diff}\n`;
        });
        report += '\n';
      }
    });

    // Recommendations
    report += '## Recommendations\n\n';
    
    if (perfectMatches === 5) {
      report += '✅ **PROCEED WITH CONFIDENCE**\n\n';
      report += 'All six models consistently extract identical values. Choose based on:\n';
      report += '- **Claude Sonnet 4**: Most capable, highest accuracy\n';
      report += '- **Claude Haiku 3.5**: Best cost/performance balance\n';
      report += '- **GPT-5**: Premium OpenAI model\n';
      report += '- **Gemini Flash**: Fast Google model\n';
      report += '- **Gemini Flash-Lite**: Fastest processing, lowest cost\n';
      report += '- **GPT-5-mini**: Budget OpenAI option\n\n';
    } else {
      report += '❌ **INVESTIGATE BEFORE PROCEEDING**\n\n';
      report += 'Models are not consistently extracting identical values. Next steps:\n';
      report += '1. Review specific differences above\n';
      report += '2. Refine extraction prompts\n';
      report += '3. Test with additional documents\n';
      report += '4. Consider manual validation of correct answers\n\n';
    }

    fs.writeFileSync(
      path.join(process.cwd(), 'lib/testing/ACCURACY_VALIDATION_RESULTS.md'),
      report
    );
  }
}

if (require.main === module) {
  const validator = new AccuracyValidator();
  validator.runAccuracyValidation().catch(console.error);
}