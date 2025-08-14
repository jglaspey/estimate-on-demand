/**
 * Upload Integration Service
 * 
 * Integrates Phase 1 extraction into the upload workflow with real-time updates
 * and graceful degradation for production use.
 */

import { extractPhase1Fields, quickExtractPhase1, type Phase1Fields, type Phase1ExtractionResult } from './claude-phase1-extractor';
import { WebSocket } from 'ws';

export interface UploadExtractionOptions {
  jobId: string;
  filePath: string;
  fileName: string;
  websocket?: WebSocket;
  fallbackToOCR?: boolean;
  skipExtraction?: boolean;
}

export interface UploadExtractionResponse {
  jobId: string;
  phase: 'phase1-extraction';
  status: 'processing' | 'completed' | 'failed' | 'skipped';
  fields: Phase1Fields;
  metadata: {
    fileName: string;
    extractionRate: number;
    confidence: 'high' | 'medium' | 'low';
    processingTimeMs: number;
    fieldsFound: number;
    warnings: string[];
    error?: string;
  };
  nextSteps: string[];
}

/**
 * Execute Phase 1 extraction during upload workflow
 */
export async function executeUploadExtraction(
  options: UploadExtractionOptions
): Promise<UploadExtractionResponse> {
  const { jobId, filePath, fileName, websocket, skipExtraction = false } = options;

  // Send initial processing update
  if (websocket) {
    websocket.send(JSON.stringify({
      type: 'job:progress',
      jobId,
      phase: 'phase1-extraction',
      status: skipExtraction ? 'skipping' : 'processing',
      message: skipExtraction ? 'Skipping extraction (user preference)' : 'Extracting key document fields...',
      progress: 30
    }));
  }

  // Handle skip extraction case
  if (skipExtraction) {
    return {
      jobId,
      phase: 'phase1-extraction',
      status: 'skipped',
      fields: createEmptyFields(),
      metadata: {
        fileName,
        extractionRate: 0,
        confidence: 'low',
        processingTimeMs: 0,
        fieldsFound: 0,
        warnings: ['Extraction skipped by user preference']
      },
      nextSteps: ['Proceed to business rule analysis']
    };
  }

  try {
    // Execute extraction with detailed result
    const result = await extractPhase1Fields(filePath, {
      maxTokens: 800,
      timeoutMs: 30000
    });

    // Send progress update based on result
    if (websocket) {
      websocket.send(JSON.stringify({
        type: 'extraction:phase1:complete',
        jobId,
        status: result.success ? 'completed' : 'failed',
        message: result.success 
          ? `Found ${result.fieldsFound}/8 key fields (${result.extractionRate}% extraction rate)`
          : `Extraction encountered issues: ${result.error}`,
        progress: result.success ? 45 : 35,
        confidence: result.confidence,
        fields: result.fields,
        warnings: result.warnings
      }));
    }

    // Determine next steps based on extraction quality
    const nextSteps = determineNextSteps(result);

    return {
      jobId,
      phase: 'phase1-extraction',
      status: result.success ? 'completed' : 'failed',
      fields: result.fields,
      metadata: {
        fileName,
        extractionRate: result.extractionRate,
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
        fieldsFound: result.fieldsFound,
        warnings: result.warnings,
        error: result.error
      },
      nextSteps
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
    
    // Send error update
    if (websocket) {
      websocket.send(JSON.stringify({
        type: 'extraction:phase1:error',
        jobId,
        status: 'failed',
        message: `Phase 1 extraction failed: ${errorMessage}`,
        progress: 30,
        error: errorMessage
      }));
    }

    return {
      jobId,
      phase: 'phase1-extraction',
      status: 'failed',
      fields: createEmptyFields(),
      metadata: {
        fileName,
        extractionRate: 0,
        confidence: 'low',
        processingTimeMs: 0,
        fieldsFound: 0,
        warnings: ['Complete extraction failure'],
        error: errorMessage
      },
      nextSteps: ['Consider manual field entry', 'Proceed with business rule analysis']
    };
  }
}

/**
 * Determine next workflow steps based on extraction results
 */
function determineNextSteps(result: Phase1ExtractionResult): string[] {
  const steps: string[] = [];

  if (result.confidence === 'high') {
    steps.push('Proceed to business rule analysis');
    steps.push('Fields ready for user review');
  } else if (result.confidence === 'medium') {
    steps.push('Review extracted fields for accuracy');
    steps.push('Proceed to business rule analysis');
    steps.push('Consider manual verification of missing fields');
  } else {
    steps.push('Manual field verification recommended');
    steps.push('Consider re-extraction with different method');
    steps.push('Proceed with business rule analysis (reduced accuracy expected)');
  }

  // Add specific recommendations based on missing fields
  if (result.fieldsFound < 6) {
    steps.push('Multiple key fields missing - manual entry may be needed');
  }

  if (result.warnings.length > 0) {
    steps.push(`Review ${result.warnings.length} warning(s) in extraction log`);
  }

  return steps;
}

/**
 * Create empty fields for error/skip cases
 */
function createEmptyFields(): Phase1Fields {
  return {
    customerName: null,
    dateOfLoss: null,
    carrier: null,
    claimRep: null,
    estimator: null,
    propertyAddress: null,
    claimNumber: null,
    policyNumber: null
  };
}

/**
 * Quick upload extraction for simple use cases
 * Returns formatted summary for immediate UI display
 */
export async function quickUploadExtraction(
  filePath: string,
  fileName: string
): Promise<{
  success: boolean;
  displaySummary: string;
  fields: Phase1Fields;
  confidence: string;
  recommendations: string[];
}> {
  const result = await quickExtractPhase1(filePath);
  
  const displaySummary = result.success
    ? `✅ Extracted key fields (${result.confidence} confidence)`
    : `⚠️ Extraction issues detected`;

  const recommendations: string[] = [];
  
  if (result.confidence === 'high') {
    recommendations.push('✅ Ready for business rule analysis');
  } else if (result.confidence === 'medium') {
    recommendations.push('⚠️ Review fields for accuracy');
    recommendations.push('✅ Proceed with analysis');
  } else {
    recommendations.push('❌ Manual field verification needed');
    recommendations.push('⚠️ Consider re-upload or manual entry');
  }

  return {
    success: result.success,
    displaySummary,
    fields: result.fields,
    confidence: result.confidence,
    recommendations
  };
}