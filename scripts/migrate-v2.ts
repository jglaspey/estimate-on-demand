/*
 * Migrate all jobs to V2 extraction
 * - Finds jobs whose latest extraction JSON lacks a top-level "v2" object
 * - Runs the v2 orchestrator against their documents
 * - Limits concurrency to avoid API rate limits
 *
 * Usage:
 *   npx tsx scripts/migrate-v2.ts            # dry run (no changes)
 *   RUN=1 CONCURRENCY=2 npx tsx scripts/migrate-v2.ts
 */

import pLimit from 'p-limit';

import { prisma } from '@/lib/database/client';
import { extractionV2 } from '@/lib/extraction/v2/orchestrator';

async function hasV2(jobId: string): Promise<boolean> {
  const latest = await prisma.mistralExtraction.findFirst({
    where: { jobId },
    orderBy: { extractedAt: 'desc' },
  });
  if (!latest) return false;
  try {
    const data = latest.extractedData as unknown as Record<string, unknown>;
    return Boolean(data && typeof data === 'object' && 'v2' in data);
  } catch {
    return false;
  }
}

async function main() {
  const run = process.env.RUN === '1' || process.env.RUN === 'true';
  const concurrency = Number(process.env.CONCURRENCY || 2);
  const limit = pLimit(Math.max(1, Math.min(8, concurrency)));

  const jobs = await prisma.job.findMany({
    select: { id: true },
    orderBy: { uploadedAt: 'asc' },
  });

  const toProcess: string[] = [];
  for (const j of jobs) {
    const v2 = await hasV2(j.id);
    if (!v2) toProcess.push(j.id);
  }

  console.warn(
    `Found ${jobs.length} total jobs; ${toProcess.length} without v2.`
  );
  if (!run) {
    console.warn('Dry run. Set RUN=1 to execute.');
    return;
  }

  const runners = toProcess.map(jobId =>
    limit(async () => {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { documents: true },
      });
      if (!job) return;
      const filePaths = (job.documents || [])
        .map(d => d.filePath)
        .filter((p): p is string => Boolean(p));
      if (filePaths.length === 0) return;
      console.warn(
        `Running v2 for job ${jobId} with ${filePaths.length} files...`
      );
      try {
        await extractionV2.run(jobId, filePaths);
        console.warn(`✅ v2 complete for job ${jobId}`);
      } catch (err) {
        console.error(`❌ v2 failed for job ${jobId}:`, err);
      }
    })
  );

  await Promise.all(runners);
  console.warn('Migration complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async err => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
