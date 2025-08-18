/**
 * Ice & Water Barrier Rule Analyzer
 *
 * Implements the business logic for IRC R905.1.2 compliance:
 * - Calculates required coverage based on roof measurements and pitch
 * - Analyzes current estimate quantities for code compliance
 * - Generates professional supplement recommendations
 */

import { ExtractedLineItem } from '../extraction/claude-line-item-extractor';
import { RoofMeasurements } from '../extraction/claude-measurement-extractor';
import {
  safeAdd,
  safeMultiply,
  safeSubtract,
  formatNumber,
} from '../utils/number-precision';

// Ice & Water Barrier analysis result
export interface IceWaterBarrierAnalysisResult {
  // Rule outcome
  status: 'COMPLIANT' | 'SUPPLEMENT_NEEDED' | 'INSUFFICIENT_DATA';
  confidence: number;
  reasoning: string;

  // IRC R905.1.2 calculation details
  calculationDetails: {
    totalEaves: number | null; // Linear feet of eaves
    soffitDepth: number | null; // Inches
    wallThickness: number | null; // Inches
    roofPitch: string | null; // e.g., "6/12"
    pitchMultiplier: number; // Adjustment factor for pitch
    requiredWidth: number | null; // Inches from edge
    calculatedCoverage: number | null; // Required square feet
    safetyMargin: number; // Additional coverage percentage
  };

  // Quantity analysis
  estimateQuantity: string | null; // Current estimate amount
  requiredQuantity: string | null; // Code-required amount
  variance: string | null; // Difference description
  varianceAmount: number | null; // SF difference (negative = shortage)
  varianceType: 'shortage' | 'adequate' | 'excess';

  // Material compliance
  materialStatus: 'compliant' | 'non-compliant';
  barrierType: 'ice-water-barrier' | 'modified-bitumen' | 'unknown' | null;

  // Cost impact
  costImpact: number; // Additional cost for supplement
  unitPrice: number | null; // Price per SF

  // Source data references
  currentSpecification: {
    code: string | null;
    description: string | null;
    quantity: string | null;
    rate: string | null;
    total: string | null;
  } | null;

  // Evidence and documentation
  evidenceReferences: string[];
  documentationNote: string;
  supplementRecommendation: string | null;
}

// Input data for analysis
export interface IceWaterBarrierAnalysisInput {
  lineItems: ExtractedLineItem[];
  roofMeasurements: RoofMeasurements;
  jobId: string;
}

export class IceWaterBarrierAnalyzer {
  /**
   * Analyze ice & water barrier compliance per IRC R905.1.2
   */
  async analyzeIceWaterBarrierCompliance(
    input: IceWaterBarrierAnalysisInput
  ): Promise<IceWaterBarrierAnalysisResult> {
    console.log(
      `❄️ Analyzing ice & water barrier compliance for job ${input.jobId}`
    );

    // Step 1: Find ice & water barrier line items
    const iceWaterItems = this.findIceWaterBarrierItems(input.lineItems);
    console.log(
      `   Found ${iceWaterItems.length} ice & water barrier line items`
    );

    // Step 2: Extract roof measurements for IRC calculation
    const measurements = this.extractMeasurements(input.roofMeasurements);

    if (!measurements.totalEaves) {
      return this.createInsufficientDataResult(
        'Unable to determine eave measurements for IRC R905.1.2 calculation'
      );
    }

    // Step 3: Calculate required coverage per IRC R905.1.2
    const calculationDetails = this.calculateRequiredCoverage(measurements);

    if (!calculationDetails.calculatedCoverage) {
      return this.createInsufficientDataResult(
        'Unable to calculate required ice & water barrier coverage'
      );
    }

    // Step 4: Analyze current estimate vs. required
    if (iceWaterItems.length === 0) {
      return this.createSupplementNeededResult(
        'No ice & water barrier found in estimate',
        calculationDetails,
        null,
        calculationDetails.calculatedCoverage
      );
    }

    // Get the primary ice & water item (largest quantity)
    const primaryItem = this.selectPrimaryItem(iceWaterItems);
    const currentQuantity = this.parseQuantity(primaryItem.quantity);

    if (!currentQuantity) {
      return this.createInsufficientDataResult(
        'Unable to parse current ice & water barrier quantity'
      );
    }

    // Step 5: Calculate variance and determine compliance
    const varianceAmount = safeSubtract(
      currentQuantity,
      calculationDetails.calculatedCoverage
    );
    const variancePercentage =
      Math.abs(varianceAmount / calculationDetails.calculatedCoverage) * 100;

    // Determine status based on variance
    if (varianceAmount >= -25) {
      // Allow 25 SF tolerance for measurement variations
      return this.createCompliantResult(
        currentQuantity,
        calculationDetails,
        primaryItem,
        varianceAmount
      );
    } else {
      const supplementQuantity = calculationDetails.calculatedCoverage;
      return this.createSupplementNeededResult(
        `Current estimate (${formatNumber(currentQuantity)} SF) falls short of IRC R905.1.2 requirement (${formatNumber(calculationDetails.calculatedCoverage)} SF) by ${formatNumber(Math.abs(varianceAmount))} SF`,
        calculationDetails,
        primaryItem,
        supplementQuantity,
        varianceAmount
      );
    }
  }

  /**
   * Find ice & water barrier line items
   */
  private findIceWaterBarrierItems(
    lineItems: ExtractedLineItem[]
  ): ExtractedLineItem[] {
    const keywords = [
      'ice',
      'water',
      'barrier',
      'membrane',
      'shield',
      'iws',
      'i&w',
      'ice&water',
      'icewater',
      'modified bitumen',
      'self-adhering',
      'peel stick',
    ];

    return lineItems.filter(item => {
      const desc = item.description?.toLowerCase() || '';
      const code = item.code?.toLowerCase() || '';

      // Look for ice & water related terms
      const hasIceWaterKeywords = keywords.some(
        keyword => desc.includes(keyword) || code.includes(keyword)
      );

      // Exclude items that are clearly not barriers (like ice dam removal)
      const excludeKeywords = ['removal', 'repair', 'cleaning', 'inspection'];
      const isExcluded = excludeKeywords.some(
        keyword => desc.includes(keyword) || code.includes(keyword)
      );

      return hasIceWaterKeywords && !isExcluded;
    });
  }

  /**
   * Extract relevant measurements from roof data
   */
  private extractMeasurements(roofMeasurements: RoofMeasurements) {
    return {
      totalEaves: roofMeasurements.eaveLength || null,
      soffitDepth: 24, // Default 24" - will be improved in future with actual measurement extraction
      wallThickness: 6, // Default 6" - will be improved in future with actual measurement extraction
      roofPitch: roofMeasurements.predominantPitch || null,
    };
  }

  /**
   * Calculate required ice & water barrier coverage per IRC R905.1.2
   */
  private calculateRequiredCoverage(measurements: any) {
    const { totalEaves, soffitDepth, wallThickness, roofPitch } = measurements;

    // Parse roof pitch to get multiplier
    const pitchMultiplier = this.calculatePitchMultiplier(roofPitch);

    // IRC R905.1.2 calculation:
    // Coverage must extend 24" inside exterior wall line
    const insideWallDistance = safeAdd(soffitDepth, wallThickness); // Distance to wall line
    const requiredFromWall = 24; // IRC requirement: 24" inside wall line
    const totalFromEdge = safeAdd(insideWallDistance, requiredFromWall); // Total distance from edge

    // Adjust for roof pitch (steeper roofs need more coverage)
    const pitchAdjustedDistance = safeMultiply(totalFromEdge, pitchMultiplier);

    // Add safety margin for measurement variations
    const safetyMargin = 0.05; // 5% safety margin
    const requiredWidth = safeMultiply(
      pitchAdjustedDistance,
      safeAdd(1, safetyMargin)
    );

    // Calculate total square footage
    const requiredWidthFeet = requiredWidth / 12; // Convert inches to feet
    const calculatedCoverage = safeMultiply(totalEaves, requiredWidthFeet);

    return {
      totalEaves,
      soffitDepth,
      wallThickness,
      roofPitch,
      pitchMultiplier,
      requiredWidth: Math.round(requiredWidth * 100) / 100, // Round to 2 decimal places
      calculatedCoverage: Math.round(calculatedCoverage),
      safetyMargin: safetyMargin * 100, // Convert to percentage
    };
  }

  /**
   * Calculate pitch multiplier for IRC requirement
   */
  private calculatePitchMultiplier(roofPitch: string | null): number {
    if (!roofPitch) return 1.0;

    const pitch = roofPitch.toLowerCase();

    // Extract rise/run ratio (e.g., "6/12" or "6:12")
    const match = pitch.match(/(\d+)[/:]\s*(\d+)/);
    if (!match) return 1.0;

    const rise = parseInt(match[1], 10);
    const run = parseInt(match[2], 10);

    if (run === 0) return 1.0;

    // Calculate multiplier based on pitch
    // Steeper pitches need more coverage due to geometry
    const pitchRatio = rise / run;
    const multiplier = Math.sqrt(1 + pitchRatio * pitchRatio);

    return Math.round(multiplier * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Parse measurement string to number (handles various formats)
   */
  private parseMeasurement(measurement: string | number | null): number | null {
    if (typeof measurement === 'number') return measurement;
    if (!measurement) return null;

    const str = measurement.toString().toLowerCase();
    const match = str.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Parse quantity from line item (handles both string and object formats)
   */
  private parseQuantity(quantity: any): number | null {
    if (!quantity) return null;

    // Handle object format { value: number, unit: string, unitNormalized: string }
    if (typeof quantity === 'object' && 'value' in quantity) {
      return quantity.value || null;
    }

    // Handle string format
    if (typeof quantity === 'string') {
      const cleaned = quantity.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }

    // Handle number format
    if (typeof quantity === 'number') {
      return quantity;
    }

    return null;
  }

  /**
   * Select primary ice & water barrier item (largest quantity)
   */
  private selectPrimaryItem(items: ExtractedLineItem[]): ExtractedLineItem {
    return items.reduce((largest, current) => {
      const largestQty = this.parseQuantity(largest.quantity) || 0;
      const currentQty = this.parseQuantity(current.quantity) || 0;
      return currentQty > largestQty ? current : largest;
    });
  }

  /**
   * Create compliant result
   */
  private createCompliantResult(
    currentQuantity: number,
    calculationDetails: any,
    primaryItem: ExtractedLineItem,
    varianceAmount: number
  ): IceWaterBarrierAnalysisResult {
    return {
      status: 'COMPLIANT',
      confidence: 0.9,
      reasoning: `Ice & water barrier coverage (${formatNumber(currentQuantity)} SF) meets IRC R905.1.2 requirements (${formatNumber(calculationDetails.calculatedCoverage)} SF)`,

      calculationDetails,

      estimateQuantity: `${formatNumber(currentQuantity)} SF`,
      requiredQuantity: `${formatNumber(calculationDetails.calculatedCoverage)} SF`,
      variance:
        varianceAmount >= 0
          ? `+${formatNumber(varianceAmount)} SF excess`
          : `${formatNumber(Math.abs(varianceAmount))} SF within tolerance`,
      varianceAmount,
      varianceType: varianceAmount >= 0 ? 'excess' : 'adequate',

      materialStatus: 'compliant',
      barrierType: 'ice-water-barrier',

      costImpact: 0,
      unitPrice: primaryItem.unitPrice || null,

      currentSpecification: {
        code: primaryItem.code || null,
        description: primaryItem.description || null,
        quantity: this.formatQuantityForDisplay(primaryItem.quantity),
        rate: primaryItem.unitPrice
          ? `$${primaryItem.unitPrice.toFixed(2)}`
          : null,
        total: primaryItem.rcv ? `$${primaryItem.rcv.toFixed(2)}` : null,
      },

      evidenceReferences: [`Line item: ${primaryItem.code || 'N/A'}`],
      documentationNote: `Current ice & water barrier specification meets IRC R905.1.2 coverage requirements.`,
      supplementRecommendation: null,
    };
  }

  /**
   * Create supplement needed result
   */
  private createSupplementNeededResult(
    reasoning: string,
    calculationDetails: any,
    primaryItem: ExtractedLineItem | null,
    requiredQuantity: number,
    varianceAmount?: number
  ): IceWaterBarrierAnalysisResult {
    const unitPrice = 1.85; // Standard ice & water barrier price per SF
    const costImpact = safeMultiply(requiredQuantity, unitPrice);

    return {
      status: 'SUPPLEMENT_NEEDED',
      confidence: 0.85,
      reasoning,

      calculationDetails,

      estimateQuantity: primaryItem
        ? `${formatNumber(this.parseQuantity(primaryItem.quantity) || 0)} SF`
        : 'Not found',
      requiredQuantity: `${formatNumber(requiredQuantity)} SF`,
      variance: varianceAmount
        ? `${formatNumber(Math.abs(varianceAmount))} SF shortage`
        : 'Complete coverage needed',
      varianceAmount: varianceAmount || -requiredQuantity,
      varianceType: 'shortage',

      materialStatus: 'non-compliant',
      barrierType: primaryItem ? 'ice-water-barrier' : null,

      costImpact: Math.round(costImpact * 100) / 100,
      unitPrice,

      currentSpecification: primaryItem
        ? {
            code: primaryItem.code || null,
            description: primaryItem.description || null,
            quantity: this.formatQuantityForDisplay(primaryItem.quantity),
            rate: primaryItem.unitPrice
              ? `$${primaryItem.unitPrice.toFixed(2)}`
              : null,
            total: primaryItem.rcv ? `$${primaryItem.rcv.toFixed(2)}` : null,
          }
        : null,

      evidenceReferences: primaryItem
        ? [`Line item: ${primaryItem.code || 'N/A'}`]
        : ['No ice & water barrier found in estimate'],
      documentationNote: this.generateDocumentationNote(calculationDetails),
      supplementRecommendation: `Add ${formatNumber(requiredQuantity)} SF ice & water barrier to meet IRC R905.1.2 requirements`,
    };
  }

  /**
   * Create insufficient data result
   */
  private createInsufficientDataResult(
    reason: string
  ): IceWaterBarrierAnalysisResult {
    return {
      status: 'INSUFFICIENT_DATA',
      confidence: 0.1,
      reasoning: reason,

      calculationDetails: {
        totalEaves: null,
        soffitDepth: null,
        wallThickness: null,
        roofPitch: null,
        pitchMultiplier: 1.0,
        requiredWidth: null,
        calculatedCoverage: null,
        safetyMargin: 5,
      },

      estimateQuantity: null,
      requiredQuantity: null,
      variance: null,
      varianceAmount: null,
      varianceType: 'shortage',

      materialStatus: 'non-compliant',
      barrierType: null,

      costImpact: 0,
      unitPrice: null,

      currentSpecification: null,

      evidenceReferences: [],
      documentationNote: 'Insufficient data to perform IRC R905.1.2 analysis',
      supplementRecommendation: null,
    };
  }

  /**
   * Generate documentation note for IRC compliance
   */
  private generateDocumentationNote(calculationDetails: any): string {
    const {
      totalEaves,
      soffitDepth,
      wallThickness,
      roofPitch,
      requiredWidth,
      calculatedCoverage,
    } = calculationDetails;

    return `IRC R905.1.2 requires ice barrier to extend 24" inside the exterior wall line. Based on measurements (${formatNumber(totalEaves)} LF eaves, ${soffitDepth}" soffit depth, ${wallThickness}" wall thickness${roofPitch ? `, ${roofPitch} pitch` : ''}), required coverage width is ${requiredWidth}" from edge, totaling ${formatNumber(calculatedCoverage)} SF.`;
  }

  /**
   * Format quantity for display (handles both object and string formats)
   */
  private formatQuantityForDisplay(quantity: any): string | null {
    if (!quantity) return null;

    // Handle object format { value: number, unit: string }
    if (typeof quantity === 'object' && 'value' in quantity) {
      return `${formatNumber(quantity.value)} ${quantity.unit || 'SF'}`;
    }

    // Handle string format
    if (typeof quantity === 'string') {
      return quantity;
    }

    // Handle number format
    if (typeof quantity === 'number') {
      return `${formatNumber(quantity)} SF`;
    }

    return null;
  }

  /**
   * Parse unit price from rate string
   */
  private parseUnitPrice(rate: string | null): number | null {
    if (!rate) return null;

    const match = rate.match(/\$?(\d+(?:\.\d{2})?)/);
    return match ? parseFloat(match[1]) : null;
  }
}

// Export analyzer instance
export const iceWaterBarrierAnalyzer = new IceWaterBarrierAnalyzer();
