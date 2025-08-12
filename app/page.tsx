export default function Home() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-medium text-foreground">
            EOD Insurance Supplement Analysis System
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Professional insurance supplement analysis with real-time AI processing, 
            transparent business rule validation, and user-controlled recommendations.
          </p>
        </header>

        {/* Theme Showcase */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary Card */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-medium text-card-foreground">
              Project Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next.js Setup</span>
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                  Complete
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Theme Configuration</span>
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                  In Progress
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database Setup</span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                  Pending
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Card */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-medium text-card-foreground">
              Design System
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-sm">Primary - Professional Dark</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-secondary rounded"></div>
                <span className="text-sm">Secondary - Light Purple</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-accent rounded"></div>
                <span className="text-sm">Accent - Neutral Gray</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-destructive rounded"></div>
                <span className="text-sm">Destructive - Alert Red</span>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-medium text-card-foreground">
              Typography Scale
            </h2>
            <div className="space-y-2">
              <h1 className="text-2xl font-medium">Heading 1 - 2xl</h1>
              <h2 className="text-xl font-medium">Heading 2 - xl</h2>
              <h3 className="text-lg font-medium">Heading 3 - lg</h3>
              <h4 className="text-base font-medium">Heading 4 - base</h4>
              <p className="text-base text-muted-foreground">
                Body text optimized for document analysis and professional review.
              </p>
            </div>
          </div>

          {/* Business Rules Preview */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-medium text-card-foreground">
              Business Rules
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-accent rounded border-l-4 border-l-primary">
                <h4 className="font-medium text-sm">Hip/Ridge Cap Quality</h4>
                <p className="text-xs text-muted-foreground">ASTM D3161/D7158 compliance validation</p>
              </div>
              <div className="p-3 bg-accent rounded border-l-4 border-l-primary">
                <h4 className="font-medium text-sm">Starter Strip Quality</h4>
                <p className="text-xs text-muted-foreground">Universal starter vs cut shingles analysis</p>
              </div>
              <div className="p-3 bg-accent rounded border-l-4 border-l-primary">
                <h4 className="font-medium text-sm">Ice & Water Barrier</h4>
                <p className="text-xs text-muted-foreground">IRC R905.1.2 coverage calculation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Built with Next.js 15, TypeScript 5, and Tailwind CSS 4
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Task Master AI • Claude Code Integration
          </p>
        </footer>
      </div>
    </div>
  );
}