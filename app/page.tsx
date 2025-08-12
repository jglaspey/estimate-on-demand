export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-medium text-foreground">
          EOD Insurance Supplement Analysis
        </h1>
        <p className="text-lg text-muted-foreground">
          Professional insurance supplement analysis with real-time AI processing
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a 
            href="/design" 
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            View Design System
          </a>
          <a 
            href="/dashboard" 
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}