/*
 * Destructive cleanup: delete ALL jobs and related records, and clear uploads/
 *
 * Usage:
 *   npm run db:clear:dry                 # show counts only
 *   RUN=1 npm run db:clear               # perform deletion
 */

import fs from 'fs/promises';
import path from 'path';

import { prisma } from '@/lib/database/client';

async function rimrafUploads(): Promise<void> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    await Promise.all(
      entries.map(async e => {
        const p = path.join(uploadsDir, e.name);
        if (e.isDirectory()) {
          await fs.rm(p, { recursive: true, force: true });
        } else {
          await fs.rm(p, { force: true });
        }
      })
    );
    console.warn('🧹 uploads/ cleared');
  } catch (err) {
    console.error('Failed to clear uploads/:', err);
  }
}

async function showCounts(): Promise<void> {
  const [jobs, docs, pages, me, sa, ra] = await Promise.all([
    prisma.job.count(),
    prisma.document.count(),
    prisma.documentPage.count(),
    prisma.mistralExtraction.count(),
    prisma.sonnetAnalysis.count(),
    prisma.ruleAnalysis.count(),
  ]);
  console.warn(
    `Counts → jobs:${jobs} documents:${docs} pages:${pages} v1_extractions:${me} sonnet:${sa} rules:${ra}`
  );
}

async function nuke(): Promise<void> {
  // Child-first to avoid constraint issues where cascade is not present
  await prisma.documentPage.deleteMany({});
  await prisma.sonnetAnalysis.deleteMany({});
  await prisma.ruleAnalysis.deleteMany({});
  await prisma.mistralExtraction.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.job.deleteMany({});
}

async function main() {
  const run = process.env.RUN === '1' || process.env.RUN === 'true';

  await showCounts();
  if (!run) {
    console.warn('Dry run. Set RUN=1 to execute.');
    return;
  }

  console.warn('⚠️  Deleting ALL jobs and related data...');
  await nuke();
  await rimrafUploads();
  console.warn('✅ Database wiped.');
  await showCounts();
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
