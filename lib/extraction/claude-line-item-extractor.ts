/**
 * Claude Line Item Extractor
 *
 * Extracts structured line items from insurance estimate documents
 * with specific focus on ridge cap identification and classification
 * following the mermaid flow chart business logic.
 */

import Anthropic from '@anthropic-ai/sdk';

// Line item structure matching our UI requirements
export interface ExtractedLineItem {
  id: string;
  pageIndex: number;
  lineNumber?: number;
  section?: string;
  code?: string;
  description: string;
  quantity: {
    value: number;
    unit: string;
    unitNormalized: string; // 'linear_feet', 'square_feet', 'each', etc.
  };
  unitPrice?: number;
  tax?: number;
  rcv?: number; // Replacement Cost Value
  depreciation?: number;
  acv?: number; // Actual Cash Value
  confidence: number;
  source: {
    markdownSnippet: string;
    markdownOffset?: { start: number; end: number };
    page: number;
  };
  // Ridge cap specific fields
  isRidgeCapItem: boolean;
  ridgeCapQuality?: 'purpose-built' | 'high-profile' | 'cut-from-3tab' | null;
}

// Roof type classification
export interface RoofTypeClassification {
  roofType: 'laminated' | '3-tab' | 'other';
  confidence: number;
  reasoning: string;
  evidence: string[];
}

// Combined extraction result
export interface LineItemExtractionResult {
  lineItems: ExtractedLineItem[];
  roofType: RoofTypeClassification;
  ridgeCapItems: ExtractedLineItem[];
  totalItems: number;
  processingTime: number;
  cost: number;
}

export class ClaudeLineItemExtractor {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Extract line items from estimate document text
   */
  async extractLineItems(
    documentText: string,
    documentPages: string[],
    jobId: string
  ): Promise<LineItemExtractionResult> {
    const startTime = Date.now();

    try {
      console.warn(`🔍 Extracting line items for job ${jobId}`);

      // First, classify the roof type
      const roofTypeClassification = await this.classifyRoofType(documentText);

      // Then extract all line items with specific focus on ridge cap
      const extractionPrompt = this.buildLineItemExtractionPrompt(
        roofTypeClassification.roofType
      );

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0.1, // Low temperature for consistent extraction
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  extractionPrompt +
                  '\n\nDocument text to analyze:\n\n' +
                  documentText,
              },
            ],
          },
        ],
      });

      const responseText =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse the JSON response
      const extractedData = this.parseExtractionResponse(
        responseText,
        documentPages
      );

      // Filter ridge cap items
      const ridgeCapItems = extractedData.filter(item => item.isRidgeCapItem);

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(response.usage as any);

      console.warn(
        `✅ Extracted ${extractedData.length} line items (${ridgeCapItems.length} ridge cap) in ${processingTime}ms`
      );

      return {
        lineItems: extractedData,
        roofType: roofTypeClassification,
        ridgeCapItems,
        totalItems: extractedData.length,
        processingTime,
        cost,
      };
    } catch (error) {
      console.error(`❌ Line item extraction failed for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Classify roof type first to inform extraction logic
   */
  private async classifyRoofType(
    documentText: string
  ): Promise<RoofTypeClassification> {
    const classificationPrompt = `Analyze this insurance estimate document and classify the roof type based on shingle line items.

CLASSIFICATION RULES:
1. **Laminated/Architectural Shingles** - Look for these patterns:
   - "laminated", "laminate", "architectural", "dimensional"
   - "comp shingle", "composition shingle" with architectural terms
   - "Timberline", "Duration", "Landmark" (brand names)
   - Remove/Replace descriptions with "laminated"

2. **3-Tab Shingles** - Look for these patterns:
   - "3-tab", "three tab", "3 tab"
   - "standard shingle", "basic shingle"
   - "strip shingle"

3. **Other Materials** - Look for:
   - "metal", "tile", "slate", "cedar", "shake"
   - "TPO", "EPDM", "modified bitumen"

SEARCH STRATEGY:
- Focus on roofing line items (NOT rain caps, vents, or flashing)
- Look for removal AND installation line items
- Check both item codes and descriptions
- Prioritize explicit material descriptions

Return ONLY valid JSON:
{
  "roofType": "laminated" | "3-tab" | "other",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification",
  "evidence": ["specific text snippets that support this classification"]
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content:
            classificationPrompt +
            '\n\nDocument text:\n\n' +
            documentText.substring(0, 25000),
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch {
      console.warn('Failed to parse roof type classification, using default');
      return {
        roofType: 'laminated',
        confidence: 0.5,
        reasoning: 'Default classification due to parsing error',
        evidence: [],
      };
    }
  }

  /**
   * Build the extraction prompt based on roof type
   */
  private buildLineItemExtractionPrompt(roofType: string): string {
    const ridgeCapFocus =
      roofType === 'laminated'
        ? `For laminated roofs: Look for ridge cap items using these patterns:
• "ridge cap", "hip cap", "ridge/hip", "hip/ridge"  
• "RFG RIDGC", "RFG RIDGH", "RFG RIDGCP"
• Classify quality based on descriptions:
  - "purpose-built": Factory-made, standard profile, high-profile
  - "cut-from-3tab": Cut from 3-tab shingles
  - "high-profile": High-profile or architectural ridge caps`
        : `For 3-tab roofs: Search extensively for ridge cap items:
• "ridge cap", "hip cap", "ridge/hip", "hip/ridge"
• "RFG RIDGC", "RFG RIDGH", "RFG RIDGCP"  
• Any description containing "ridge" or "hip" (excluding vents)
• If NO ridge cap items found, this indicates supplement needed`;

    return `Extract line items from this insurance estimate document with special focus on ridge cap analysis.

${ridgeCapFocus}

For each line item, extract:
- Line number/code
- Description (exact text)
- Quantity and unit
- Unit price, tax, RCV, depreciation, ACV
- Page number where found

CRITICAL: For ridge cap items, classify the quality:
- "purpose-built": Factory-made ridge caps, standard profile, high-profile
- "cut-from-3tab": Ridge caps cut from 3-tab shingles
- "high-profile": High-profile or architectural ridge caps

Return ONLY valid JSON array:
[
  {
    "id": "unique-id",
    "pageIndex": 0,
    "lineNumber": 12,
    "section": "Exterior > Roofing",
    "code": "RFG RIDGC",
    "description": "Hip/Ridge cap - Standard profile - composition shingles",
    "quantity": {
      "value": 104.25,
      "unit": "LF",
      "unitNormalized": "linear_feet"
    },
    "unitPrice": 7.15,
    "tax": 17.14,
    "rcv": 762.53,
    "depreciation": 124.23,
    "acv": 638.30,
    "confidence": 0.98,
    "source": {
      "markdownSnippet": "12. Hip / Ridge cap ... | 104.25 LF | 7.15 | 17.14 | 762.53 | (124.23) | 638.30",
      "page": 3
    },
    "isRidgeCapItem": true,
    "ridgeCapQuality": "purpose-built"
  }
]

Focus on accuracy over completeness. Include confidence scores. Extract ALL ridge cap related items.`;
  }

  /**
   * Parse the Claude response into structured line items
   */
  private parseExtractionResponse(
    responseText: string,
    _documentPages: string[]
  ): ExtractedLineItem[] {
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in extraction response');
        return [];
      }

      const rawItems = JSON.parse(jsonMatch[0]);

      // Normalize and validate each item
      return rawItems.map((item: Record<string, unknown>, index: number) => ({
        id: item.id || `item-${index}`,
        pageIndex: item.pageIndex || 0,
        lineNumber: item.lineNumber,
        section: item.section,
        code: item.code,
        description: item.description || '',
        quantity: {
          value: (item.quantity as any)?.value || 0,
          unit: (item.quantity as any)?.unit || 'each',
          unitNormalized: this.normalizeUnit(
            (item.quantity as any)?.unit || 'each'
          ),
        },
        unitPrice: item.unitPrice,
        tax: item.tax,
        rcv: item.rcv,
        depreciation: item.depreciation,
        acv: item.acv,
        confidence: item.confidence || 0.8,
        source: {
          markdownSnippet:
            (item.source as any)?.markdownSnippet || item.description,
          markdownOffset: (item.source as any)?.markdownOffset,
          page: (item.source as any)?.page || (item.pageIndex as number) + 1,
        },
        isRidgeCapItem: item.isRidgeCapItem || false,
        ridgeCapQuality: item.ridgeCapQuality,
      }));
    } catch (error) {
      console.error('Failed to parse line item extraction response:', error);
      console.warn('Raw response:', responseText.substring(0, 500));
      return [];
    }
  }

  /**
   * Normalize units to standard format
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();

    const unitMap: Record<string, string> = {
      lf: 'linear_feet',
      'linear feet': 'linear_feet',
      'lin ft': 'linear_feet',
      sf: 'square_feet',
      'square feet': 'square_feet',
      'sq ft': 'square_feet',
      ea: 'each',
      each: 'each',
      pc: 'each',
      piece: 'each',
      sq: 'square',
      square: 'square',
      gal: 'gallon',
      gallon: 'gallon',
    };

    return unitMap[normalized] || normalized;
  }

  /**
   * Calculate API cost based on token usage
   */
  private calculateCost(usage: Record<string, unknown>): number {
    // Claude 3.5 Haiku pricing (as of 2024)
    const inputRate = 0.25 / 1000000; // $0.25 per 1M input tokens
    const outputRate = 1.25 / 1000000; // $1.25 per 1M output tokens

    const inputCost = ((usage?.input_tokens as number) || 0) * inputRate;
    const outputCost = ((usage?.output_tokens as number) || 0) * outputRate;

    return inputCost + outputCost;
  }
}

// Export singleton instance
export const claudeLineItemExtractor = new ClaudeLineItemExtractor(
  process.env.ANTHROPIC_API_KEY || ''
);
