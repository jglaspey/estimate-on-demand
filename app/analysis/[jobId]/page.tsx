type Props = {
  params: Promise<{ jobId: string }>
}

export default async function Analysis({ params }: Props) {
  const { jobId } = await params;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-foreground">Analysis - {jobId}</h1>
              <p className="text-muted-foreground mt-2">
                Real-time business rule analysis and validation
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

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-card-foreground">Analysis Progress</h3>
            <span className="text-sm text-muted-foreground">3 of 4 rules analyzed</span>
          </div>
          <div className="w-full bg-accent rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Business Rules */}
        <div className="grid gap-6">
          {/* Hip/Ridge Cap Quality */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">Hip/Ridge Cap Quality</h3>
                <p className="text-sm text-muted-foreground mt-1">ASTM D3161/D7158 compliance validation</p>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                Issues Found
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Non-Compliant Ridge Caps Detected</h4>
                <p className="text-sm text-red-700 mb-3">
                  Found &quot;Cut from 3-tab shingles&quot; in line item description. This violates ASTM standards.
                </p>
                <div className="bg-white p-3 rounded border text-sm font-mono">
                  Line 47: &quot;Ridge cap shingles cut from 3 tab shingles - 120 LF @ $2.50 = $300.00&quot;
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    Accept Recommendation
                  </button>
                  <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                    Edit Manually
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Starter Strip Quality */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">Starter Strip Quality</h3>
                <p className="text-sm text-muted-foreground mt-1">Universal starter vs cut shingles analysis</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Compliant
              </span>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Proper Universal Starter Strip Found</h4>
              <p className="text-sm text-green-700 mb-3">
                Universal starter strip with proper coverage detected. Matches eave length requirements.
              </p>
              <div className="bg-white p-3 rounded border text-sm font-mono">
                Line 23: &quot;Universal starter strip - 180 LF @ $1.25 = $225.00&quot;
              </div>
            </div>
          </div>

          {/* Ice & Water Barrier */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">Ice & Water Barrier</h3>
                <p className="text-sm text-muted-foreground mt-1">IRC R905.1.2 coverage calculation</p>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                Under Review
              </span>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Coverage Analysis in Progress</h4>
              <p className="text-sm text-yellow-700">
                Calculating required coverage based on soffit depth, wall thickness, and roof pitch...
              </p>
              <div className="mt-3">
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Drip Edge & Gutter Apron */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">Drip Edge & Gutter Apron</h3>
                <p className="text-sm text-muted-foreground mt-1">Edge protection validation</p>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                Pending
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                Waiting for ice & water barrier analysis to complete before validating edge protection requirements.
              </p>
            </div>
          </div>
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