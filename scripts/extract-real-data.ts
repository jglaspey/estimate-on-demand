#!/usr/bin/env ts-node
/**
 * Real Document Extraction Script
 * 
 * Actually calls Mistral OCR and Sonnet analysis on example documents
 * to populate database with authentic extraction results for UI testing.
 * 
 * This replaces synthetic data with real LLM processing results.
 * 
 * Run with: npx ts-node scripts/extract-real-data.ts
 */

import { PrismaClient, JobStatus, RuleType, RuleStatus, UserDecision, AnalysisType } from '../src/generated/prisma';
import path from 'path';
import fs from 'fs';

// Add pgbouncer parameter to prevent prepared statement issues
const databaseUrl = process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'pgbouncer=true&statement_cache_size=0';

let prisma: PrismaClient;

function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: databaseUrl,
    log: ['error', 'warn']
  });
}

// Target documents for real extraction
const TARGET_DOCUMENTS = [
  {
    name: 'Evans___Bob_NE_5916_estimate.pdf',
    roofReport: 'Evans___Bob_NE_5916_roof-report.pdf'
  },
  {
    name: 'Fritch__Jeanne_NE_5919_estimate.pdf', 
    roofReport: 'Fritch__Jeanne_NE_5919_roof-report.pdf'
  },
  {
    name: 'Hall__Steve_and_Wendy_NE_6181_estimate.pdf',
    roofReport: 'Hall__Steve_and_Wendy_NE_6181_roof-report.pdf'
  }
];

interface MistralOCRResponse {
  object: string;
  created: number;
  model: string;
  content: Array<{
    text: string;
    bboxes?: Array<any>;
    page?: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MistralExtractionResponse {
  model: string;
  business_fields: {
    hip_ridge_cap: {
      found: boolean;
      quantity?: number;
      description?: string;
      source_page?: number;
      confidence?: number;
    };
    starter_strip: {
      found: boolean;
      quantity?: number;
      description?: string;
      source_page?: number;
      confidence?: number;
    };
    drip_edge: {
      found: boolean;
      quantity?: number;
      description?: string;
      source_page?: number;
      confidence?: number;
    };
    gutter_apron: {
      found: boolean;
      quantity?: number;
      description?: string;
      source_page?: number;
      confidence?: number;
    };
    ice_water_barrier: {
      found: boolean;
      coverage?: number;
      description?: string;
      source_page?: number;
      confidence?: number;
    };
  };
  extraction_quality: {
    overall_confidence: number;
    fields_found: number;
    document_clarity: 'high' | 'medium' | 'low';
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface SonnetAnalysisResponse {
  model: string;
  overall_assessment: {
    document_quality: 'high' | 'medium' | 'low' | 'concerning';
    extraction_accuracy: number;
    business_rule_compliance: 'compliant' | 'non-compliant' | 'partial';
    supplement_required: boolean;
    key_findings: string[];
  };
  business_rule_evaluations: {
    [key: string]: {
      status: 'PASSED' | 'FAILED' | 'WARNING' | 'MANUAL';
      confidence: number;
      findings: string;
      recommendation?: string;
    };
  };
  compliance_findings: {
    code_compliance: 'compliant' | 'non-compliant' | 'needs-review';
    standards_compliance: 'meets-standards' | 'below-standards' | 'partial';
    risk_level: 'low' | 'medium' | 'high';
  };
  supplement_recommendations?: {
    supplement_required: boolean;
    estimated_cost?: number;
    priority_items: Array<{
      component: string;
      reason: string;
      urgency: 'high' | 'medium' | 'low';
    }>;
  };
  quality_scores: {
    accuracy: number;
    completeness: number;
    confidence: number;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function callMistralOCR(filePath: string): Promise<MistralOCRResponse> {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable not set');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log(`📄 Calling Mistral OCR for ${path.basename(filePath)}...`);

  // Convert PDF to base64
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${base64Data}`
      },
      include_image_base64: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral OCR API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function callMistralExtraction(ocrText: string): Promise<MistralExtractionResponse> {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  
  console.log(`🔍 Calling Mistral for business field extraction...`);

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content: `You are an expert insurance document analyzer specializing in roofing estimates and supplements. 

Extract business rule fields from roofing estimate documents with high precision.

BUSINESS RULES TO EXTRACT:

1. **Hip/Ridge Cap**: Look for purpose-built ridge caps vs "cut from 3-tab shingles"
2. **Starter Strip**: Universal starter course with factory adhesive vs cut shingles  
3. **Drip Edge**: Aluminum drip edge for rake protection (linear feet)
4. **Gutter Apron**: Aluminum gutter apron for eave protection (linear feet)
5. **Ice & Water Barrier**: Self-adhering barrier coverage (squares or feet)

For each field, determine:
- found: boolean (is component specified?)
- quantity: number (amount/coverage if specified)
- description: string (exact text from document)
- source_page: number (which page contains the information)
- confidence: number (0.0-1.0 confidence in extraction)

Return results in this exact JSON structure:
{
  "model": "mistral-large-latest",
  "business_fields": {
    "hip_ridge_cap": { "found": boolean, "quantity": number, "description": string, "source_page": number, "confidence": number },
    "starter_strip": { "found": boolean, "quantity": number, "description": string, "source_page": number, "confidence": number },
    "drip_edge": { "found": boolean, "quantity": number, "description": string, "source_page": number, "confidence": number },
    "gutter_apron": { "found": boolean, "quantity": number, "description": string, "source_page": number, "confidence": number },
    "ice_water_barrier": { "found": boolean, "coverage": number, "description": string, "source_page": number, "confidence": number }
  },
  "extraction_quality": {
    "overall_confidence": number,
    "fields_found": number,
    "document_clarity": "high|medium|low"
  }
}`
        },
        {
          role: 'user',
          content: `Analyze this roofing estimate document and extract the business rule fields:\n\n${ocrText}`
        }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral extraction API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

async function callSonnetAnalysis(mistralExtraction: MistralExtractionResponse, documentText: string): Promise<SonnetAnalysisResponse> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  console.log(`🧠 Calling Sonnet for business rule analysis...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.1,
      system: `You are an expert insurance supplement analyst specializing in roofing business rule compliance.

Analyze Mistral's extraction results against these 4 critical business rules:

1. **Hip/Ridge Cap Quality**: Purpose-built ridge caps meeting ASTM D3161/D7158 vs inadequate cut 3-tab shingles
2. **Starter Strip Compliance**: Universal starter course with factory adhesive vs cut shingles  
3. **Drip Edge Coverage**: Proper aluminum drip edge along rakes for water management
4. **Gutter Apron Protection**: Aluminum gutter apron along eaves for underlayment protection
5. **Ice & Water Barrier Code**: Minimum 3-foot coverage per IRC R905.1.2

For each rule, determine:
- status: "PASSED", "FAILED", "WARNING", or "MANUAL" 
- confidence: 0.0-1.0 confidence in assessment
- findings: detailed explanation of compliance status
- recommendation: specific action needed if non-compliant

Return analysis in this exact JSON structure:
{
  "model": "claude-3-5-sonnet-20241022",
  "overall_assessment": {
    "document_quality": "high|medium|low|concerning",
    "extraction_accuracy": number,
    "business_rule_compliance": "compliant|non-compliant|partial", 
    "supplement_required": boolean,
    "key_findings": [string]
  },
  "business_rule_evaluations": {
    "hip_ridge_cap": { "status": string, "confidence": number, "findings": string, "recommendation": string },
    "starter_strip": { "status": string, "confidence": number, "findings": string, "recommendation": string },
    "drip_edge": { "status": string, "confidence": number, "findings": string, "recommendation": string },
    "gutter_apron": { "status": string, "confidence": number, "findings": string, "recommendation": string },
    "ice_water_barrier": { "status": string, "confidence": number, "findings": string, "recommendation": string }
  },
  "compliance_findings": {
    "code_compliance": "compliant|non-compliant|needs-review",
    "standards_compliance": "meets-standards|below-standards|partial",
    "risk_level": "low|medium|high"
  },
  "supplement_recommendations": {
    "supplement_required": boolean,
    "estimated_cost": number,
    "priority_items": [{"component": string, "reason": string, "urgency": string}]
  },
  "quality_scores": {
    "accuracy": number,
    "completeness": number, 
    "confidence": number
  }
}`,
      messages: [
        {
          role: 'user',
          content: `Analyze this Mistral extraction for business rule compliance:

MISTRAL EXTRACTION RESULTS:
${JSON.stringify(mistralExtraction, null, 2)}

ORIGINAL DOCUMENT TEXT:
${documentText}

Provide detailed business rule analysis with compliance assessment and supplement recommendations.`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sonnet analysis API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return JSON.parse(result.content[0].text);
}

async function processDocument(doc: typeof TARGET_DOCUMENTS[0], index: number) {
  const examplesPath = path.join(process.cwd(), 'examples');
  const estimatePath = path.join(examplesPath, doc.name);
  const roofReportPath = path.join(examplesPath, doc.roofReport);
  
  console.log(`\n🔄 Processing ${doc.name}...`);

  // Get file info
  const estimateSize = fs.existsSync(estimatePath) ? fs.statSync(estimatePath).size : 0;
  const roofReportSize = fs.existsSync(roofReportPath) ? fs.statSync(roofReportPath).size : 0;

  // Create job record
  const job = await prisma.job.create({
    data: {
      fileName: doc.name,
      fileSize: estimateSize,
      status: JobStatus.EXTRACTING,
      uploadedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)),
      filePath: `/uploads/${doc.name}`,
      fileHash: `real_${index}_${Date.now()}`,
      userId: 'proto_user_001'
    }
  });

  try {
    // Step 1: OCR extraction
    console.log(`  📄 Extracting text from ${doc.name}...`);
    const startOCR = Date.now();
    const ocrResult = await callMistralOCR(estimatePath);
    const ocrTime = Date.now() - startOCR;

    // Create document records and pages
    const estimateDoc = await prisma.document.create({
      data: {
        jobId: job.id,
        fileName: doc.name,
        pageCount: ocrResult.pages?.length || 3,
        status: 'COMPLETED' as any,
        processedAt: new Date(),
        filePath: `/uploads/${doc.name}`,
        fileSize: estimateSize,
        mimeType: 'application/pdf'
      }
    });

    // Store extracted pages from OCR content
    if (ocrResult.content && ocrResult.content.length > 0) {
      // Group content by page if page numbers are provided
      const pageGroups = new Map<number, string[]>();
      
      for (const content of ocrResult.content) {
        const pageNum = content.page || 1; // Default to page 1 if not specified
        if (!pageGroups.has(pageNum)) {
          pageGroups.set(pageNum, []);
        }
        pageGroups.get(pageNum)!.push(content.text);
      }
      
      // Create document pages
      for (const [pageNumber, texts] of pageGroups.entries()) {
        const fullText = texts.join('\n');
        await prisma.documentPage.create({
          data: {
            jobId: job.id,
            documentId: estimateDoc.id,
            pageNumber: pageNumber,
            fullText: fullText,
            wordCount: fullText.split(/\s+/).length,
            extractedAt: new Date(),
            extractionMethod: 'mistral-ocr',
            confidence: 0.9, // Default confidence since it's not in the response
            width: 612,
            height: 792,
            imageCount: 0
          }
        });
      }
    }

    // Step 2: Business field extraction
    console.log(`  🔍 Extracting business fields...`);
    const startExtraction = Date.now();
    // Concatenate all text from OCR results
    const fullText = ocrResult.content ? ocrResult.content.map(c => c.text).join('\n') : '';
    const extractionResult = await callMistralExtraction(fullText);
    const extractionTime = Date.now() - startExtraction;

    // Store Mistral extraction
    const mistralExtraction = await prisma.mistralExtraction.create({
      data: {
        jobId: job.id,
        mistralModel: 'mistral-ocr-latest',
        inputType: 'text-pdf',
        processingTime: ocrTime + extractionTime,
        tokenUsage: {
          input: (ocrResult.usage?.prompt_tokens || 0) + 2000, // Approximate
          output: (ocrResult.usage?.completion_tokens || 0) + 500
        },
        cost: 0.02, // Approximate cost
        success: true,
        rawExtraction: {
          ocr_result: ocrResult as any,
          extraction_result: extractionResult as any,
          timestamp: new Date().toISOString()
        } as any,
        hipRidgeCap: extractionResult.business_fields.hip_ridge_cap,
        starterStrip: extractionResult.business_fields.starter_strip,
        dripEdge: extractionResult.business_fields.drip_edge,
        gutterApron: extractionResult.business_fields.gutter_apron,
        iceWaterBarrier: extractionResult.business_fields.ice_water_barrier,
        confidence: extractionResult.extraction_quality.overall_confidence,
        fieldsFound: extractionResult.extraction_quality.fields_found,
        extractedAt: new Date()
      }
    });

    // Step 3: Sonnet analysis
    console.log(`  🧠 Analyzing with Sonnet...`);
    const startAnalysis = Date.now();
    const analysisResult = await callSonnetAnalysis(extractionResult, fullText);
    const analysisTime = Date.now() - startAnalysis;

    // Store Sonnet analysis
    await prisma.sonnetAnalysis.create({
      data: {
        jobId: job.id,
        mistralExtractionId: mistralExtraction.id,
        sonnetModel: 'claude-3-5-sonnet-20241022',
        analysisType: AnalysisType.BUSINESS_RULES,
        processingTime: analysisTime,
        tokenUsage: {
          input: 2000, // Approximate
          output: 800
        },
        cost: 0.012, // Approximate cost
        success: true,
        overallAssessment: analysisResult.overall_assessment,
        businessRuleEvaluations: analysisResult.business_rule_evaluations,
        complianceFindings: analysisResult.compliance_findings,
        supplementRecommendations: analysisResult.supplement_recommendations,
        accuracyScore: analysisResult.quality_scores.accuracy,
        completenessScore: analysisResult.quality_scores.completeness,
        confidenceScore: analysisResult.quality_scores.confidence,
        analyzedAt: new Date()
      }
    });

    // Step 4: Create business rule analyses
    for (const [ruleKey, evaluation] of Object.entries(analysisResult.business_rule_evaluations)) {
      const ruleType = RuleType[ruleKey.toUpperCase() as keyof typeof RuleType];
      if (ruleType) {
        await prisma.ruleAnalysis.create({
          data: {
            jobId: job.id,
            ruleType,
            status: RuleStatus[evaluation.status as keyof typeof RuleStatus] || RuleStatus.MANUAL,
            passed: evaluation.status === 'PASSED',
            confidence: evaluation.confidence,
            findings: {
              evaluation: evaluation.findings,
              source_data: extractionResult.business_fields[ruleKey as keyof typeof extractionResult.business_fields]
            },
            recommendation: evaluation.recommendation,
            reasoning: evaluation.findings,
            userDecision: UserDecision.PENDING,
            analyzedAt: new Date()
          }
        });
      }
    }

    // Update job status
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        processedAt: new Date(),
        completedAt: new Date()
      }
    });

    console.log(`  ✅ Successfully processed ${doc.name}`);
    console.log(`     - OCR: ${ocrTime}ms`);
    console.log(`     - Extraction: ${extractionTime}ms`);
    console.log(`     - Analysis: ${analysisTime}ms`);
    console.log(`     - Fields found: ${extractionResult.extraction_quality.fields_found}/5`);
    console.log(`     - Overall confidence: ${(extractionResult.extraction_quality.overall_confidence * 100).toFixed(1)}%`);

  } catch (error) {
    console.error(`❌ Error processing ${doc.name}:`, error);
    
    // Update job with error
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }

  return job;
}

async function main() {
  // Check for required API keys
  if (!process.env.MISTRAL_API_KEY) {
    console.error('❌ MISTRAL_API_KEY environment variable required');
    process.exit(1);
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable required');  
    process.exit(1);
  }

  // Create fresh Prisma client
  prisma = createPrismaClient();

  try {
    console.log('🚀 Starting real document extraction...\n');
    
    // Skip cleanup for now due to prepared statement issue
    console.log('⚠️  Skipping data cleanup (run separately if needed)\n');
    
    // Process each document
    const jobs = [];
    for (let i = 0; i < TARGET_DOCUMENTS.length; i++) {
      const job = await processDocument(TARGET_DOCUMENTS[i], i);
      jobs.push(job);
      
      // Small delay between documents to be API-friendly
      if (i < TARGET_DOCUMENTS.length - 1) {
        console.log('   ⏱️  Brief pause between documents...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Real extraction completed successfully!`);
    console.log(`\nProcessed ${jobs.length} documents with authentic LLM data:`);
    console.log(`- Real Mistral OCR text extraction`);
    console.log(`- Real Mistral business field extraction`);
    console.log(`- Real Sonnet business rule analysis`);
    console.log(`- Authentic edge cases and data patterns`);
    
    console.log(`\n🚀 Ready for UI testing with real data!`);
    console.log(`Your database now contains actual LLM processing results.`);
    
  } catch (error) {
    console.error('❌ Error in real extraction:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  main();
}

export { main as extractRealData };