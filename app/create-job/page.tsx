'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJobProgress } from '@/lib/hooks/useJobProgress';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle,
  Building,
  Calendar,
  MapPin,
  Shield,
  Play,
  RefreshCw,
  Share,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ProgressiveField, ProgressiveHeader } from '@/components/ProgressiveField';

interface UploadState {
  isDragOver: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export default function CreateNewJob() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isUploading: false,
    uploadProgress: 0,
    error: null
  });
  
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { progressState, simulateUploadProgress, completeUpload } = useJobProgress(currentJobId || undefined);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
    
    const files = Array.from(e.dataTransfer.files);
    await handleFileUpload(files);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFileUpload(files);
    }
  }, []);

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter(file => file.type === 'application/pdf');
    if (validFiles.length === 0) {
      setUploadState(prev => ({ ...prev, error: 'Please upload PDF files only.' }));
      return;
    }

    // Validate file size (10MB limit)
    const oversizedFiles = validFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setUploadState(prev => ({ ...prev, error: 'Files must be under 10MB.' }));
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, error: null, uploadProgress: 0 }));

    try {
      // Simulate upload progress
      const uploadPromise = new Promise<void>((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          simulateUploadProgress(progress);
          if (progress >= 90) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });

      // Create FormData
      const formData = new FormData();
      validFiles.forEach(file => formData.append('files', file));

      // Wait for simulated progress to reach 90%
      await uploadPromise;

      // Actually upload the files
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      simulateUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Set the job ID to start progress tracking
      setCurrentJobId(result.jobId);
      completeUpload(result.jobId);
      
      // Don't redirect immediately - stay on page to show progress
      // Will redirect when processing is complete
      
    } catch (error) {
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.' 
      }));
    }
  };

  // Redirect when processing is complete
  useEffect(() => {
    if (progressState.status === 'completed' && currentJobId) {
      setTimeout(() => {
        router.push(`/analysis/${currentJobId}`);
      }, 2000); // Wait 2 seconds to show completion state
    }
  }, [progressState.status, currentJobId, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header - Exactly like job detail page */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-zinc-200 dark:bg-zinc-950/95 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/jobs')}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Jobs
              </button>
              
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
              
              <div className="min-w-0">
                <Skeleton className="h-7 w-48 mb-1" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                <Skeleton className="h-4 w-16" />
              </Badge>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                  className="h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 opacity-30" />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                  className="h-8 px-3 text-xs font-medium border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <Share className="h-3.5 w-3.5 mr-1.5 opacity-30" />
                  Share
                </Button>
                <Button 
                  size="sm"
                  disabled
                  className="h-8 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 opacity-50"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Exactly matching OverviewPage layout */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-32 bg-zinc-50 dark:bg-zinc-950">
        {/* Header Section with Progressive Fields */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <ProgressiveHeader 
              customerName={progressState.priorityFields.customer_name}
              propertyAddress={progressState.priorityFields.property_address}
            />
            
            <Button 
              disabled
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 opacity-50"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Review
            </Button>
          </div>

          {/* Three Information Cards - Exact match from OverviewPage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Insurance Details */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400 opacity-50" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Insurance Details</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Carrier:</span>
                  <ProgressiveField field={progressState.priorityFields.carrier} skeletonWidth="w-24" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Claim Rep:</span>
                  <ProgressiveField field={progressState.priorityFields.claim_rep} skeletonWidth="w-28" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Estimator:</span>
                  <ProgressiveField field={progressState.priorityFields.estimator} skeletonWidth="w-26" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Claim #:</span>
                  <ProgressiveField field={progressState.priorityFields.claim_number} skeletonWidth="w-20" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Policy #:</span>
                  <ProgressiveField field={progressState.priorityFields.policy_number} skeletonWidth="w-24" />
                </div>
              </div>
            </div>

            {/* Claim Information */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 opacity-50" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Claim Information</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Date of Loss:</span>
                  <ProgressiveField field={progressState.priorityFields.date_of_loss} skeletonWidth="w-20" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Original Estimate:</span>
                  <ProgressiveField 
                    field={progressState.priorityFields.original_estimate ? {
                      value: `$${progressState.priorityFields.original_estimate.value?.toLocaleString()}`,
                      confidence: progressState.priorityFields.original_estimate.confidence
                    } : undefined} 
                    skeletonWidth="w-16" 
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Potential Supplement:</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-500 dark:text-zinc-400">Total Value:</span>
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>

            {/* Analysis Status */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 opacity-50" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Analysis Status</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Issues Found:</span>
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Compliant Rules:</span>
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Exactly matching OverviewPage grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Replace Business Rules with Drop Zone */}
          <div className="lg:col-span-2 space-y-8">
            {/* Drop Zone replacing Business Rules Analysis */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      Business Rules Analysis
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Upload documents to begin supplement analysis
                    </p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`
                  m-6 relative rounded-xl border-2 border-dashed transition-all duration-200 ease-in-out
                  ${uploadState.isDragOver 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50'
                  }
                  ${uploadState.isUploading ? 'pointer-events-none' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/10'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploadState.isUploading && document.getElementById('file-input')?.click()}
              >
                <div className="p-16 text-center">
                  {uploadState.isUploading ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Uploading Documents...
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Processing your files for analysis
                      </p>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 max-w-md mx-auto">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadState.uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                          <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                          Drop your estimate and roof report here to start a new job
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-lg">
                          Upload PDF files containing insurance estimates and roof measurements
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 px-8 py-3">
                          <FileText className="mr-2 h-5 w-5" />
                          Choose Files
                        </Button>
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Supports PDF files up to 10MB each
                      </div>
                    </div>
                  )}

                  {uploadState.error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{uploadState.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Roof Measurements Summary - Skeleton State */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  📐 Roof Measurements
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
                  {/* Top Row */}
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Area</div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Squares</div>
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Pitch</div>
                    <Skeleton className="h-5 w-10" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Stories</div>
                    <Skeleton className="h-5 w-8" />
                  </div>
                  
                  {/* Bottom Row */}
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Eaves</div>
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Rakes</div>
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Ridges</div>
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Valleys</div>
                    <Skeleton className="h-5 w-14" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Chat Area with Skeleton - Exact match */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden file input */}
      <input
        id="file-input"
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}