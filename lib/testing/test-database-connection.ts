/**
 * Database Connection Test
 * 
 * Tests Prisma connection and basic CRUD operations
 * to ensure database setup is working correctly
 */

import path from 'path';

import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '.env') });

import JobService from '../database/job-service';
import { createHaikuEngine } from '../extraction/haiku-extraction-engine';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const isConnected = await JobService.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    // Test job creation
    console.log('\n📝 Testing job creation...');
    const testJob = await JobService.createJob({
      fileName: 'test-document.pdf',
      fileSize: 1024,
      filePath: '/tmp/test.pdf',
      userId: 'test-user',
    });
    console.log('✅ Job created:', testJob.id);

    // Test job retrieval
    console.log('\n🔍 Testing job retrieval...');
    const retrievedJob = await JobService.getJobWithDetails(testJob.id);
    if (!retrievedJob) {
      throw new Error('Failed to retrieve job');
    }
    console.log('✅ Job retrieved:', retrievedJob.fileName);

    // Test status update
    console.log('\n🔄 Testing status update...');
    await JobService.updateJobStatus(testJob.id, 'EXTRACTING');
    const updatedJob = await JobService.getJobWithDetails(testJob.id);
    if (updatedJob?.status !== 'EXTRACTING') {
      throw new Error('Status update failed');
    }
    console.log('✅ Status updated to:', updatedJob.status);

    // Test extraction save (mock data)
    console.log('\n💾 Testing extraction save...');
    const mockExtractionResult = {
      hipRidgeCap: { found: true, quantity: 200, description: 'Hip ridge cap - test', quality: 'purpose-built' as const },
      starterStrip: { found: true, quantity: 150, description: 'Starter strip - test', type: 'universal' as const },
      dripEdge: { found: true, quantity: 100, description: 'Drip edge - test', location: 'rakes' as const },
      gutterApron: { found: true, quantity: 50, description: 'Gutter apron - test', location: 'eaves' as const },
      iceWaterBarrier: { found: true, coverage: 25, description: 'Ice & water barrier - test', calculation: 'Test calc' },
    };

    const mockMetrics = {
      processingTime: 5000,
      tokenUsage: { input: 1000, output: 200 },
      cost: 0.0012,
      success: true,
    };

    const extraction = await JobService.saveExtraction(testJob.id, mockExtractionResult, mockMetrics);
    console.log('✅ Extraction saved:', extraction.id);
    console.log('   - Completion score:', extraction.completionScore + '%');
    console.log('   - Has gutter apron:', extraction.hasGutterApron);
    console.log('   - Has location data:', extraction.hasLocationData);

    // Test rule analysis creation
    console.log('\n📋 Testing rule analysis creation...');
    const ruleAnalyses = await JobService.createRuleAnalyses(testJob.id);
    console.log('✅ Rule analyses created:', ruleAnalyses.length);

    // Test job statistics
    console.log('\n📊 Testing job statistics...');
    const stats = await JobService.getJobStats();
    console.log('✅ Job stats retrieved:');
    console.log('   - Total jobs:', stats.total);
    console.log('   - Completed:', stats.completed);
    console.log('   - Failed:', stats.failed);
    console.log('   - In progress:', stats.inProgress);
    console.log('   - Total cost: $' + stats.totalCost.toFixed(4));

    // Test job completion
    console.log('\n✅ Testing job completion...');
    await JobService.updateJobStatus(testJob.id, 'COMPLETED');
    const completedJob = await JobService.getJobWithDetails(testJob.id);
    if (completedJob?.status !== 'COMPLETED' || !completedJob.completedAt) {
      throw new Error('Job completion failed');
    }
    console.log('✅ Job completed at:', completedJob.completedAt);

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await JobService.deleteJob(testJob.id);
    console.log('✅ Test job deleted');

    console.log('\n🎉 All database tests passed! Database setup is working correctly.');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}