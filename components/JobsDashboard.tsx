import {
  Plus,
  ExternalLink,
  MapPin,
  Building,
  TrendingUp,
  Calendar,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { JobSummary } from '@/lib/mockData';

interface JobsDashboardProps {
  onJobSelect: (jobId: string) => void;
  onNewJob?: () => void;
  jobs?: JobSummary[];
}

export function JobsDashboard({
  onJobSelect,
  onNewJob,
  jobs = [],
}: JobsDashboardProps) {
  const getStatusBadge = (status: JobSummary['status']) => {
    const statusConfig = {
      uploading: {
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        label: 'Uploading',
      },
      extracting: {
        color:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        label: 'Extracting',
      },
      analyzing: {
        color:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        label: 'Analyzing',
      },
      reviewing: {
        color:
          'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        label: 'Reviewing',
      },
      complete: {
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        label: 'Complete',
      },
    };

    const config = statusConfig[status];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
      {/* Header */}
      <header className='bg-white border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                <Building className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
                  Insurance Jobs
                </h1>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                  Manage your insurance supplement analysis jobs
                </p>
              </div>
            </div>

            <Button
              onClick={onNewJob}
              className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700'
            >
              <Plus className='h-4 w-4 mr-2' />
              New Job
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8'>
        {/* Stats Overview */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white rounded-lg border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                <Building className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <p className='text-2xl font-semibold text-zinc-900 dark:text-zinc-100'>
                  {jobs.length}
                </p>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                  Total Jobs
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30'>
                <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <p className='text-2xl font-semibold text-zinc-900 dark:text-zinc-100'>
                  {formatCurrency(
                    jobs.reduce((sum, job) => sum + job.totalSupplementValue, 0)
                  )}
                </p>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                  Total Supplements
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30'>
                <Calendar className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <p className='text-2xl font-semibold text-zinc-900 dark:text-zinc-100'>
                  {jobs.filter(job => job.status === 'reviewing').length}
                </p>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                  Pending Review
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30'>
                <Building className='h-5 w-5 text-purple-600 dark:text-purple-400' />
              </div>
              <div>
                <p className='text-2xl font-semibold text-zinc-900 dark:text-zinc-100'>
                  {jobs.filter(job => job.status === 'complete').length}
                </p>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                  Completed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className='bg-white rounded-lg border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'>
          <div className='px-6 py-4 border-b border-zinc-200 dark:border-zinc-800'>
            <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
              Recent Jobs
            </h2>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              Click on any job to view detailed analysis and generate
              supplements
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='w-[250px] font-medium text-zinc-700 dark:text-zinc-300'>
                  Customer
                </TableHead>
                <TableHead className='font-medium text-zinc-700 dark:text-zinc-300'>
                  Property Address
                </TableHead>
                <TableHead className='font-medium text-zinc-700 dark:text-zinc-300'>
                  Insurance Carrier
                </TableHead>
                <TableHead className='text-center font-medium text-zinc-700 dark:text-zinc-300'>
                  Supplements
                </TableHead>
                <TableHead className='text-center font-medium text-zinc-700 dark:text-zinc-300'>
                  Status
                </TableHead>
                <TableHead className='text-center font-medium text-zinc-700 dark:text-zinc-300'>
                  Created
                </TableHead>
                <TableHead className='w-[100px] font-medium text-zinc-700 dark:text-zinc-300'>
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(job => (
                <TableRow
                  key={job.id}
                  className='cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  onClick={() => onJobSelect(job.id)}
                >
                  <TableCell className='py-4'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30'>
                        <span className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                          {job.customerName
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div>
                        <p className='font-medium text-zinc-900 dark:text-zinc-100'>
                          {job.customerName}
                        </p>
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                          Job #{job.id.split('-')[1]}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center gap-2'>
                      <MapPin className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                      <span className='text-sm text-zinc-600 dark:text-zinc-300'>
                        {job.propertyAddress}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-6 w-6 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800'>
                        <Building className='h-3 w-3 text-zinc-600 dark:text-zinc-400' />
                      </div>
                      <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                        {job.insuranceCarrier}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='text-center py-4'>
                    <div className='flex flex-col items-center gap-1'>
                      <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                        {job.supplementCount}
                      </span>
                      <span className='text-xs text-green-600 dark:text-green-400 font-medium'>
                        {formatCurrency(job.totalSupplementValue)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='text-center py-4'>
                    {getStatusBadge(job.status)}
                  </TableCell>
                  <TableCell className='text-center py-4'>
                    <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                      {formatDate(job.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className='py-4'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
                      onClick={e => {
                        e.stopPropagation();
                        onJobSelect(job.id);
                      }}
                    >
                      <ExternalLink className='h-4 w-4' />
                      <span className='sr-only'>Open job</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty State (if no jobs) */}
        {jobs.length === 0 && (
          <div className='bg-white rounded-lg border border-zinc-200 p-12 text-center dark:bg-zinc-900 dark:border-zinc-800'>
            <div className='flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 mx-auto mb-4 dark:bg-blue-900/30'>
              <Building className='h-8 w-8 text-blue-600 dark:text-blue-400' />
            </div>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2'>
              No jobs yet
            </h3>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto'>
              Get started by creating your first insurance supplement analysis
              job
            </p>
            <Button
              onClick={onNewJob}
              className='bg-blue-600 hover:bg-blue-700 text-white'
            >
              <Plus className='h-4 w-4 mr-2' />
              Create First Job
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
