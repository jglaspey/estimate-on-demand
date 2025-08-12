export default function Upload() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-medium text-foreground">Upload Documents</h1>
          <p className="text-muted-foreground mt-2">
            Upload estimate, roof report, and existing supplement documents for analysis
          </p>
        </header>

        {/* Upload Areas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estimate Upload */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-card-foreground">Estimate Document</h3>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <div className="w-12 h-12 mx-auto mb-4 bg-accent rounded-lg flex items-center justify-center">
                📄
              </div>
              <p className="text-sm text-muted-foreground">
                Drop estimate PDF here or click to browse
              </p>
              <button className="mt-2 text-xs text-primary hover:underline">
                Browse Files
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Original insurance estimate document
            </p>
          </div>

          {/* Roof Report Upload */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-card-foreground">Roof Report</h3>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <div className="w-12 h-12 mx-auto mb-4 bg-accent rounded-lg flex items-center justify-center">
                🏠
              </div>
              <p className="text-sm text-muted-foreground">
                Drop roof report PDF here or click to browse
              </p>
              <button className="mt-2 text-xs text-primary hover:underline">
                Browse Files
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Detailed roof measurements and specifications
            </p>
          </div>

          {/* Existing Supplement */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-card-foreground">Existing Supplement</h3>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <div className="w-12 h-12 mx-auto mb-4 bg-accent rounded-lg flex items-center justify-center">
                📋
              </div>
              <p className="text-sm text-muted-foreground">
                Drop supplement PDF here (optional)
              </p>
              <button className="mt-2 text-xs text-primary hover:underline">
                Browse Files
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Previous supplement for comparison (optional)
            </p>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-card-foreground">Job Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Property Address
              </label>
              <input 
                type="text"
                placeholder="123 Main St, City, State 12345"
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Job Reference
              </label>
              <input 
                type="text"
                placeholder="JOB-001"
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Insurance Carrier
              </label>
              <input 
                type="text"
                placeholder="State Farm, Allstate, etc."
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date of Loss
              </label>
              <input 
                type="date"
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
            Start Analysis
          </button>
          <button className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors">
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}