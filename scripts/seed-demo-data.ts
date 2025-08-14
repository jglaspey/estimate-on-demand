import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('🌱 Seeding demo data...');
  
  try {
    // Create Job 1 - Completed Estimate
    const job1 = await prisma.job.create({
      data: {
        fileName: 'smith-estimate-2024.pdf',
        fileSize: 884000,
        filePath: '/uploads/demo-smith-estimate.pdf',
        status: 'TEXT_EXTRACTED',
        
        // Auto-populated customer info
        customerName: 'John Smith',
        customerAddress: '123 Main Street, Dallas, TX 75201',
        customerPhone: '(555) 888-1234',
        customerEmail: 'john.smith@email.com',
        
        // Auto-populated claim info
        claimNumber: '0760901231',
        policyNumber: 'POL-123456789',
        dateOfLoss: new Date('2024-01-14'),
        carrier: 'Allstate Insurance',
        claimRep: 'Sarah Thompson',
        estimator: 'Mike Rodriguez',
        originalEstimate: 18750.0,
        
        // Auto-populated roofing data
        roofSquares: 88.5,
        roofStories: 2,
        rakeLength: 88.0,
        eaveLength: 88.0,
        ridgeHipLength: 88.0,
        valleyLength: 88.0,
        roofSlope: '6/12',
        roofMaterial: 'Composition Shingles',
        
        uploadedAt: new Date('2024-01-15T10:30:00Z'),
        processedAt: new Date('2024-01-15T10:32:00Z'),
        updatedAt: new Date('2024-01-15T10:32:00Z')
      }
    });
    
    // Create Document for Job 1
    const doc1 = await prisma.document.create({
      data: {
        jobId: job1.id,
        fileName: 'smith-estimate-2024.pdf',
        filePath: '/uploads/demo-smith-estimate.pdf',
        fileSize: 884000,
        mimeType: 'application/pdf',
        status: 'COMPLETED',
        pageCount: 6,
        processedAt: new Date('2024-01-15T10:32:00Z')
      }
    });
    
    // Create Document Pages for Job 1
    const pages1Data = [
      { pageNumber: 1, content: 'INSURANCE ESTIMATE\n\nCustomer: John Smith\nAddress: 123 Main Street, Dallas, TX 75201\nClaim #: 0760901231\nPolicy #: POL-123456789\n\nRoof Estimate Summary\nSquares: 88.5\nStories: 2\nSlope: 6/12' },
      { pageNumber: 2, content: 'LINE ITEMS\n\n1. Hip/Ridge cap - Standard profile composition shingles - 88 LF @ $8.50 = $748.00\n2. Starter strip - Universal starter strip - 88 LF @ $2.25 = $198.00\n3. Gutter apron - Aluminum - 88 LF @ $3.50 = $308.00' },
      { pageNumber: 3, content: 'MATERIAL SPECIFICATIONS\n\nComposition Shingles: Architectural grade\nUnderlayment: Synthetic\nFlashing: Aluminum\nVentilation: Ridge vents' },
      { pageNumber: 4, content: 'LABOR BREAKDOWN\n\nTear-off: $2,400\nInstallation: $8,900\nCleanup: $450\nTotal Labor: $11,750' },
      { pageNumber: 5, content: 'PERMITS AND INSPECTIONS\n\nBuilding Permit: $150\nInspection Fees: $100\nTotal Permits: $250' },
      { pageNumber: 6, content: 'TOTAL ESTIMATE\n\nMaterials: $6,750\nLabor: $11,750\nPermits: $250\nTotal: $18,750' }
    ];
    
    for (const pageData of pages1Data) {
      await prisma.documentPage.create({
        data: {
          documentId: doc1.id,
          jobId: job1.id,
          pageNumber: pageData.pageNumber,
          markdownText: pageData.content,
          wordCount: pageData.content.split(' ').length,
          extractedAt: new Date('2024-01-15T10:31:30Z'),
          confidence: 0.95,
          extractionMethod: 'mistral-ocr'
        }
      });
    }
    
    // Create Mistral Extraction for Job 1
    await prisma.mistralExtraction.create({
      data: {
        jobId: job1.id,
        documentType: 'estimate',
        extractedData: {
          classification: {
            type: 'estimate',
            confidence: 0.95,
            reasoning: 'Found estimate-related keywords and pricing structure'
          },
          customerInfo: {
            name: 'John Smith',
            address: {
              street: '123 Main Street',
              city: 'Dallas',
              state: 'TX',
              zipCode: '75201'
            },
            phone: '(555) 888-1234',
            email: 'john.smith@email.com'
          },
          claimInfo: {
            claimNumber: '0760901231',
            policyNumber: 'POL-123456789',
            dateOfLoss: '2024-01-14',
            carrier: 'Allstate Insurance',
            claimRep: 'Sarah Thompson',
            estimator: 'Mike Rodriguez',
            originalEstimate: 18750
          },
          roofingData: {
            squares: 88.5,
            stories: 2,
            rake: 88,
            eave: 88,
            ridgeHip: 88,
            valley: 88,
            slope: '6/12',
            material: 'Composition Shingles'
          },
          lineItems: [
            { description: 'Hip/Ridge cap - Standard profile', quantity: 88, unit: 'LF', unitPrice: 8.50, totalPrice: 748, category: 'material' },
            { description: 'Starter strip - Universal', quantity: 88, unit: 'LF', unitPrice: 2.25, totalPrice: 198, category: 'material' },
            { description: 'Gutter apron - Aluminum', quantity: 88, unit: 'LF', unitPrice: 3.50, totalPrice: 308, category: 'material' }
          ]
        },
        customerName: 'John Smith',
        claimNumber: '0760901231',
        pageCount: 6,
        confidence: 0.95,
        extractedAt: new Date('2024-01-15T10:31:45Z')
      }
    });
    
    // Create Rule Analyses for Job 1
    const ruleTypes = ['HIP_RIDGE_CAP', 'STARTER_STRIP', 'GUTTER_APRON', 'DRIP_EDGE', 'ICE_WATER_BARRIER'];
    const ruleStatuses = ['PASSED', 'FAILED', 'PASSED', 'FAILED', 'WARNING'];
    const ruleRecommendations = [
      'Standard profile ridge caps found - compliant',
      'Universal starter strip missing - needs supplement',
      'Aluminum gutter apron found - compliant', 
      'Drip edge not specified - needs supplement',
      'Ice & water barrier coverage needs verification'
    ];
    
    for (let i = 0; i < ruleTypes.length; i++) {
      await prisma.ruleAnalysis.create({
        data: {
          jobId: job1.id,
          ruleType: ruleTypes[i] as any,
          status: ruleStatuses[i] as any,
          passed: ruleStatuses[i] === 'PASSED',
          confidence: 0.88,
          findings: {
            evidence: `Found relevant line items for ${ruleTypes[i]}`,
            sourcePages: [2, 3],
            confidence: 0.88
          },
          recommendation: ruleRecommendations[i],
          reasoning: `Analysis based on line item descriptions and quantities`,
          userDecision: 'PENDING',
          analyzedAt: new Date('2024-01-15T10:32:00Z')
        }
      });
    }
    
    // Create Job 2 - Processing in Progress
    const job2 = await prisma.job.create({
      data: {
        fileName: 'stevens-estimate.pdf',
        fileSize: 756000,
        filePath: '/uploads/demo-stevens-estimate.pdf',
        status: 'PROCESSING',
        
        // Partial auto-populated data (as if extraction is in progress)
        customerName: 'testees',
        customerAddress: 'testees',
        customerPhone: 'testees',
        
        uploadedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Create Document for Job 2 (processing)
    await prisma.document.create({
      data: {
        jobId: job2.id,
        fileName: 'stevens-estimate.pdf',
        filePath: '/uploads/demo-stevens-estimate.pdf',
        fileSize: 756000,
        mimeType: 'application/pdf',
        status: 'PROCESSING'
      }
    });
    
    console.log('✅ Demo data seeded successfully!');
    console.log(`Created jobs:`);
    console.log(`- Job 1 (${job1.id}): Complete estimate with business rule analysis`);
    console.log(`- Job 2 (${job2.id}): Processing in progress`);
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDemoData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });