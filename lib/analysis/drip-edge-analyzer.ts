/**
 * Drip Edge & Gutter Apron Analyzer
 *
 * Implements business rule analysis for edge protection compliance:
 * - Drip Edge: Required at rakes (side edges)
 * - Gutter Apron: Required at eaves (bottom edges)
 *
 * Following the flowchart logic from business rules documentation
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

import type { RoofMeasurements } from '../../types';
import type { ExtractedLineItem } from '../extraction/claude-line-item-extractor';

// Input data for drip edge analysis
export interface DripEdgeAnalysisInput {
  lineItems: ExtractedLineItem[];
  roofMeasurements: RoofMeasurements;
  jobId: string;
}

// Drip edge specific data extracted from line items
export interface DripEdgeItemData {
  dripEdgeItems: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    category: 'drip-edge' | 'gutter-apron' | 'combined';
  }>;
  gutterApronItems: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    category: 'drip-edge' | 'gutter-apron' | 'combined';
  }>;
  hasAnyEdgeProtection: boolean;
  confidence: number;
}

// Analysis result for drip edge & gutter apron
export interface DripEdgeAnalysisResult {
  // Drip Edge (Rakes)
  dripEdgePresent: boolean;
  dripEdgeQuantity: string;
  dripEdgeUnitPrice: string;
  dripEdgeTotal: string;
  requiredRakeLength: string;
  rakeShortfall: string;

  // Gutter Apron (Eaves)
  gutterApronPresent: boolean;
  gutterApronQuantity: string;
  gutterApronUnitPrice: string;
  gutterApronTotal: string;
  requiredEaveLength: string;
  eaveShortfall: string;

  // Overall analysis
  status: 'COMPLIANT' | 'PARTIAL' | 'SUPPLEMENT_NEEDED';
  complianceStatus: 'compliant' | 'partial' | 'non-compliant';
  confidence: number;
  reasoning: string;
  costImpact: number;

  // Line item details
  dripEdgeLineItem?: {
    code: string;
    description: string;
  };
  gutterApronLineItem?: {
    code: string;
    description: string;
  };

  // Evidence and documentation
  documentationNote: string;
  roofReportPage: string;
  estimatePage: string;

  // Metadata
  jobId: string;
  analyzedAt: Date;
}

export class DripEdgeAnalyzer {
  /**
   * Main analysis method for drip edge & gutter apron compliance
   */
  async analyzeDripEdgeCompliance(
    input: DripEdgeAnalysisInput
  ): Promise<DripEdgeAnalysisResult> {
    console.log(`🔍 Starting drip edge analysis for job ${input.jobId}`);

    try {
      // Step 1: Extract edge protection items from line items
      const edgeProtectionData = await this.extractEdgeProtectionItems(
        input.lineItems
      );

      // Step 2: Get required measurements from roof report
      const requiredMeasurements = this.getRequiredMeasurements(
        input.roofMeasurements
      );

      // Step 3: Analyze compliance using Claude
      const analysisResult = await this.analyzeComplianceWithClaude(
        edgeProtectionData,
        requiredMeasurements,
        input.jobId
      );

      console.log(
        `✅ Drip edge analysis completed for job ${input.jobId}: ${analysisResult.status}`
      );
      return analysisResult;
    } catch (error) {
      console.error(
        `❌ Drip edge analysis failed for job ${input.jobId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Extract drip edge and gutter apron items from line items
   */
  private async extractEdgeProtectionItems(
    lineItems: ExtractedLineItem[]
  ): Promise<DripEdgeItemData> {
    const prompt = `
Analyze these line items to identify drip edge and gutter apron components:

LINE ITEMS:
${lineItems
  .map(
    (item, i) =>
      `${i + 1}. ${item.code || 'N/A'} - ${item.description} | ${item.quantity.value} ${item.quantity.unit} @ $${item.unitPrice || 0} = $${item.rcv || 0}`
  )
  .join('\n')}

IDENTIFICATION RULES:
- Drip Edge: Look for "drip edge" (not "gutter apron") - protects rake edges (sides)
- Gutter Apron: Look for "gutter apron" or "drip edge/gutter apron" - protects eaves (bottom)
- Both serve different functions and have different shapes/costs

Extract edge protection items and categorize them properly.

Respond with JSON:
{
  "dripEdgeItems": [
    {
      "code": "line item code",
      "description": "full description", 
      "quantity": number,
      "unit": "LF",
      "unitPrice": number,
      "total": number,
      "category": "drip-edge"
    }
  ],
  "gutterApronItems": [
    {
      "code": "line item code",
      "description": "full description",
      "quantity": number, 
      "unit": "LF",
      "unitPrice": number,
      "total": number,
      "category": "gutter-apron"
    }
  ],
  "hasAnyEdgeProtection": boolean,
  "confidence": 0.95
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response =
        message.content[0].type === 'text' ? message.content[0].text : '';

      // Parse response as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      return JSON.parse(jsonMatch[0]) as DripEdgeItemData;
    } catch (error) {
      console.error('Failed to extract edge protection items:', error);
      // Return fallback data
      return {
        dripEdgeItems: [],
        gutterApronItems: [],
        hasAnyEdgeProtection: false,
        confidence: 0.1,
      };
    }
  }

  /**
   * Get required measurements from roof report
   */
  private getRequiredMeasurements(roofMeasurements: RoofMeasurements) {
    return {
      requiredRakeLength:
        roofMeasurements.totalRakes || roofMeasurements.rakesLength || 0,
      requiredEaveLength:
        roofMeasurements.totalEaves || roofMeasurements.eavesLength || 0,
      hasValidMeasurements:
        (roofMeasurements.totalRakes || roofMeasurements.rakesLength || 0) >
          0 &&
        (roofMeasurements.totalEaves || roofMeasurements.eavesLength || 0) > 0,
    };
  }

  /**
   * Analyze compliance using Claude with business rule logic
   */
  private async analyzeComplianceWithClaude(
    edgeData: DripEdgeItemData,
    measurements: ReturnType<typeof this.getRequiredMeasurements>,
    jobId: string
  ): Promise<DripEdgeAnalysisResult> {
    const prompt = `
Analyze drip edge and gutter apron compliance following this business rule logic:

BUSINESS RULE FLOWCHART:
1. Check if drip edge OR gutter apron is present
2. If NEITHER present → Recommend BOTH (drip edge at rakes + gutter apron at eaves)
3. If drip edge present → Check if quantity ≥ rake length
4. If gutter apron present → Check if quantity ≥ eave length
5. Determine compliance status and supplement needed

EDGE PROTECTION DATA:
Drip Edge Items: ${JSON.stringify(edgeData.dripEdgeItems, null, 2)}
Gutter Apron Items: ${JSON.stringify(edgeData.gutterApronItems, null, 2)}

REQUIRED MEASUREMENTS:
Required Rake Length: ${measurements.requiredRakeLength} LF
Required Eave Length: ${measurements.requiredEaveLength} LF

ANALYSIS REQUIREMENTS:
- Drip edge protects rakes (side edges) - L-shaped
- Gutter apron protects eaves (bottom edges) - elongated bent profile  
- Different shapes, different materials costs
- Both are essential for water management
- Calculate shortfalls and supplement costs

Standard pricing estimates:
- Drip edge: ~$2.85/LF
- Gutter apron: ~$3.15/LF

Respond with JSON:
{
  "dripEdgePresent": boolean,
  "dripEdgeQuantity": "45.2 LF" | "0.0 LF",
  "dripEdgeUnitPrice": "$2.85" | "$0.00", 
  "dripEdgeTotal": "$128.82" | "$0.00",
  "requiredRakeLength": "${measurements.requiredRakeLength} LF",
  "rakeShortfall": "0.0 LF" | "X.X LF",
  
  "gutterApronPresent": boolean,
  "gutterApronQuantity": "178.6 LF" | "0.0 LF",
  "gutterApronUnitPrice": "$3.15" | "$0.00",
  "gutterApronTotal": "$562.59" | "$0.00", 
  "requiredEaveLength": "${measurements.requiredEaveLength} LF",
  "eaveShortfall": "0.0 LF" | "X.X LF",
  
  "status": "COMPLIANT" | "PARTIAL" | "SUPPLEMENT_NEEDED",
  "complianceStatus": "compliant" | "partial" | "non-compliant",
  "confidence": 0.95,
  "reasoning": "Detailed explanation of compliance status and findings",
  "costImpact": 562.59,
  
  "dripEdgeLineItem": {
    "code": "line item code or null",
    "description": "line item description or null"
  },
  "gutterApronLineItem": {
    "code": "line item code or null", 
    "description": "line item description or null"
  },
  
  "documentationNote": "Professional explanation of drip edge vs gutter apron requirements for supplement documentation",
  "roofReportPage": "page 2",
  "estimatePage": "page 3",
  
  "jobId": "${jobId}",
  "analyzedAt": "${new Date().toISOString()}"
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response =
        message.content[0].type === 'text' ? message.content[0].text : '';

      // Parse response as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const result = JSON.parse(jsonMatch[0]) as DripEdgeAnalysisResult;
      result.analyzedAt = new Date();
      return result;
    } catch (error) {
      console.error(
        'Failed to analyze drip edge compliance with Claude:',
        error
      );

      // Return fallback result
      return {
        dripEdgePresent: edgeData.dripEdgeItems.length > 0,
        dripEdgeQuantity:
          edgeData.dripEdgeItems[0]?.quantity + ' LF' || '0.0 LF',
        dripEdgeUnitPrice:
          '$' + (edgeData.dripEdgeItems[0]?.unitPrice || 0).toFixed(2),
        dripEdgeTotal: '$' + (edgeData.dripEdgeItems[0]?.total || 0).toFixed(2),
        requiredRakeLength: measurements.requiredRakeLength + ' LF',
        rakeShortfall: '0.0 LF',

        gutterApronPresent: edgeData.gutterApronItems.length > 0,
        gutterApronQuantity:
          edgeData.gutterApronItems[0]?.quantity + ' LF' || '0.0 LF',
        gutterApronUnitPrice:
          '$' + (edgeData.gutterApronItems[0]?.unitPrice || 0).toFixed(2),
        gutterApronTotal:
          '$' + (edgeData.gutterApronItems[0]?.total || 0).toFixed(2),
        requiredEaveLength: measurements.requiredEaveLength + ' LF',
        eaveShortfall: measurements.requiredEaveLength + ' LF',

        status: 'SUPPLEMENT_NEEDED',
        complianceStatus: 'non-compliant',
        confidence: 0.5,
        reasoning: 'Analysis failed, using fallback logic',
        costImpact: 0,

        documentationNote:
          'Drip edge and gutter apron analysis encountered an error',
        roofReportPage: 'page 2',
        estimatePage: 'page 3',

        jobId,
        analyzedAt: new Date(),
      };
    }
  }
}

// Export singleton instance
export const dripEdgeAnalyzer = new DripEdgeAnalyzer();
