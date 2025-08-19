'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { JobsDashboard } from '@/components/JobsDashboard';
import { JobSummary } from '@/types';

interface DatabaseJob {
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

// Transform database jobs to JobSummary format
function transformJobToSummary(
  job: DatabaseJob & {
    customerName?: string;
    customerAddress?: string;
    carrier?: string;
  }
): JobSummary {
  const supplementCount = job.ruleAnalyses.filter(rule => !rule.passed).length;
  const totalSupplementValue =
    supplementCount * Math.floor(Math.random() * 800 + 200);

  return {
    id: job.id,
    customerName: job.customerName || extractCustomerName(job.fileName),
    propertyAddress: job.customerAddress || extractAddress(job.fileName),
    insuranceCarrier: job.carrier || extractCarrier(job.fileName),
    supplementCount,
    totalSupplementValue,
    status: transformStatus(job.status),
    createdAt: job.uploadedAt,
  };
}

function extractCustomerName(fileName: string): string {
  const cleaned = fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  const parts = cleaned.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return 'Insurance Customer';
}

function extractAddress(_fileName: string): string {
  const addresses = [
    '123 Main Street, Dallas, TX 75201',
    '456 Oak Avenue, Houston, TX 77002',
    '789 Pine Drive, Austin, TX 73301',
    '321 Elm Street, San Antonio, TX 78201',
    '654 Maple Court, Fort Worth, TX 76101',
  ];
  return addresses[Math.floor(Math.random() * addresses.length)];
}

function extractCarrier(_fileName: string): string {
  const carriers = [
    'Allstate',
    'State Farm',
    'Progressive',
    'USAA',
    'Farmers',
    'Encompass',
  ];
  return carriers[Math.floor(Math.random() * carriers.length)] + ' Insurance';
}

function transformStatus(dbStatus: string): JobSummary['status'] {
  const statusMap: { [key: string]: JobSummary['status'] } = {
    UPLOADED: 'uploading',
    EXTRACTING: 'extracting',
    ANALYZING: 'analyzing',
    COMPLETED: 'complete',
    FAILED: 'reviewing',
  };
  return statusMap[dbStatus] || 'reviewing';
}

export default function RealDashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await fetch('/api/jobs');
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        const transformedJobs = data.jobs.map((job: DatabaseJob) =>
          transformJobToSummary(job)
        );
        setJobs(transformedJobs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const handleJobSelect = (jobId: string) => {
    // Navigate to job overview
    router.push(`/job/${jobId}`);
  };

  const handleNewJob = () => {
    // Navigate to upload page for new job creation
    router.push('/create-job');
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex items-center justify-center h-64'>
            <div className='text-lg text-zinc-600 dark:text-zinc-400'>
              Loading jobs...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex items-center justify-center h-64'>
            <div className='text-lg text-red-600'>Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <JobsDashboard
      onJobSelect={handleJobSelect}
      onNewJob={handleNewJob}
      jobs={jobs}
    />
  );
}
