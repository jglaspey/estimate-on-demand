'use client';
import { useEffect, useState } from 'react';

type V2Data = {
  totals?: {
    rcv?: number;
    acv?: number;
    netClaim?: number;
    priceList?: string;
    estimateCompletedAt?: string;
    confidence?: number;
  };
  lineItems?: Array<{
    category?: string;
    description: string;
    code?: string;
    quantity?: { value: number; unit: string };
    unitPrice?: number;
    totalPrice?: number;
    sourcePages?: number[];
    confidence?: number;
  }>;
  measurements?: Record<string, unknown>;
  verification?: {
    verifications: Array<{
      field: string;
      extractedValue: unknown;
      observedValue?: unknown;
      confidence: number;
      pages: number[];
    }>;
    corrections: Record<string, unknown>;
  };
};

type ApiResponse = {
  jobId: string;
  v2: V2Data | null;
  job?: Record<string, unknown>;
};

export default function V2Viewer({ jobId }: { jobId: string }) {
  const [data, setData] = useState<V2Data | null>(null);
  const [jobMeta, setJobMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/jobs/${jobId}/extract-v2`, {
          cache: 'no-store',
        });
        const json: ApiResponse = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch');
        if (mounted) {
          setData(json.v2 || null);
          setJobMeta(json.job || null);
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div className='text-red-600'>Error: {error}</div>;
  if (!data) return <div>No v2 data yet.</div>;

  // derive missing fields – totals, measurements, and category coverage
  const missing: string[] = [];
  const totals = data.totals || {};
  if (totals.rcv == null) missing.push('RCV');
  if (totals.acv == null) missing.push('ACV');
  if (totals.netClaim == null) missing.push('Net Claim');
  if (!totals.priceList) missing.push('Price List');
  if (!totals.estimateCompletedAt) missing.push('Date Est. Completed');

  const meas = (data.measurements || {}) as Record<string, unknown>;
  const requiredMeas = [
    ['ridgeLength', 'Ridge LF'],
    ['hipLength', 'Hip LF'],
    ['eaveLength', 'Eave LF'],
    ['rakeLength', 'Rake LF'],
    ['valleyLength', 'Valley LF'],
    ['squares', 'Squares'],
    ['pitch', 'Pitch'],
    ['stories', 'Stories'],
  ] as const;
  for (const [key, label] of requiredMeas) {
    const v = meas[key as string];
    if (
      v == null ||
      v === '' ||
      (typeof v === 'number' && !Number.isFinite(v as number))
    ) {
      missing.push(label);
    }
  }

  const items = data.lineItems || [];
  const hasCat = (
    name: 'starter' | 'drip_edge' | 'gutter_apron' | 'ice_water'
  ) =>
    items.some(
      li =>
        (li.category && li.category.toLowerCase() === name) ||
        (li.description &&
          ((name === 'starter' && /starter/i.test(li.description)) ||
            (name === 'drip_edge' && /drip\s*edge/i.test(li.description)) ||
            (name === 'gutter_apron' &&
              /(gutter\s*apron|eave\s*flashing)/i.test(li.description)) ||
            (name === 'ice_water' &&
              /(ice\s*&?\s*water|I&W)/i.test(li.description))))
    );
  if (!hasCat('starter')) missing.push('Starter line items');
  if (!hasCat('drip_edge')) missing.push('Drip Edge line items');
  if (!hasCat('gutter_apron')) missing.push('Gutter Apron line items');
  if (!hasCat('ice_water')) missing.push('Ice & Water line items');

  // include job mirrors if present
  if (jobMeta) {
    const jm = jobMeta as Record<string, unknown>;
    const checkNull = (k: string, label: string) => {
      const v = jm[k];
      if (v == null || v === '') missing.push(label);
    };
    checkNull('eaveLength', 'Job.eaveLength');
    checkNull('rakeLength', 'Job.rakeLength');
    checkNull('ridgeHipLength', 'Job.ridgeHipLength');
    checkNull('valleyLength', 'Job.valleyLength');
    checkNull('roofStories', 'Job.roofStories');
    checkNull('roofSlope', 'Job.roofSlope');
    checkNull('roofMaterial', 'Job.roofMaterial');
  }

  return (
    <div className='space-y-6'>
      {missing.length > 0 ? (
        <div className='p-3 rounded bg-yellow-50 text-yellow-900 text-sm'>
          <div className='font-medium mb-1'>Missing fields</div>
          <ul className='list-disc pl-5'>
            {Array.from(new Set(missing)).map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className='p-3 rounded bg-green-50 text-green-900 text-sm'>
          All required fields present.
        </div>
      )}
      <section>
        <h2 className='text-xl font-semibold'>Totals</h2>
        <div className='mt-2 grid grid-cols-2 gap-2 text-sm'>
          <div>
            <span className='font-medium'>RCV:</span>{' '}
            {fmtMoney(data.totals?.rcv)}
          </div>
          <div>
            <span className='font-medium'>ACV:</span>{' '}
            {fmtMoney(data.totals?.acv)}
          </div>
          <div>
            <span className='font-medium'>Net Claim:</span>{' '}
            {fmtMoney(data.totals?.netClaim)}
          </div>
          <div>
            <span className='font-medium'>Price List:</span>{' '}
            {data.totals?.priceList || '—'}
          </div>
          <div>
            <span className='font-medium'>Completed:</span>{' '}
            {fmtDate(data.totals?.estimateCompletedAt)}
          </div>
          <div>
            <span className='font-medium'>Confidence:</span>{' '}
            {pct(data.totals?.confidence)}
          </div>
        </div>
      </section>

      <section>
        <h2 className='text-xl font-semibold'>Line Items</h2>
        <div className='mt-2 overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='text-left border-b'>
                <th className='py-1 pr-4'>Category</th>
                <th className='py-1 pr-4'>Code</th>
                <th className='py-1 pr-4'>Description</th>
                <th className='py-1 pr-4'>Qty</th>
                <th className='py-1 pr-4'>Unit Price</th>
                <th className='py-1 pr-4'>Total</th>
                <th className='py-1 pr-4'>Pages</th>
                <th className='py-1 pr-4'>Conf.</th>
              </tr>
            </thead>
            <tbody>
              {(data.lineItems || []).map((li, i) => (
                <tr key={i} className='border-b'>
                  <td className='py-1 pr-4'>{li.category || '—'}</td>
                  <td className='py-1 pr-4'>{li.code || '—'}</td>
                  <td className='py-1 pr-4'>{li.description}</td>
                  <td className='py-1 pr-4'>{fmtQty(li.quantity)}</td>
                  <td className='py-1 pr-4'>{fmtMoney(li.unitPrice)}</td>
                  <td className='py-1 pr-4'>{fmtMoney(li.totalPrice)}</td>
                  <td className='py-1 pr-4'>
                    {(li.sourcePages || []).join(', ') || '—'}
                  </td>
                  <td className='py-1 pr-4'>{pct(li.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className='text-xl font-semibold'>Measurements</h2>
        <pre className='mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto'>
          {JSON.stringify(data.measurements, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className='text-xl font-semibold'>Verification</h2>
        {data.verification?.verifications?.length ? (
          <ul className='mt-2 space-y-1 text-sm'>
            {data.verification.verifications.map((v, idx) => (
              <li key={idx} className='border p-2 rounded'>
                <div className='font-medium'>{v.field}</div>
                <div>Extracted: {String(v.extractedValue)}</div>
                {v.observedValue !== undefined && (
                  <div>Observed: {String(v.observedValue)}</div>
                )}
                <div>Confidence: {pct(v.confidence)}</div>
                <div>Pages: {v.pages.join(', ')}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className='text-sm'>No discrepancies found.</div>
        )}
      </section>

      <section>
        <ReRun jobId={jobId} />
      </section>
    </div>
  );
}

function fmtMoney(n?: number) {
  if (typeof n !== 'number') return '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}
function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}
function fmtQty(q?: { value: number; unit: string }) {
  if (!q) return '—';
  return `${q.value} ${q.unit}`;
}
function pct(n?: number) {
  if (typeof n !== 'number') return '—';
  return `${Math.round(n * 100)}%`;
}

function ReRun({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const onClick = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/extract-v2`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setOk('Re-run started. Refresh in a bit to see new results.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className='flex items-center gap-3'>
      <button
        onClick={onClick}
        disabled={busy}
        className='px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50'
      >
        {busy ? 'Re-running…' : 'Re-run v2 extraction'}
      </button>
      {ok && <span className='text-green-700 text-sm'>{ok}</span>}
      {error && <span className='text-red-700 text-sm'>Error: {error}</span>}
    </div>
  );
}
