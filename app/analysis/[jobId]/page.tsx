import { JobProgressTracker } from '@/components/JobProgressTracker';

type Props = {
  params: Promise<{ jobId: string }>
}

async function fetchJobData(jobId: string) {
  try {
    const response = await fetch(`http://localhost:3000/api/jobs/${jobId}`, {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.status}`)
    }
    
    const data = await response.json()
    return data.job
  } catch (error) {
    console.error('Error fetching job data:', error)
    return null
  }
}

export default async function Analysis({ params }: Props) {
  const { jobId } = await params
  const job = await fetchJobData(jobId)

  if (!job) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-medium text-foreground">Job Not Found</h1>
            <p className="text-muted-foreground mt-2">
              Could not load analysis for job {jobId}
            </p>
            <a 
              href="/upload" 
              className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Upload New Document
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Determine job status and progress
  const hasExtractions = job.mistralExtractions.length > 0
  const hasAnalyses = job.sonnetAnalyses.length > 0
  const hasRuleAnalyses = job.ruleAnalyses.length > 0
  
  let statusMessage = "Document uploaded, waiting to start processing..."
  let progressPercent = 10
  
  if (hasExtractions) {
    statusMessage = "Document text extracted, analyzing business rules..."
    progressPercent = 40
  }
  if (hasAnalyses) {
    statusMessage = "AI analysis complete, validating business rules..."
    progressPercent = 70
  }
  if (hasRuleAnalyses) {
    statusMessage = "Business rule analysis complete"
    progressPercent = 100
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-foreground">Analysis - {job.fileName || jobId}</h1>
              <p className="text-muted-foreground mt-2">
                Job Status: {job.status} | File Size: {Math.round((job.fileSize || 0) / 1024 / 1024 * 100) / 100} MB
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90">
                Export Report
              </button>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                Accept All
              </button>
            </div>
          </div>
        </header>

        {/* Real-time Progress Tracker */}
        <JobProgressTracker jobId={jobId} />

        {/* Business Rules */}
        <div className="grid gap-6">
          {/* Show dynamic content based on processing status */}
          {!hasExtractions && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-card-foreground mb-4">Document Processing</h3>
                <p className="text-muted-foreground mb-4">
                  Your document is being processed. Text extraction and business rule analysis will begin shortly.
                </p>
                <div className="w-full bg-accent rounded-full h-2 max-w-md mx-auto">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '30%' }}></div>
                </div>
              </div>
            </div>
          )}

          {hasExtractions && !hasRuleAnalyses && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-card-foreground mb-4">Business Rule Analysis</h3>
                <p className="text-muted-foreground mb-4">
                  Text extraction complete. Analyzing business rules and compliance requirements...
                </p>
                <div className="w-full bg-accent rounded-full h-2 max-w-md mx-auto">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          )}

          {hasRuleAnalyses && job.ruleAnalyses.map((analysis: any, index: number) => (
            <div key={index} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-card-foreground">{analysis.ruleType}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{analysis.description}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  analysis.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                  analysis.status === 'NON_COMPLIANT' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {analysis.status}
                </span>
              </div>
              
              <div className="space-y-4">
                {analysis.findings && (
                  <div className={`p-4 rounded-lg border ${
                    analysis.status === 'COMPLIANT' ? 'bg-green-50 border-green-200' :
                    analysis.status === 'NON_COMPLIANT' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className="text-sm">
                      {typeof analysis.findings === 'string' 
                        ? analysis.findings 
                        : analysis.findings?.evidence || 'Analysis findings available'}
                    </p>
                    {analysis.findings?.sourcePages && (
                      <p className="text-xs text-gray-600 mt-1">
                        Source: Page {analysis.findings.sourcePages.join(', ')}
                      </p>
                    )}
                    {analysis.recommendation && (
                      <div className="mt-3 flex gap-2">
                        <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                          Accept Recommendation
                        </button>
                        <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                          Edit Manually
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Default processing message when extraction exists but no rule analyses yet */}
          {hasExtractions && !hasRuleAnalyses && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-card-foreground mb-4">Analyzing Business Rules</h3>
                <p className="text-muted-foreground mb-4">
                  Processing document for compliance with Hip/Ridge Cap, Starter Strip, Ice & Water Barrier, and Drip Edge requirements...
                </p>
                <div className="w-full bg-accent rounded-full h-2 max-w-md mx-auto">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <a 
            href="/jobs" 
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            ← Back to Jobs
          </a>
          <a 
            href={`/reports/${jobId}`}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Generate Report →
          </a>
        </div>
      </div>
    </div>
  );
}