/**
 * Claude Measurement Extractor
 * 
 * Extracts roof measurements from EagleView reports and other roof reports
 * for accurate ridge cap and other business rule analysis.
 */

import Anthropic from '@anthropic-ai/sdk';

// Roof measurement structure
export interface RoofMeasurements {
  // Ridge/Hip measurements (critical for ridge cap analysis)
  ridgeLength: number | null; // in Linear Feet
  hipLength: number | null; // in Linear Feet
  totalRidgeHip: number | null; // Combined ridge + hip
  
  // Edge measurements
  eaveLength: number | null; // in Linear Feet
  rakeLength: number | null; // in Linear Feet
  valleyLength: number | null; // in Linear Feet
  
  // Roof characteristics
  totalRoofArea: number | null; // in Square Feet
  squares: number | null; // Roofing squares (100 sq ft each)
  predominantPitch: string | null; // e.g., "8:12", "6:12"
  numberOfStories: number | null;
  
  // Source information
  confidence: number;
  sourcePages: number[];
  extractedFrom: 'eagleview' | 'manual_report' | 'other';
}

// Measurement extraction result
export interface MeasurementExtractionResult {
  measurements: RoofMeasurements;
  rawExtraction: Record<string, unknown>; // Full extraction for debugging
  processingTime: number;
  cost: number;
  warnings: string[]; // Any issues found during extraction
}

export class ClaudeMeasurementExtractor {
  private anthropic: Anthropic;
  
  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Extract roof measurements from roof report document text
   */
  async extractMeasurements(
    documentText: string,
    documentPages: string[],
    jobId: string
  ): Promise<MeasurementExtractionResult> {
    const startTime = Date.now();
    
    try {
      console.warn(`📏 Extracting roof measurements for job ${jobId}`);
      
      // Build the extraction prompt
      const extractionPrompt = this.buildMeasurementExtractionPrompt();
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistent measurement extraction
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: extractionPrompt + '\n\nRoof report text to analyze:\n\n' + documentText
              }
            ]
          }
        ]
      });

      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      // Parse the measurements
      const { measurements, warnings } = this.parseMeasurementResponse(responseText, documentPages);
      
      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage as any);

      console.warn(`✅ Extracted roof measurements in ${processingTime}ms`);
      console.warn(`   Ridge: ${measurements.ridgeLength} LF, Hip: ${measurements.hipLength} LF`);
      
      if (warnings.length > 0) {
        console.warn(`⚠️ Measurement extraction warnings:`, warnings);
      }

      return {
        measurements,
        rawExtraction: { responseText },
        processingTime,
        cost,
        warnings
      };

    } catch (error) {
      console.error(`❌ Measurement extraction failed for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Build the measurement extraction prompt
   */
  private buildMeasurementExtractionPrompt(): string {
    return `Extract roof measurements from this EagleView or roof report document.

CRITICAL: Focus on accurate extraction of ridge and hip measurements for ridge cap analysis.

Look for:
1. Ridge measurements (ridges, peaks) in Linear Feet (LF)
2. Hip measurements (hips) in Linear Feet (LF) 
3. Total ridge/hip combined measurements
4. Eave measurements (gutters, perimeter)
5. Rake measurements (gables, edges)
6. Valley measurements
7. Total roof area and squares
8. Roof pitch/slope
9. Number of stories

Common patterns to look for:
- "Ridges: 26 LF"
- "Hips: 93 LF" 
- "Total ridge/hip: 119 LF"
- "Ridge/Hip Length: 119.0 ft"
- "Perimeter: 180 LF"
- "Roof Area: 2,450 SF"
- "Pitch: 8:12"

Return ONLY valid JSON:
{
  "ridgeLength": 26.0,
  "hipLength": 93.0,
  "totalRidgeHip": 119.0,
  "eaveLength": 180.0,
  "rakeLength": 85.0,
  "valleyLength": 42.0,
  "totalRoofArea": 2450.0,
  "squares": 24.5,
  "predominantPitch": "8:12",
  "numberOfStories": 2,
  "confidence": 0.95,
  "sourcePages": [1, 2],
  "extractedFrom": "eagleview",
  "evidence": {
    "ridgeEvidence": "Page 2: Ridges: 26 LF",
    "hipEvidence": "Page 2: Hips: 93 LF",
    "totalEvidence": "Page 2: Total ridge/hip coverage: 119 LF"
  }
}

If values are not found, use null. Be conservative with confidence scores. Include evidence snippets for verification.`;
  }

  /**
   * Parse the measurement extraction response
   */
  private parseMeasurementResponse(
    responseText: string, 
    _documentPages: string[]
  ): { measurements: RoofMeasurements; warnings: string[] } {
    const warnings: string[] = [];
    
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        warnings.push('No JSON found in measurement response');
        return { measurements: this.getDefaultMeasurements(), warnings };
      }

      const rawData = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize measurements
      const measurements: RoofMeasurements = {
        ridgeLength: this.parseNumber(rawData.ridgeLength),
        hipLength: this.parseNumber(rawData.hipLength),
        totalRidgeHip: this.parseNumber(rawData.totalRidgeHip),
        eaveLength: this.parseNumber(rawData.eaveLength),
        rakeLength: this.parseNumber(rawData.rakeLength),
        valleyLength: this.parseNumber(rawData.valleyLength),
        totalRoofArea: this.parseNumber(rawData.totalRoofArea),
        squares: this.parseNumber(rawData.squares),
        predominantPitch: rawData.predominantPitch || null,
        numberOfStories: this.parseNumber(rawData.numberOfStories),
        confidence: this.parseNumber(rawData.confidence) || 0.8,
        sourcePages: Array.isArray(rawData.sourcePages) ? rawData.sourcePages : [1],
        extractedFrom: this.normalizeReportType(rawData.extractedFrom)
      };

      // Validate critical measurements
      this.validateMeasurements(measurements, warnings);
      
      // Calculate totalRidgeHip if missing but components are present
      if (!measurements.totalRidgeHip && measurements.ridgeLength && measurements.hipLength) {
        measurements.totalRidgeHip = measurements.ridgeLength + measurements.hipLength;
        warnings.push('Calculated totalRidgeHip from ridge + hip components');
      }

      return { measurements, warnings };

    } catch (error) {
      warnings.push(`Failed to parse measurement response: ${error}`);
      console.error('Measurement parsing error:', error);
      console.warn('Raw response:', responseText.substring(0, 500));
      
      return { measurements: this.getDefaultMeasurements(), warnings };
    }
  }

  /**
   * Parse number values safely
   */
  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  /**
   * Normalize report type
   */
  private normalizeReportType(reportType: unknown): 'eagleview' | 'manual_report' | 'other' {
    if (typeof reportType !== 'string') return 'other';
    
    const normalized = reportType.toLowerCase();
    if (normalized.includes('eagle')) return 'eagleview';
    if (normalized.includes('manual')) return 'manual_report';
    return 'other';
  }

  /**
   * Validate measurements and add warnings
   */
  private validateMeasurements(measurements: RoofMeasurements, warnings: string[]): void {
    // Check for missing critical measurements
    if (!measurements.ridgeLength && !measurements.hipLength && !measurements.totalRidgeHip) {
      warnings.push('No ridge or hip measurements found - critical for ridge cap analysis');
    }
    
    // Check for unrealistic values
    if (measurements.ridgeLength && measurements.ridgeLength > 1000) {
      warnings.push('Ridge length seems unrealistically high (>1000 LF)');
    }
    
    if (measurements.hipLength && measurements.hipLength > 1000) {
      warnings.push('Hip length seems unrealistically high (>1000 LF)');
    }
    
    // Check consistency
    if (measurements.ridgeLength && measurements.hipLength && measurements.totalRidgeHip) {
      const calculated = measurements.ridgeLength + measurements.hipLength;
      const difference = Math.abs(calculated - measurements.totalRidgeHip);
      
      if (difference > 5) { // Allow 5 LF variance
        warnings.push(`Ridge + Hip (${calculated}) doesn't match total (${measurements.totalRidgeHip})`);
      }
    }
    
    // Check for very low confidence
    if (measurements.confidence < 0.6) {
      warnings.push('Low confidence in measurement extraction - manual review recommended');
    }
  }

  /**
   * Get default measurements when extraction fails
   */
  private getDefaultMeasurements(): RoofMeasurements {
    return {
      ridgeLength: null,
      hipLength: null,
      totalRidgeHip: null,
      eaveLength: null,
      rakeLength: null,
      valleyLength: null,
      totalRoofArea: null,
      squares: null,
      predominantPitch: null,
      numberOfStories: null,
      confidence: 0.0,
      sourcePages: [],
      extractedFrom: 'other'
    };
  }

  /**
   * Calculate API cost based on token usage
   */
  private calculateCost(usage: Record<string, unknown>): number {
    // Claude 3.5 Haiku pricing
    const inputRate = 0.25 / 1000000; // $0.25 per 1M input tokens
    const outputRate = 1.25 / 1000000; // $1.25 per 1M output tokens
    
    const inputCost = ((usage?.input_tokens as number) || 0) * inputRate;
    const outputCost = ((usage?.output_tokens as number) || 0) * outputRate;
    
    return inputCost + outputCost;
  }
}

// Export singleton instance
export const claudeMeasurementExtractor = new ClaudeMeasurementExtractor(
  process.env.ANTHROPIC_API_KEY || ''
);