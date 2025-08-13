#!/usr/bin/env ts-node
/**
 * Prototype Data Seeding Script
 * 
 * Manually populates database with realistic Mistral and Sonnet extraction data
 * based on the example PDF corpus. This allows UI/UX testing without API dependencies.
 * 
 * Strategy:
 * 1. Create Job records for sample documents
 * 2. Simulate Mistral extraction results (diverse scenarios)
 * 3. Generate Sonnet analysis results 
 * 4. Create business rule analyses for testing user workflows
 * 
 * Run with: npx ts-node scripts/seed-prototype-data.ts
 */

import { PrismaClient, JobStatus, RuleType, RuleStatus, UserDecision, AnalysisType } from '../src/generated/prisma';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Sample documents from examples/ folder
const SAMPLE_DOCUMENTS = [
  {
    name: 'Evans___Bob_NE_5916_estimate.pdf',
    roofReport: 'Evans___Bob_NE_5916_roof-report.pdf',
    scenario: 'adequate', // Has most required components
    issues: [] // No major issues
  },
  {
    name: 'Fritch__Jeanne_NE_5919_estimate.pdf', 
    roofReport: 'Fritch__Jeanne_NE_5919_roof-report.pdf',
    scenario: 'shortage', // Missing several components
    issues: ['missing_starter_strip', 'inadequate_ice_water', 'cut_ridge_cap']
  },
  {
    name: 'Granillo__Antonio_NE_6138_estimate.pdf',
    roofReport: 'Granillo__Antonio_NE_6138_roof-report.pdf', 
    scenario: 'mixed', // Some found, some missing
    issues: ['missing_drip_edge', 'gutter_apron_insufficient']
  },
  {
    name: 'Hall__Steve_and_Wendy_NE_6181_estimate.pdf',
    roofReport: 'Hall__Steve_and_Wendy_NE_6181_roof-report.pdf',
    scenario: 'adequate',
    issues: []
  },
  {
    name: 'Hecht__Robert_NE_6251_estimate.pdf',
    roofReport: 'Hecht__Robert_NE_6251_roof-report.pdf',
    scenario: 'shortage', 
    issues: ['cut_ridge_cap', 'missing_starter_strip', 'insufficient_ice_water']
  }
];

// Realistic business rule scenarios
const BUSINESS_RULE_SCENARIOS = {
  adequate: {
    HIP_RIDGE_CAP: {
      found: true,
      quantity: 6,
      description: 'Purpose-built ridge cap shingles - standard profile composition shingles',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.92,
      reasoning: 'Document clearly specifies purpose-built ridge cap shingles, meeting ASTM D3161 standards.'
    },
    STARTER_STRIP: {
      found: true,
      quantity: 165,
      description: 'Universal starter course - factory adhesive strip',
      sourcePageNumber: 2, 
      status: RuleStatus.PASSED,
      confidence: 0.89,
      reasoning: 'Universal starter course specified with factory adhesive, meets wind resistance requirements.'
    },
    DRIP_EDGE: {
      found: true,
      quantity: 85.5,
      description: 'Aluminum drip edge - standard profile',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.94,
      reasoning: 'Drip edge properly specified for rake protection, quantity matches roof measurements.'
    },
    GUTTER_APRON: {
      found: true,
      quantity: 171.42,
      description: 'Aluminum gutter apron - standard profile',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.88,
      reasoning: 'Gutter apron specified for eave protection, coverage appears adequate.'
    },
    ICE_WATER_BARRIER: {
      found: true,
      coverage: 2.5,
      description: 'Self-adhering ice and water barrier - 3 feet up slope',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.85,
      reasoning: 'Ice & water barrier meets minimum 3-foot coverage requirement per IRC R905.1.2.'
    }
  },
  shortage: {
    HIP_RIDGE_CAP: {
      found: true,
      quantity: 4,
      description: 'Ridge cap cut from 3-tab shingles', 
      sourcePageNumber: 1,
      status: RuleStatus.FAILED,
      confidence: 0.91,
      reasoning: 'Document specifies ridge cap "cut from 3-tab shingles" which does not meet ASTM standards. Requires purpose-built ridge cap.'
    },
    STARTER_STRIP: {
      found: false,
      quantity: 0,
      description: null,
      sourcePageNumber: null,
      status: RuleStatus.FAILED,
      confidence: 0.87,
      reasoning: 'No starter strip specified. Universal starter course required for proper wind resistance and edge protection.'
    },
    DRIP_EDGE: {
      found: true,
      quantity: 45.0,
      description: 'Aluminum drip edge - partial coverage',
      sourcePageNumber: 1,
      status: RuleStatus.WARNING,
      confidence: 0.82,
      reasoning: 'Drip edge found but coverage appears insufficient compared to roof dimensions. Review needed.'
    },
    GUTTER_APRON: {
      found: false,
      quantity: 0, 
      description: null,
      sourcePageNumber: null,
      status: RuleStatus.FAILED,
      confidence: 0.93,
      reasoning: 'Gutter apron not specified. Required for proper eave protection and water management.'
    },
    ICE_WATER_BARRIER: {
      found: true,
      coverage: 1.5,
      description: 'Self-adhering ice and water barrier - insufficient coverage',
      sourcePageNumber: 2,
      status: RuleStatus.FAILED,
      confidence: 0.79,
      reasoning: 'Ice & water barrier coverage insufficient. Only 1.5 feet specified, minimum 3 feet required per IRC R905.1.2.'
    }
  },
  mixed: {
    HIP_RIDGE_CAP: {
      found: true,
      quantity: 8,
      description: 'Purpose-built ridge cap shingles - standard profile',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.90,
      reasoning: 'Purpose-built ridge cap properly specified, meets ASTM standards.'
    },
    STARTER_STRIP: {
      found: true, 
      quantity: 140,
      description: 'Universal starter course',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.86,
      reasoning: 'Universal starter course specified, adequate for wind resistance.'
    },
    DRIP_EDGE: {
      found: false,
      quantity: 0,
      description: null,
      sourcePageNumber: null,
      status: RuleStatus.FAILED,
      confidence: 0.91,
      reasoning: 'Drip edge not specified. Required for rake protection and water management compliance.'
    },
    GUTTER_APRON: {
      found: true,
      quantity: 95.25,
      description: 'Aluminum gutter apron - insufficient length',
      sourcePageNumber: 1,
      status: RuleStatus.WARNING,
      confidence: 0.74,
      reasoning: 'Gutter apron specified but coverage may be insufficient based on roof report measurements.'
    },
    ICE_WATER_BARRIER: {
      found: true,
      coverage: 3.0,
      description: 'Self-adhering ice and water barrier - minimum coverage',
      sourcePageNumber: 2,
      status: RuleStatus.PASSED,
      confidence: 0.83,
      reasoning: 'Ice & water barrier meets minimum 3-foot requirement, though additional coverage recommended.'
    }
  }
};

async function createSampleJob(doc: typeof SAMPLE_DOCUMENTS[0], index: number) {
  const examplesPath = path.join(process.cwd(), 'examples');
  const estimatePath = path.join(examplesPath, doc.name);
  const roofReportPath = path.join(examplesPath, doc.roofReport);
  
  // Get file sizes if files exist
  let estimateSize = 0;
  let roofReportSize = 0;
  
  try {
    if (fs.existsSync(estimatePath)) {
      estimateSize = fs.statSync(estimatePath).size;
    }
    if (fs.existsSync(roofReportPath)) {
      roofReportSize = fs.statSync(roofReportPath).size;
    }
  } catch (error) {
    console.warn(`Could not read file sizes for ${doc.name}:`, error);
  }

  // Create main job
  const job = await prisma.job.create({
    data: {
      fileName: doc.name,
      fileSize: estimateSize,
      status: JobStatus.COMPLETED,
      uploadedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)), // Stagger dates
      processedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000) + 5 * 60 * 1000), // 5 min later
      completedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000) + 10 * 60 * 1000), // 10 min later
      filePath: `/uploads/${doc.name}`,
      fileHash: `hash_${index}_${Date.now()}`,
      userId: 'proto_user_001'
    }
  });

  // Create document records
  const estimateDoc = await prisma.document.create({
    data: {
      jobId: job.id,
      fileName: doc.name,
      pageCount: 3, // Typical estimate page count
      status: 'COMPLETED' as any,
      processedAt: job.processedAt,
      filePath: `/uploads/${doc.name}`,
      fileSize: estimateSize,
      mimeType: 'application/pdf'
    }
  });

  const roofDoc = await prisma.document.create({
    data: {
      jobId: job.id,
      fileName: doc.roofReport,
      pageCount: 2, // Typical roof report page count  
      status: 'COMPLETED' as any,
      processedAt: job.processedAt,
      filePath: `/uploads/${doc.roofReport}`,
      fileSize: roofReportSize,
      mimeType: 'application/pdf'
    }
  });

  // Create sample document pages with realistic text content
  await createDocumentPages(job.id, estimateDoc.id, 'estimate');
  await createDocumentPages(job.id, roofDoc.id, 'roof-report');

  // Create Mistral extraction based on scenario
  const mistralExtraction = await createMistralExtraction(job.id, doc.scenario);
  
  // Create Sonnet analysis of the Mistral extraction
  await createSonnetAnalysis(job.id, mistralExtraction.id, doc.scenario);
  
  // Create business rule analyses
  await createBusinessRuleAnalyses(job.id, doc.scenario);

  console.log(`✓ Created job ${job.id} for ${doc.name} (${doc.scenario} scenario)`);
  return job;
}

async function createDocumentPages(jobId: string, documentId: string, docType: 'estimate' | 'roof-report') {
  if (docType === 'estimate') {
    // Page 1: Cover page
    await prisma.documentPage.create({
      data: {
        jobId,
        documentId,
        pageNumber: 1,
        fullText: `ROOFING ESTIMATE\n\nCustomer: [Customer Name]\nAddress: [Property Address]\nDate: ${new Date().toLocaleDateString()}\n\nESTIMATED ROOFING WORK\n\nScope of Work:\n- Complete roof replacement\n- Material and labor included\n- All necessary permits obtained\n\nTotal Estimate: $[Amount]`,
        wordCount: 45,
        extractedAt: new Date(),
        extractionMethod: 'pdf-parse',
        confidence: 0.95,
        width: 612,
        height: 792,
        imageCount: 0
      }
    });

    // Page 2: Line items (key business data)
    await prisma.documentPage.create({
      data: {
        jobId,
        documentId,
        pageNumber: 2,
        fullText: `LINE ITEM BREAKDOWN\n\n1. Roofing Materials\n   - Architectural shingles: 28 squares\n   - Underlayment: 28 squares\n   - Ridge cap shingles: 6 units\n   \n2. Edge Protection\n   - Drip edge: 85.5 linear feet\n   - Gutter apron: 171.42 linear feet\n   \n3. Starter Materials\n   - Starter strip: 165 linear feet\n   \n4. Barriers\n   - Ice & water barrier: 2.5 squares\n   \n5. Fasteners and Accessories\n   - Roofing nails: 50 lbs\n   - Ridge vent: 40 linear feet`,
        wordCount: 89,
        extractedAt: new Date(),
        extractionMethod: 'pdf-parse', 
        confidence: 0.92,
        width: 612,
        height: 792,
        imageCount: 0
      }
    });

    // Page 3: Terms and conditions
    await prisma.documentPage.create({
      data: {
        jobId,
        documentId,
        pageNumber: 3,
        fullText: `TERMS AND CONDITIONS\n\n• Work to commence upon signed contract and material delivery\n• All materials guaranteed for manufacturer warranty period\n• Work performed in accordance with local building codes\n• Final payment due upon completion and inspection\n\nCONTRACTOR INFORMATION\n[Contractor Name]\n[License Number]\n[Contact Information]\n\nCustomer Signature: _________________ Date: _______`,
        wordCount: 52,
        extractedAt: new Date(),
        extractionMethod: 'pdf-parse',
        confidence: 0.89,
        width: 612,
        height: 792,
        imageCount: 0
      }
    });
  } else {
    // Roof report pages
    await prisma.documentPage.create({
      data: {
        jobId,
        documentId,
        pageNumber: 1,
        fullText: `ROOF INSPECTION REPORT\n\nProperty: [Address]\nInspection Date: ${new Date().toLocaleDateString()}\n\nROOF MEASUREMENTS\n- Total area: 2,856 sq ft (28.56 squares)\n- Ridge length: 85 linear feet\n- Eave length: 171 linear feet\n- Rake length: 95 linear feet\n- Soffit depth: 18 inches\n- Wall thickness: 6 inches\n- Roof pitch: 6/12`,
        wordCount: 67,
        extractedAt: new Date(),
        extractionMethod: 'pdf-parse',
        confidence: 0.94,
        width: 612,
        height: 792,
        imageCount: 1
      }
    });

    await prisma.documentPage.create({
      data: {
        jobId,
        documentId, 
        pageNumber: 2,
        fullText: `DAMAGE ASSESSMENT\n\n• Hail damage observed on south and west-facing slopes\n• Granule loss consistent with hail impact\n• Some exposed mat areas require replacement\n• Gutters show impact damage\n\nRECOMMENDATIONS\n• Complete roof replacement recommended\n• Replace damaged gutters\n• Ensure proper ice & water barrier installation\n• Verify adequate ventilation\n\nInspector: [Name]\nLicense: [Number]`,
        wordCount: 58,
        extractedAt: new Date(),
        extractionMethod: 'pdf-parse',
        confidence: 0.91,
        width: 612,
        height: 792,
        imageCount: 0
      }
    });
  }
}

async function createMistralExtraction(jobId: string, scenario: string) {
  const ruleData = BUSINESS_RULE_SCENARIOS[scenario as keyof typeof BUSINESS_RULE_SCENARIOS];
  
  return await prisma.mistralExtraction.create({
    data: {
      jobId,
      mistralModel: 'mistral-large-latest',
      inputType: 'text-pdf',
      processingTime: 4500 + Math.floor(Math.random() * 2000), // 4.5-6.5 seconds
      tokenUsage: {
        input: 2800 + Math.floor(Math.random() * 500),
        output: 450 + Math.floor(Math.random() * 100)
      },
      cost: 0.018 + Math.random() * 0.008, // ~$0.018-0.026
      success: true,
      rawExtraction: {
        model: 'mistral-large-latest',
        extractionTimestamp: new Date().toISOString(),
        documentAnalysis: {
          totalPages: 3,
          textQuality: 'high',
          structureRecognition: 'good'
        },
        businessFields: {
          hipRidgeCap: ruleData.HIP_RIDGE_CAP,
          starterStrip: ruleData.STARTER_STRIP, 
          dripEdge: ruleData.DRIP_EDGE,
          gutterApron: ruleData.GUTTER_APRON,
          iceWaterBarrier: ruleData.ICE_WATER_BARRIER
        }
      },
      hipRidgeCap: ruleData.HIP_RIDGE_CAP,
      starterStrip: ruleData.STARTER_STRIP,
      dripEdge: ruleData.DRIP_EDGE,
      gutterApron: ruleData.GUTTER_APRON,
      iceWaterBarrier: ruleData.ICE_WATER_BARRIER,
      confidence: Object.values(ruleData).reduce((avg, rule) => avg + (rule.confidence || 0), 0) / 5,
      fieldsFound: Object.values(ruleData).filter(rule => rule.found).length,
      extractedAt: new Date()
    }
  });
}

async function createSonnetAnalysis(jobId: string, mistralExtractionId: string, scenario: string) {
  const ruleData = BUSINESS_RULE_SCENARIOS[scenario as keyof typeof BUSINESS_RULE_SCENARIOS];
  
  // Calculate quality scores based on scenario
  const qualityScores = {
    adequate: { accuracy: 0.92, completeness: 0.95, confidence: 0.89 },
    shortage: { accuracy: 0.88, completeness: 0.65, confidence: 0.91 },
    mixed: { accuracy: 0.85, completeness: 0.78, confidence: 0.82 }
  };
  
  const scores = qualityScores[scenario as keyof typeof qualityScores];
  
  return await prisma.sonnetAnalysis.create({
    data: {
      jobId,
      mistralExtractionId,
      sonnetModel: 'claude-sonnet-4-20250514',
      analysisType: AnalysisType.BUSINESS_RULES,
      processingTime: 3200 + Math.floor(Math.random() * 1500), // 3.2-4.7 seconds
      tokenUsage: {
        input: 1950 + Math.floor(Math.random() * 300),
        output: 680 + Math.floor(Math.random() * 150)
      },
      cost: 0.011 + Math.random() * 0.005, // ~$0.011-0.016
      success: true,
      overallAssessment: {
        documentQuality: scenario === 'adequate' ? 'high' : scenario === 'shortage' ? 'concerning' : 'mixed',
        extractionAccuracy: scores.accuracy,
        businessRuleCompliance: scenario === 'adequate' ? 'compliant' : 'non-compliant',
        supplementRequired: scenario !== 'adequate',
        keyFindings: scenario === 'adequate' 
          ? ['All required components properly specified', 'Quantities align with roof measurements', 'Materials meet code requirements']
          : scenario === 'shortage'
          ? ['Multiple critical components missing', 'Substandard materials specified', 'Code compliance issues identified']
          : ['Mixed compliance across components', 'Some items properly specified', 'Several components need attention']
      },
      businessRuleEvaluations: {
        hipRidgeCap: {
          status: ruleData.HIP_RIDGE_CAP.status,
          confidence: ruleData.HIP_RIDGE_CAP.confidence,
          findings: ruleData.HIP_RIDGE_CAP.reasoning,
          recommendation: ruleData.HIP_RIDGE_CAP.status === RuleStatus.FAILED 
            ? 'Replace with purpose-built ridge cap shingles meeting ASTM D3161 standards' 
            : null
        },
        starterStrip: {
          status: ruleData.STARTER_STRIP.status,
          confidence: ruleData.STARTER_STRIP.confidence,
          findings: ruleData.STARTER_STRIP.reasoning,
          recommendation: ruleData.STARTER_STRIP.status === RuleStatus.FAILED 
            ? 'Add universal starter course with factory adhesive strip'
            : null
        },
        dripEdge: {
          status: ruleData.DRIP_EDGE.status, 
          confidence: ruleData.DRIP_EDGE.confidence,
          findings: ruleData.DRIP_EDGE.reasoning,
          recommendation: ruleData.DRIP_EDGE.status === RuleStatus.FAILED 
            ? 'Add aluminum drip edge for rake protection'
            : ruleData.DRIP_EDGE.status === RuleStatus.WARNING
            ? 'Verify drip edge coverage matches roof dimensions'
            : null
        },
        gutterApron: {
          status: ruleData.GUTTER_APRON.status,
          confidence: ruleData.GUTTER_APRON.confidence,
          findings: ruleData.GUTTER_APRON.reasoning,
          recommendation: ruleData.GUTTER_APRON.status === RuleStatus.FAILED 
            ? 'Add aluminum gutter apron for eave protection'
            : ruleData.GUTTER_APRON.status === RuleStatus.WARNING
            ? 'Verify gutter apron coverage matches eave length'
            : null
        },
        iceWaterBarrier: {
          status: ruleData.ICE_WATER_BARRIER.status,
          confidence: ruleData.ICE_WATER_BARRIER.confidence,
          findings: ruleData.ICE_WATER_BARRIER.reasoning,
          recommendation: ruleData.ICE_WATER_BARRIER.status === RuleStatus.FAILED 
            ? 'Increase ice & water barrier coverage to minimum 3 feet per IRC R905.1.2'
            : null
        }
      },
      complianceFindings: {
        codeCompliance: scenario === 'adequate' ? 'compliant' : 'non-compliant',
        standardsCompliance: scenario === 'adequate' ? 'meets-standards' : 'below-standards',
        riskLevel: scenario === 'adequate' ? 'low' : scenario === 'shortage' ? 'high' : 'medium'
      },
      supplementRecommendations: scenario !== 'adequate' ? {
        supplementRequired: true,
        estimatedCost: scenario === 'shortage' ? 1850 + Math.floor(Math.random() * 500) : 750 + Math.floor(Math.random() * 300),
        priorityItems: Object.entries(ruleData)
          .filter(([_, rule]) => rule.status === RuleStatus.FAILED)
          .map(([key, rule]) => ({
            component: key.toLowerCase().replace('_', ' '),
            reason: rule.reasoning,
            urgency: 'high'
          }))
      } : null,
      accuracyScore: scores.accuracy,
      completenessScore: scores.completeness,
      confidenceScore: scores.confidence,
      analyzedAt: new Date()
    }
  });
}

async function createBusinessRuleAnalyses(jobId: string, scenario: string) {
  const ruleData = BUSINESS_RULE_SCENARIOS[scenario as keyof typeof BUSINESS_RULE_SCENARIOS];
  
  for (const [ruleKey, data] of Object.entries(ruleData)) {
    const ruleType = RuleType[ruleKey as keyof typeof RuleType];
    
    await prisma.ruleAnalysis.create({
      data: {
        jobId,
        ruleType,
        status: data.status,
        passed: data.status === RuleStatus.PASSED,
        confidence: data.confidence,
        findings: {
          found: data.found,
          quantity: data.quantity,
          description: data.description,
          sourcePageNumber: data.sourcePageNumber,
          evidence: `Found in document: "${data.description || 'Not specified'}"`,
          sourceLocation: data.sourcePageNumber ? `Page ${data.sourcePageNumber}` : 'Not found'
        },
        recommendation: data.status !== RuleStatus.PASSED 
          ? getRecommendationForRule(ruleType, data.status)
          : null,
        reasoning: data.reasoning,
        userDecision: UserDecision.PENDING,
        analyzedAt: new Date()
      }
    });
  }
}

function getRecommendationForRule(ruleType: RuleType, status: RuleStatus): string {
  const recommendations = {
    [RuleType.HIP_RIDGE_CAP]: 'Add purpose-built ridge cap shingles meeting ASTM D3161 standards. Replace cut 3-tab shingle ridge caps.',
    [RuleType.STARTER_STRIP]: 'Add universal starter course with factory adhesive strip along all eaves for proper wind resistance.',
    [RuleType.DRIP_EDGE]: status === RuleStatus.FAILED 
      ? 'Add aluminum drip edge along all rakes for water management and edge protection.'
      : 'Verify drip edge coverage matches roof rake measurements.',
    [RuleType.GUTTER_APRON]: status === RuleStatus.FAILED
      ? 'Add aluminum gutter apron along all eaves for water management and underlayment protection.'
      : 'Verify gutter apron coverage matches eave length measurements.',
    [RuleType.ICE_WATER_BARRIER]: 'Increase ice & water barrier coverage to minimum 3 feet up slope per IRC R905.1.2 requirements.'
  };
  
  return recommendations[ruleType] || 'Review and address component specification per building codes.';
}

async function main() {
  try {
    console.log('🌱 Starting prototype data seeding...\n');
    
    // Clear existing data
    console.log('🧹 Clearing existing prototype data...');
    await prisma.ruleAnalysis.deleteMany();
    await prisma.sonnetAnalysis.deleteMany();
    await prisma.mistralExtraction.deleteMany();
    await prisma.documentPage.deleteMany();
    await prisma.document.deleteMany();
    await prisma.job.deleteMany();
    
    console.log('✓ Existing data cleared\n');
    
    // Create sample jobs
    console.log('📄 Creating sample jobs and extractions...');
    const jobs = [];
    for (let i = 0; i < SAMPLE_DOCUMENTS.length; i++) {
      const job = await createSampleJob(SAMPLE_DOCUMENTS[i], i);
      jobs.push(job);
    }
    
    console.log('\n🎉 Prototype data seeding completed successfully!');
    console.log(`\nCreated:`);
    console.log(`- ${jobs.length} jobs with realistic processing data`);
    console.log(`- ${jobs.length * 2} documents (estimates + roof reports)`);
    console.log(`- ${jobs.length * 5} document pages with full text`);
    console.log(`- ${jobs.length} Mistral extractions with business rule data`);
    console.log(`- ${jobs.length} Sonnet analyses with quality assessments`);
    console.log(`- ${jobs.length * 5} business rule analyses for user testing`);
    
    console.log(`\n📊 Scenario Distribution:`);
    const scenarioCounts = SAMPLE_DOCUMENTS.reduce((acc, doc) => {
      acc[doc.scenario] = (acc[doc.scenario] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    for (const [scenario, count] of Object.entries(scenarioCounts)) {
      console.log(`- ${scenario}: ${count} jobs`);
    }
    
    console.log(`\n🚀 Ready for UI/UX testing!`);
    console.log(`Run your dev server and test:`)
    console.log(`- Job dashboard with realistic data`)
    console.log(`- Document viewer with full-text pages`)
    console.log(`- Business rule analysis workflows`)
    console.log(`- User decision interfaces`)
    console.log(`- Supplement recommendation flows`);
    
  } catch (error) {
    console.error('❌ Error seeding prototype data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main as seedPrototypeData };