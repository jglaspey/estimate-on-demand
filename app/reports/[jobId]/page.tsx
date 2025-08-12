type Props = {
  params: Promise<{ jobId: string }>
}

export default async function Report({ params }: Props) {
  const { jobId } = await params;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-medium text-foreground">Supplement Report</h1>
          <p className="text-muted-foreground mt-2">
            Professional analysis report for {jobId}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              Download PDF
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90">
              Email Report
            </button>
          </div>
        </header>

        {/* Report Summary */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-medium text-card-foreground mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-card-foreground mb-2">Property Information</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Address: 123 Oak Street</p>
                <p>Carrier: State Farm</p>
                <p>Date of Loss: March 15, 2024</p>
                <p>Analysis Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-card-foreground mb-2">Financial Impact</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Estimate:</span>
                  <span className="font-medium">$12,450</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recommended Additions:</span>
                  <span className="font-medium text-green-600">+$3,250</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="font-medium">Total Revised:</span>
                  <span className="font-medium text-primary">$15,700</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-medium text-card-foreground mb-4">Analysis Findings</h2>
          
          <div className="space-y-4">
            {/* Critical Issue */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-sm font-bold">!</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-1">Hip/Ridge Cap Quality - Non-Compliant</h3>
                  <p className="text-sm text-red-700 mb-2">
                    The estimate specifies ridge caps &quot;cut from 3-tab shingles&quot; which violates ASTM D3161/D7158 standards for wind resistance and weather protection.
                  </p>
                  <div className="text-xs text-red-600 bg-white p-2 rounded border">
                    <strong>Original:</strong> Ridge cap shingles cut from 3 tab - 120 LF @ $2.50 = $300.00<br/>
                    <strong>Recommended:</strong> Purpose-built ridge cap shingles (ASTM compliant) - 120 LF @ $4.25 = $510.00
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-red-900">Financial Impact:</span>
                    <span className="text-green-600 ml-2">+$210.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliant Item */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-1">Starter Strip Quality - Compliant</h3>
                  <p className="text-sm text-green-700 mb-2">
                    Universal starter strip properly specified with adequate coverage matching eave length requirements.
                  </p>
                  <div className="text-xs text-green-600 bg-white p-2 rounded border">
                    Universal starter strip - 180 LF @ $1.25 = $225.00
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Recommendation */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm">+</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-1">Ice & Water Barrier - Coverage Upgrade</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    Based on IRC R905.1.2 calculations considering soffit depth (18&quot;) and roof pitch (6:12), additional coverage is required for code compliance.
                  </p>
                  <div className="text-xs text-blue-600 bg-white p-2 rounded border">
                    <strong>Additional Required:</strong> Ice & water barrier upgrade - 240 SF @ $12.50 = $3,000.00
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-blue-900">Financial Impact:</span>
                    <span className="text-green-600 ml-2">+$3,000.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-medium text-card-foreground mb-4">Technical Analysis Details</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>
              This analysis was performed using AI-powered document processing with validation against current industry standards including ASTM D3161, ASTM D7158, and IRC R905.1.2. Each line item was evaluated for compliance, quality standards, and coverage adequacy.
            </p>
            <p>
              The analysis considered roof measurements from the provided roof report, cross-referenced with estimate quantities, and validated against manufacturer specifications and local building codes.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <a 
            href={`/analysis/${jobId}`}
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            ← Back to Analysis
          </a>
          <a 
            href="/jobs"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Jobs
          </a>
        </div>
      </div>
    </div>
  );
}