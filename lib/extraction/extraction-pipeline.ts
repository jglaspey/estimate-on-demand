/**
 * Extraction Pipeline Prototype
 * Multi-stage LLM pipeline for insurance document processing
 * Based on testing results: Claude Haiku 3.5 selected for reliability + gutter apron detection
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import pdf from 'pdf-parse';
import { z } from 'zod';

// Data validation schemas
const RoofMeasurementsSchema = z.object({
  totalArea: z.number().optional(),
  squares: z.number().optional(), 
  pitch: z.string().optional(),
  stories: z.number().optional(),
  eaves: z.number().optional(),
  rakes: z.number().optional(),
  ridges: z.number().optional(),
  valleys: z.number().optional(),
});

const MaterialSchema = z.object({
  quantity: z.number().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
});

const ExtractedDataSchema = z.object({
  roofMeasurements: RoofMeasurementsSchema,
  materials: z.object({
    hipRidgeCap: MaterialSchema.optional(),
    starterStrip: MaterialSchema.optional(),
    dripEdge: MaterialSchema.optional(),
    gutterApron: MaterialSchema.optional(),
    iceWaterBarrier: MaterialSchema.optional(),
  }),
});

export type ExtractedData = z.infer<typeof ExtractedDataSchema>;
export type RoofMeasurements = z.infer<typeof RoofMeasurementsSchema>;
export type Material = z.infer<typeof MaterialSchema>;

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  rawText?: string;
  pageTexts?: string[];
  error?: string;
  processingTime: number;
  cost: number;
  stage: 'preprocessing' | 'extraction' | 'validation' | 'complete';
}

export interface BusinessRuleAssessment {
  hipRidgeCapCompliant: boolean | null;
  starterStripCompliant: boolean | null;
  dripEdgeCompliant: boolean | null;
  iceWaterBarrierCompliant: boolean | null;
  reasoning: {
    hipRidgeCap?: string;
    starterStrip?: string;
    dripEdge?: string;
    iceWaterBarrier?: string;
  };
}

/**
 * Multi-stage extraction pipeline implementing proven approach
 */
export class ExtractionPipeline {
  private claude: Anthropic;
  
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Stage 1: Document Preprocessing
   * Extract text and prepare for LLM analysis
   */
  async preprocessDocument(pdfBuffer: Buffer): Promise<{
    success: boolean;
    fullText?: string;
    pageTexts?: string[];
    error?: string;
  }> {
    try {
      const pdfData = await pdf(pdfBuffer);
      
      // Extract page-by-page text for UI display
      const pageTexts: string[] = [];
      
      // Simple page splitting heuristic (improve later with proper PDF parsing)
      const fullText = pdfData.text;
      const pageBreakPattern = /\f|\n\s*Page\s+\d+/gi;
      const pages = fullText.split(pageBreakPattern);
      
      pages.forEach((pageText, index) => {
        if (pageText.trim()) {
          pageTexts.push(pageText.trim());
        }
      });

      // Fallback: if no page breaks found, treat as single page
      if (pageTexts.length === 0) {
        pageTexts.push(fullText);
      }

      return {
        success: true,
        fullText,
        pageTexts
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF processing failed'
      };
    }
  }

  /**
   * Stage 2: Data Extraction using proven prompt
   * Uses comprehensive terminology coverage from our testing
   */
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

  /**
   * Stage 2: LLM Extraction
   */
  async extractData(documentText: string): Promise<{
    success: boolean;
    data?: ExtractedData;
    rawResponse?: string;
    cost: number;
    processingTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022', // Proven model from our testing
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: this.buildExtractionPrompt(documentText)
        }]
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const cost = (response.usage.input_tokens / 1000000) * 0.80 + (response.usage.output_tokens / 1000000) * 4;

      // Parse JSON response
      let extractedData: ExtractedData;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        extractedData = ExtractedDataSchema.parse(parsedData);
      } catch (parseError) {
        return {
          success: false,
          error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          rawResponse: responseText,
          cost,
          processingTime
        };
      }

      return {
        success: true,
        data: extractedData,
        rawResponse: responseText,
        cost,
        processingTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        cost: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Stage 3: Business Rule Assessment
   * Analyze extracted data for compliance with 4 critical rules
   */
  async assessBusinessRules(data: ExtractedData): Promise<BusinessRuleAssessment> {
    const assessment: BusinessRuleAssessment = {
      hipRidgeCapCompliant: null,
      starterStripCompliant: null,
      dripEdgeCompliant: null,
      iceWaterBarrierCompliant: null,
      reasoning: {}
    };

    // Rule 1: Hip/Ridge Cap Quality
    if (data.materials.hipRidgeCap?.description) {
      const desc = data.materials.hipRidgeCap.description.toLowerCase();
      if (desc.includes('cut from 3-tab') || desc.includes('cut 3 tab')) {
        assessment.hipRidgeCapCompliant = false;
        assessment.reasoning.hipRidgeCap = 'Uses cut 3-tab shingles instead of purpose-built ridge caps';
      } else if (desc.includes('standard profile') || desc.includes('purpose-built') || desc.includes('ridge cap')) {
        assessment.hipRidgeCapCompliant = true;
        assessment.reasoning.hipRidgeCap = 'Uses proper purpose-built ridge caps';
      }
    }

    // Rule 2: Starter Strip Quality
    if (data.materials.starterStrip?.description) {
      const desc = data.materials.starterStrip.description.toLowerCase();
      if (desc.includes('universal starter') || desc.includes('self adhesive')) {
        assessment.starterStripCompliant = true;
        assessment.reasoning.starterStrip = 'Uses universal starter course with proper adhesive';
      } else if (desc.includes('cut shingles')) {
        assessment.starterStripCompliant = false;
        assessment.reasoning.starterStrip = 'Uses cut shingles instead of universal starter course';
      }
    }

    // Rule 3: Drip Edge Coverage
    if (data.materials.dripEdge?.quantity && data.roofMeasurements.eaves && data.roofMeasurements.rakes) {
      const totalEdge = data.roofMeasurements.eaves + data.roofMeasurements.rakes;
      const dripEdgeQuantity = data.materials.dripEdge.quantity;
      
      if (Math.abs(dripEdgeQuantity - totalEdge) / totalEdge < 0.1) { // Within 10%
        assessment.dripEdgeCompliant = true;
        assessment.reasoning.dripEdge = `Drip edge quantity (${dripEdgeQuantity} LF) matches eave + rake requirements (${totalEdge} LF)`;
      } else {
        assessment.dripEdgeCompliant = false;
        assessment.reasoning.dripEdge = `Insufficient drip edge: ${dripEdgeQuantity} LF provided, ${totalEdge} LF required`;
      }
    }

    // Rule 4: Ice & Water Barrier (basic coverage check)
    if (data.materials.iceWaterBarrier?.quantity && data.roofMeasurements.totalArea) {
      const coverage = data.materials.iceWaterBarrier.quantity;
      const roofArea = data.roofMeasurements.totalArea;
      
      // Basic heuristic: ice & water should be at least 10% of roof area for eave coverage
      const minimumCoverage = roofArea * 0.10;
      
      if (coverage >= minimumCoverage) {
        assessment.iceWaterBarrierCompliant = true;
        assessment.reasoning.iceWaterBarrier = `Adequate ice & water barrier coverage: ${coverage} SF`;
      } else {
        assessment.iceWaterBarrierCompliant = false;
        assessment.reasoning.iceWaterBarrier = `Insufficient ice & water barrier: ${coverage} SF provided, minimum ${minimumCoverage.toFixed(0)} SF recommended`;
      }
    }

    return assessment;
  }

  /**
   * Complete pipeline execution
   */
  async processDocument(pdfBuffer: Buffer): Promise<ExtractionResult & { 
    businessRules?: BusinessRuleAssessment 
  }> {
    let totalCost = 0;
    const pipelineStart = Date.now();

    // Stage 1: Preprocessing
    const preprocessResult = await this.preprocessDocument(pdfBuffer);
    if (!preprocessResult.success) {
      return {
        success: false,
        error: preprocessResult.error,
        processingTime: Date.now() - pipelineStart,
        cost: 0,
        stage: 'preprocessing'
      };
    }

    // Stage 2: Extraction
    const extractionResult = await this.extractData(preprocessResult.fullText!);
    totalCost += extractionResult.cost;
    
    if (!extractionResult.success) {
      return {
        success: false,
        error: extractionResult.error,
        rawText: preprocessResult.fullText,
        pageTexts: preprocessResult.pageTexts,
        processingTime: Date.now() - pipelineStart,
        cost: totalCost,
        stage: 'extraction'
      };
    }

    // Stage 3: Business Rule Assessment
    const businessRules = await this.assessBusinessRules(extractionResult.data!);

    return {
      success: true,
      data: extractionResult.data,
      rawText: preprocessResult.fullText,
      pageTexts: preprocessResult.pageTexts,
      businessRules,
      processingTime: Date.now() - pipelineStart,
      cost: totalCost,
      stage: 'complete'
    };
  }
}

/**
 * Factory function for easy pipeline creation
 */
export function createExtractionPipeline(): ExtractionPipeline {
  return new ExtractionPipeline();
}

/**
 * Utility function to validate extracted data
 */
export function validateExtractedData(data: any): { valid: boolean; errors: string[] } {
  try {
    ExtractedDataSchema.parse(data);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}