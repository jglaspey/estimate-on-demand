export default function Jobs() {
  const jobs = [
    { 
      id: 'JOB-001', 
      property: 'Smith Residence', 
      address: '123 Oak Street', 
      status: 'Completed', 
      value: '$3,250',
      date: '2024-03-15',
      carrier: 'State Farm'
    },
    { 
      id: 'JOB-002', 
      property: 'Johnson Property', 
      address: '456 Pine Avenue', 
      status: 'In Progress', 
      value: '$2,150',
      date: '2024-03-12',
      carrier: 'Allstate'
    },
    { 
      id: 'JOB-003', 
      property: 'Williams House', 
      address: '789 Maple Drive', 
      status: 'Analysis', 
      value: '$4,750',
      date: '2024-03-10',
      carrier: 'Progressive'
    },
    { 
      id: 'JOB-004', 
      property: 'Brown Estate', 
      address: '321 Elm Court', 
      status: 'Review', 
      value: '$1,850',
      date: '2024-03-08',
      carrier: 'USAA'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Analysis': return 'bg-yellow-100 text-yellow-800';
      case 'Review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    Date
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
                      <div className="text-sm font-medium text-card-foreground">{job.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-card-foreground">{job.property}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">{job.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-card-foreground">{job.carrier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-card-foreground">{job.value}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">{job.date}</div>
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
            Showing 1 to 4 of 24 results
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