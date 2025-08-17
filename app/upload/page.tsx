'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { DropZone } from '@/components/upload/DropZone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface JobDetails {
  propertyAddress: string;
  jobReference: string;
  insuranceCarrier: string;
  dateOfLoss: string;
}

export default function Upload() {
  const router = useRouter();
  const [files, setFiles] = useState<{
    estimate: File | null;
    roofReport: File | null;
    supplement: File | null;
  }>({
    estimate: null,
    roofReport: null,
    supplement: null,
  });

  const [jobDetails, setJobDetails] = useState<JobDetails>({
    propertyAddress: '',
    jobReference: '',
    insuranceCarrier: '',
    dateOfLoss: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect =
    (type: 'estimate' | 'roofReport' | 'supplement') => (file: File) => {
      setFiles(prev => ({ ...prev, [type]: file }));
      setUploadError(null);
    };

  const handleJobDetailChange =
    (field: keyof JobDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setJobDetails(prev => ({ ...prev, [field]: e.target.value }));
    };

  const handleStartAnalysis = async () => {
    if (!files.estimate && !files.roofReport) {
      setUploadError(
        'Please upload at least one document (estimate or roof report)'
      );
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // For now, just upload the first file (estimate or roof report)
      const fileToUpload = files.estimate || files.roofReport;
      if (!fileToUpload) return;

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('jobDetails', JSON.stringify(jobDetails));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Redirect to the job detail page (overview)
      router.push(`/job-detail/${result.jobId}`);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const canStartAnalysis = (files.estimate || files.roofReport) && !isUploading;

  return (
    <div className='min-h-screen bg-zinc-50 p-8 dark:bg-zinc-900'>
      <div className='mx-auto max-w-4xl space-y-8'>
        <header className='text-center'>
          <h1 className='text-3xl font-semibold text-zinc-950 dark:text-white'>
            Upload Documents
          </h1>
          <p className='mt-2 text-zinc-600 dark:text-zinc-400'>
            Upload estimate, roof report, and existing supplement documents for
            analysis
          </p>
        </header>

        {/* Upload Areas */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          <DropZone
            title='Estimate Document'
            description='Original insurance estimate document'
            icon='document'
            onFileSelect={handleFileSelect('estimate')}
            file={files.estimate}
            disabled={isUploading}
          />

          <DropZone
            title='Roof Report'
            description='Detailed roof measurements and specifications'
            icon='house'
            onFileSelect={handleFileSelect('roofReport')}
            file={files.roofReport}
            disabled={isUploading}
          />

          <DropZone
            title='Existing Supplement'
            description='Previous supplement for comparison (optional)'
            icon='clipboard'
            onFileSelect={handleFileSelect('supplement')}
            file={files.supplement}
            disabled={isUploading}
          />
        </div>

        {/* Job Details */}
        <div className='rounded-lg border border-zinc-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900'>
          <h3 className='text-lg font-semibold text-zinc-950 dark:text-white'>
            Job Details
          </h3>
          <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <label className='block text-sm font-medium text-zinc-950 dark:text-white mb-2'>
                Property Address
              </label>
              <Input
                type='text'
                placeholder='123 Main St, City, State 12345'
                value={jobDetails.propertyAddress}
                onChange={handleJobDetailChange('propertyAddress')}
                disabled={isUploading}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-zinc-950 dark:text-white mb-2'>
                Job Reference
              </label>
              <Input
                type='text'
                placeholder='JOB-001'
                value={jobDetails.jobReference}
                onChange={handleJobDetailChange('jobReference')}
                disabled={isUploading}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-zinc-950 dark:text-white mb-2'>
                Insurance Carrier
              </label>
              <Input
                type='text'
                placeholder='State Farm, Allstate, etc.'
                value={jobDetails.insuranceCarrier}
                onChange={handleJobDetailChange('insuranceCarrier')}
                disabled={isUploading}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-zinc-950 dark:text-white mb-2'>
                Date of Loss
              </label>
              <Input
                type='date'
                value={jobDetails.dateOfLoss}
                onChange={handleJobDetailChange('dateOfLoss')}
                disabled={isUploading}
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {uploadError && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/10'>
            <p className='text-sm text-red-700 dark:text-red-400'>
              {uploadError}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex justify-center gap-4'>
          <Button
            color='blue'
            onClick={handleStartAnalysis}
            disabled={!canStartAnalysis}
          >
            {isUploading ? 'Uploading...' : 'Start Analysis'}
          </Button>
          <Button variant="outline" disabled={isUploading}>
            Save as Draft
          </Button>
        </div>
      </div>
    </div>
  );
}
