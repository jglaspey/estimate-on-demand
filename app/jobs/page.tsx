'use client';

import { useState, useEffect } from 'react';

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
    overallAssessment: any;
    accuracyScore: number;
    completenessScore: number;
  }>;
  ruleAnalyses: Array<{
    ruleType: string;
    status: string;
    passed: boolean;
  }>;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
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
        setJobs(data.jobs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'EXTRACTING': return 'bg-blue-100 text-blue-800';
      case 'ANALYZING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-lg">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-medium text-foreground">All Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track your insurance supplement analysis jobs
            </p>
          </div>
          <a 
            href="/upload" 
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            New Job
          </a>
        </header>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex flex-wrap gap-4">
            <select className="px-3 py-2 bg-input-background border border-border rounded-lg text-foreground">
              <option>All Statuses</option>
              <option>Completed</option>
              <option>In Progress</option>
              <option>Analysis</option>
              <option>Review</option>
            </select>
            <select className="px-3 py-2 bg-input-background border border-border rounded-lg text-foreground">
              <option>All Carriers</option>
              <option>State Farm</option>
              <option>Allstate</option>
              <option>Progressive</option>
              <option>USAA</option>
            </select>
            <input 
              type="text"
              placeholder="Search jobs..."
              className="px-3 py-2 bg-input-background border border-border rounded-lg text-foreground flex-1 min-w-64"
            />
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    File Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Fields Found
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-accent/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-card-foreground">{job.fileName}</div>
                      {job.error && (
                        <div className="text-xs text-red-500 mt-1 truncate max-w-48" title={job.error}>
                          {job.error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">{formatFileSize(job.fileSize)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-card-foreground">
                        {job.documents.length} doc{job.documents.length !== 1 ? 's' : ''}
                        {job.documents.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {job.documents.reduce((sum, doc) => sum + doc.pageCount, 0)} pages
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-card-foreground">
                        {job.mistralExtractions.length > 0 ? `${job.mistralExtractions[0].fieldsFound}/5` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-card-foreground">
                        {job.mistralExtractions.length > 0 
                          ? `${Math.round(job.mistralExtractions[0].confidence * 100)}%` 
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">{formatDate(job.uploadedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href={`/analysis/${job.id}`} className="text-primary hover:text-primary/90 mr-4">
                        View
                      </a>
                      <a href={`/reports/${job.id}`} className="text-primary hover:text-primary/90">
                        Report
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing 1 to {jobs.length} of {jobs.length} results
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              Previous
            </button>
            <button className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
              1
            </button>
            <button className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              2
            </button>
            <button className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              3
            </button>
            <button className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}