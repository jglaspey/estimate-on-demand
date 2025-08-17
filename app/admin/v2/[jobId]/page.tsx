import V2Viewer from './viewer';

export default function Page({ params }: { params: { jobId: string } }) {
  return (
    <div className='p-6 space-y-6'>
      <h1 className='text-2xl font-semibold'>Extraction v2 – Review</h1>
      <V2Viewer jobId={params.jobId} />
    </div>
  );
}
