import { prisma } from '../database/client';

async function listExistingJobs() {
  try {
    const jobs = await prisma.job.findMany({
      include: { 
        documents: true,
        mistralExtractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10
    });
    
    console.log('📋 Existing Jobs in Database:');
    console.log('============================');
    
    if (jobs.length === 0) {
      console.log('No jobs found in database');
      return;
    }
    
    jobs.forEach((job, i) => {
      console.log(`\n${i + 1}. Job ID: ${job.id}`);
      console.log(`   Customer: ${job.customerName || 'Unknown'}`);
      console.log(`   File: ${job.fileName}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Documents: ${job.documents.length}`);
      console.log(`   Extractions: ${job.mistralExtractions.length}`);
      console.log(`   Uploaded: ${job.uploadedAt.toISOString().split('T')[0]}`);
      
      if (job.documents.length > 0) {
        job.documents.forEach(doc => {
          console.log(`     - ${doc.fileName} (${doc.status})`);
        });
      }
    });
    
    console.log('\n✅ Use any of these job IDs for testing');
    
  } catch (error) {
    console.error('Error listing jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listExistingJobs();