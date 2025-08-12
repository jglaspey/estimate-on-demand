'use client';

import { JobsDashboard } from '@/components/JobsDashboard';

export default function Dashboard() {
  return <JobsDashboard onJobSelect={(jobId: string) => {
    // For now, we'll handle this with client-side navigation
    // Later this will integrate with our routing system
    console.log('Job selected:', jobId);
  }} />;
}