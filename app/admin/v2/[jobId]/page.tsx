import V2Viewer from './viewer';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { jobId } = await params;
  
  return (
    <div className='p-6 space-y-6'>
      <h1 className='text-2xl font-semibold'>Extraction v2 – Review</h1>
      <V2Viewer jobId={jobId} />
    </div>
  );
}
