/**
 * Mistral Vision Extraction Engine
 * 
 * Uses Mistral's vision models for OCR and document analysis
 * Specializes in document transcription and structured data extraction
 */

import { Mistral } from '@mistralai/mistralai';
import type { ExtractionResult, ExtractionMetrics } from './haiku-extraction-engine';
import { convertPDFBufferToBase64Images } from '../utils/pdf-to-images';

export class MistralExtractionEngine {
  private mistral: Mistral;
  private model: string;
  
  constructor(apiKey: string, model: string = 'pixtral-12b-2409') {
    this.mistral = new Mistral({ apiKey });
    this.model = model;
  }

  /**
   * Optimized extraction prompt for Mistral vision models
   * Focus on OCR and document structure understanding
   */
  private readonly EXTRACTION_PROMPT = `You are an expert at reading insurance documents and extracting specific information. Analyze this document image and extract the following data.

Return ONLY a valid JSON object with this exact structure:

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

EXTRACTION RULES:
- Look for specific line items in estimates/invoices
- Hip/Ridge Cap: Look for ridge cap, hip cap, or similar items
- Starter Strip: Look for starter strip, starter course, or starter shingles
- Drip Edge: Look for drip edge at rakes (sides of roof)
- Gutter Apron: Look for gutter apron or gutter flashing at eaves (bottom edge)
- Ice & Water Barrier: Look for ice and water shield or similar waterproofing

IMPORTANT:
- Use null for missing data, never 0 or empty string
- Extract exact quantities when found
- Be precise with material descriptions
- Pay special attention to gutter apron - this is often missed but critical
- Return only the JSON object, no explanations`;

  /**
   * Extract data from PDF using Mistral vision models
   */
  async extractFromPDF(
    pdfBuffer: Buffer, 
    jobId?: string
  ): Promise<{ data: ExtractionResult; metrics: ExtractionMetrics }> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 [${jobId || 'unknown'}] Starting Mistral vision extraction with ${this.model}...`);
      
      // Convert PDF to images
      const conversionResult = await convertPDFBufferToBase64Images(pdfBuffer);
      
      if (!conversionResult.success) {
        throw new Error(`PDF conversion failed: ${conversionResult.error}`);
      }

      console.log(`📄 Converted PDF to ${conversionResult.base64Images.length} images`);

      // Process all pages (limit to first 3 for cost control)
      const imagesToProcess = conversionResult.base64Images.slice(0, 3);
      let bestResult: ExtractionResult | null = null;
      let allResults: ExtractionResult[] = [];

      for (let i = 0; i < imagesToProcess.length; i++) {
        const base64Image = imagesToProcess[i];
        
        try {
          console.log(`🔍 Processing page ${i + 1}/${imagesToProcess.length}...`);
          
          const response = await this.mistral.chat.complete({
            model: this.model,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: this.EXTRACTION_PROMPT
                },
                {
                  type: 'image_url',
                  image_url: `data:image/png;base64,${base64Image}`
                }
              ]
            }],
            max_tokens: 2000,
            temperature: 0.1,
          });

          const content = response.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error(`No content in response for page ${i + 1}`);
          }

          // Parse JSON response
          const extractedData = this.parseExtractionResult(content);
          allResults.push(extractedData);

          // Keep the result with the most findings
          if (!bestResult || this.countFindings(extractedData) > this.countFindings(bestResult)) {
            bestResult = extractedData;
          }

        } catch (pageError) {
          console.error(`Failed to process page ${i + 1}:`, pageError);
        }
      }

      if (!bestResult) {
        throw new Error('No successful extractions from any page');
      }

      const processingTime = Date.now() - startTime;
      
      // Estimate tokens and cost (Mistral pricing varies by model)
      const estimatedInputTokens = imagesToProcess.length * 1000; // Rough estimate
      const estimatedOutputTokens = 200;
      const estimatedCost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);

      console.log(`✅ [${jobId || 'unknown'}] Mistral extraction complete: ${processingTime}ms, ~$${estimatedCost.toFixed(4)}`);
      console.log(`📊 Processed ${allResults.length} pages, found ${this.countFindings(bestResult)} fields`);
      
      return {
        data: bestResult,
        metrics: {
          processingTime,
          tokenUsage: {
            input: estimatedInputTokens,
            output: estimatedOutputTokens
          },
          cost: estimatedCost,
          success: true
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ [${jobId || 'unknown'}] Mistral extraction failed:`, error);
      
      return {
        data: this.getEmptyResult(),
        metrics: {
          processingTime,
          tokenUsage: { input: 0, output: 0 },
          cost: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Extract data from PDF file path
   */
  async extractFromFile(
    pdfPath: string, 
    jobId?: string
  ): Promise<{ data: ExtractionResult; metrics: ExtractionMetrics }> {
    const fs = await import('fs');
    const pdfBuffer = fs.readFileSync(pdfPath);
    return this.extractFromPDF(pdfBuffer, jobId);
  }

  /**
   * Parse extraction result from text response
   */
  private parseExtractionResult(content: string): ExtractionResult {
    // Handle potential markdown formatting
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    } else if (jsonText.startsWith('```')) {
      const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse JSON from Mistral response:', jsonText);
      throw new Error('Invalid JSON response from Mistral');
    }
  }

  /**
   * Count the number of found fields in a result
   */
  private countFindings(result: ExtractionResult): number {
    const fields = [
      result.hipRidgeCap,
      result.starterStrip,
      result.dripEdge,
      result.gutterApron,
      result.iceWaterBarrier
    ];
    
    return fields.filter(field => field.found).length;
  }

  /**
   * Calculate estimated cost based on model and tokens
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Mistral pricing (approximate, varies by model)
    const rates = {
      'pixtral-12b-2409': { input: 0.15, output: 0.15 }, // per 1M tokens
      'pixtral-large-2411': { input: 0.30, output: 0.30 },
      'mistral-medium-2505': { input: 2.7, output: 8.1 },
      'mistral-small-2503': { input: 1.0, output: 3.0 }
    };

    const rate = rates[this.model as keyof typeof rates] || rates['pixtral-12b-2409'];
    return (inputTokens * rate.input + outputTokens * rate.output) / 1000000;
  }

  /**
   * Get empty result structure
   */
  private getEmptyResult(): ExtractionResult {
    return {
      hipRidgeCap: { found: false, quantity: null, description: null, quality: null },
      starterStrip: { found: false, quantity: null, description: null, type: null },
      dripEdge: { found: false, quantity: null, description: null, location: null },
      gutterApron: { found: false, quantity: null, description: null, location: null },
      iceWaterBarrier: { found: false, coverage: null, description: null, calculation: null }
    };
  }

  /**
   * Get engine information
   */
  getEngineInfo() {
    return {
      name: 'Mistral Vision Extraction Engine',
      model: this.model,
      version: '1.0.0',
      capabilities: [
        'OCR and document transcription',
        'Multi-page document processing',
        'Chart and image analysis',
        'Structured data extraction',
        'Vision-based field identification'
      ],
      performance: {
        averageProcessingTime: '~15 seconds per page',
        costPer1000Pages: '~$150-300 (varies by model)',
        imageSupport: 'PNG, JPEG, WEBP, GIF',
        maxImageSize: '10MB',
        maxImagesPerRequest: 8
      }
    };
  }

  /**
   * Test OCR capabilities with a simple document
   */
  async testOCR(imageBase64: string): Promise<string> {
    try {
      const response = await this.mistral.chat.complete({
        model: this.model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please transcribe all text you can see in this image. Be thorough and accurate.'
            },
            {
              type: 'image_url',
              image_url: `data:image/png;base64,${imageBase64}`
            }
          ]
        }],
        max_tokens: 1000,
      });

      return response.choices?.[0]?.message?.content || 'No content returned';
    } catch (error) {
      throw new Error(`OCR test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export factory functions
export function createMistralEngine(apiKey?: string, model?: string): MistralExtractionEngine {
  const key = apiKey || process.env.MISTRAL_API_KEY;
  if (!key || key === 'your_mistral_key_here') {
    throw new Error('Mistral API key required for vision extraction engine');
  }
  return new MistralExtractionEngine(key, model);
}

export function getDefaultMistralEngine(model?: string): MistralExtractionEngine {
  return createMistralEngine(undefined, model);
}