export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-medium text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your insurance supplement analysis jobs
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-card-foreground">Total Jobs</h3>
            <p className="text-3xl font-medium text-primary mt-2">24</p>
            <p className="text-sm text-muted-foreground mt-1">+3 this week</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-card-foreground">In Progress</h3>
            <p className="text-3xl font-medium text-primary mt-2">7</p>
            <p className="text-sm text-muted-foreground mt-1">Being analyzed</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-card-foreground">Completed</h3>
            <p className="text-3xl font-medium text-primary mt-2">15</p>
            <p className="text-sm text-muted-foreground mt-1">Ready for review</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-card-foreground">Total Value</h3>
            <p className="text-3xl font-medium text-primary mt-2">$47,250</p>
            <p className="text-sm text-muted-foreground mt-1">Supplement value</p>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-medium text-card-foreground mb-4">Recent Jobs</h2>
          <div className="space-y-4">
            {[
              { id: 'JOB-001', property: 'Smith Residence', status: 'Completed', value: '$3,250' },
              { id: 'JOB-002', property: 'Johnson Property', status: 'In Progress', value: '$2,150' },
              { id: 'JOB-003', property: 'Williams House', status: 'Analysis', value: '$4,750' }
            ].map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div>
                  <h3 className="font-medium text-accent-foreground">{job.id}</h3>
                  <p className="text-sm text-muted-foreground">{job.property}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                    {job.status}
                  </span>
                  <p className="text-sm font-medium mt-1">{job.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex gap-4">
          <a 
            href="/upload" 
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Upload New Documents
          </a>
          <a 
            href="/jobs" 
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            View All Jobs
          </a>
        </div>
      </div>
    </div>
  );
}