'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OverviewPage } from '@/components/OverviewPage';
import { JobData, RoofMeasurements, RuleAnalysisResult } from '@/lib/mockData';

interface Job {
  id: string;
  status: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  error: string | null;
  documents: Array<{
    id: string;
    fileName: string;
    pageCount: number;
    status: string;
  }>;
  mistralExtractions: Array<{
    id: string;
    fieldsFound: number;
    confidence: number;
  }>;
  sonnetAnalyses: Array<{
    id: string;
    overallAssessment: unknown;
    accuracyScore: number;
    completenessScore: number;
  }>;
  ruleAnalyses: Array<{
    ruleType: string;
    status: string;
    passed: boolean;
  }>;
}

// Transform database job to UI-compatible format
function transformJobData(job: Job): JobData {
  return {
    id: job.id,
    customerName: extractCustomerName(job.fileName),
    propertyAddress: extractAddress(job.fileName),
    insuranceCarrier: extractCarrier(job.fileName),
    claimNumber: generateClaimNumber(job.id),
    dateOfLoss: generateDateOfLoss(job.uploadedAt),
    adjusterId: generateAdjusterId(),
    adjusterName: generateAdjusterName(),
    policyNumber: generatePolicyNumber(job.id),
    totalEstimateValue: generateEstimateValue(),
    status: transformStatus(job.status),
    createdAt: job.uploadedAt,
    updatedAt: job.processedAt || job.uploadedAt
  };
}

// Helper functions to extract/generate data from database job
function extractCustomerName(fileName: string): string {
  // Try to extract customer name from filename
  const cleaned = fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  const parts = cleaned.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return 'Insurance Customer';
}

function extractAddress(fileName: string): string {
  // Generate a realistic address - in real app this would come from extracted data
  const addresses = [
    '123 Main Street, Dallas, TX 75201',
    '456 Oak Avenue, Houston, TX 77002',
    '789 Pine Drive, Austin, TX 73301',
    '321 Elm Street, San Antonio, TX 78201'
  ];
  return addresses[Math.floor(Math.random() * addresses.length)];
}

function extractCarrier(fileName: string): string {
  // Extract carrier from filename or generate
  const carriers = ['Allstate', 'State Farm', 'Progressive', 'USAA', 'Farmers'];
  return carriers[Math.floor(Math.random() * carriers.length)] + ' Insurance';
}

function generateClaimNumber(jobId: string): string {
  return jobId.slice(-10).toUpperCase().replace(/[^A-Z0-9]/g, '0');
}

function generateDateOfLoss(uploadedAt: string): string {
  // Generate date 30-60 days before upload
  const upload = new Date(uploadedAt);
  const daysBack = 30 + Math.floor(Math.random() * 30);
  const lossDate = new Date(upload.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  return lossDate.toISOString().split('T')[0];
}

function generateAdjusterId(): string {
  return 'ADJ-' + Math.floor(Math.random() * 9000 + 1000);
}

function generateAdjusterName(): string {
  const names = ['Sarah Thompson', 'Mike Rodriguez', 'Jennifer Chen', 'David Wilson'];
  return names[Math.floor(Math.random() * names.length)];
}

function generatePolicyNumber(jobId: string): string {
  return 'POL-' + jobId.slice(-9).toUpperCase().replace(/[^A-Z0-9]/g, '0');
}

function generateEstimateValue(): number {
  return Math.floor(Math.random() * 30000 + 15000);
}

function transformStatus(dbStatus: string): JobData['status'] {
  const statusMap: { [key: string]: JobData['status'] } = {
    'UPLOADED': 'uploading',
    'EXTRACTING': 'extracting', 
    'ANALYZING': 'analyzing',
    'COMPLETED': 'complete',
    'FAILED': 'reviewing'
  };
  return statusMap[dbStatus] || 'reviewing';
}

// Generate mock roof measurements - in real app this would be extracted data
function generateRoofMeasurements(): RoofMeasurements {
  return {
    totalArea: Math.floor(Math.random() * 2000 + 1500),
    totalSquares: Math.floor(Math.random() * 20 + 15),
    pitch: ['4/12', '5/12', '6/12', '7/12', '8/12'][Math.floor(Math.random() * 5)],
    stories: Math.floor(Math.random() * 2 + 1),
    eavesLength: Math.floor(Math.random() * 100 + 150),
    rakesLength: Math.floor(Math.random() * 50 + 100),
    ridgesLength: Math.floor(Math.random() * 40 + 20),
    valleysLength: Math.floor(Math.random() * 30 + 10),
    roofArea: Math.floor(Math.random() * 2000 + 1500),
    ridgeLength: Math.floor(Math.random() * 40 + 20),
    hipsLength: Math.floor(Math.random() * 100 + 50),
    totalRidgeHip: Math.floor(Math.random() * 120 + 80),
    soffitDepth: '24"',
    wallThickness: '6"',
    totalRoofArea: Math.floor(Math.random() * 2000 + 1500),
    numberOfSquares: Math.floor(Math.random() * 20 + 15),
    predominantPitch: '6/12',
    numberOfStories: Math.floor(Math.random() * 2 + 1),
    totalEaves: Math.floor(Math.random() * 100 + 150),
    totalRakes: Math.floor(Math.random() * 50 + 100),
    totalRidges: Math.floor(Math.random() * 40 + 20),
    totalValleys: Math.floor(Math.random() * 30 + 10)
  };
}

// Generate mock rule analysis - in real app this would be from database
function generateRuleAnalysis(): RuleAnalysisResult[] {
  const rules = ['ridge_cap', 'starter_strip', 'drip_edge', 'ice_water_barrier'];
  const statuses: RuleAnalysisResult['status'][] = ['COMPLIANT', 'SUPPLEMENT_NEEDED', 'INSUFFICIENT_DATA'];
  
  return rules.map(rule => ({
    ruleName: rule,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    confidence: Math.random() * 0.3 + 0.7, // 70-100%
    reasoning: generateRuleReasoning(rule),
    costImpact: Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 800 + 200)
  }));
}

function generateRuleReasoning(rule: string): string {
  const reasonings = {
    ridge_cap: 'Analysis of ridge cap specifications shows standard profile materials meeting ASTM requirements.',
    starter_strip: 'Universal starter strip coverage verified along all eave edges with proper adhesive backing.',
    drip_edge: 'Edge flashing coverage meets IRC requirements for both rake and eave protection.',
    ice_water_barrier: 'Ice and water barrier coverage calculated based on climate zone and roof pitch requirements.'
  };
  return reasonings[rule as keyof typeof reasonings] || 'Business rule analysis completed.';
}

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return;
      
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job');
        }
        const data = await response.json();
        setJob(data.job);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch job');
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  const handleFieldUpdate = (field: string, value: string | number) => {
    console.log(`Updating field ${field} to ${value}`);
    // In real app, this would update the database
  };

  const handleStartReview = () => {
    console.log('Starting business rule review...');
    // In real app, this would navigate to detailed analysis
    router.push(`/analysis/${jobId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-lg text-zinc-600">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error || 'Job not found'}</div>
      </div>
    );
  }

  const jobData = transformJobData(job);
  const roofMeasurements = generateRoofMeasurements();
  const ruleAnalysis = generateRuleAnalysis();

  return (
    <OverviewPage
      jobData={jobData}
      roofMeasurements={roofMeasurements}
      ruleAnalysis={ruleAnalysis}
      onFieldUpdate={handleFieldUpdate}
      onStartReview={handleStartReview}
    />
  );
}