/**
 * Database client singleton for Prisma operations
 * 
 * Provides centralized database access with connection pooling
 * and error handling for the EOD insurance application
 */

import { PrismaClient } from '../../src/generated/prisma';

// Extend global namespace for development
declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances in development due to hot reloading
const prisma = globalThis.__prisma || new PrismaClient({
  log: ['error', 'warn'],
});

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export { prisma };

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

// Export types for use throughout the application
export type {
  Job,
  Document,
  DocumentPage,
  MistralExtraction,
  SonnetAnalysis,
  RuleAnalysis,
  JobStatus,
  DocumentStatus,
  RuleType,
  RuleStatus,
  UserDecision,
} from '../../src/generated/prisma';