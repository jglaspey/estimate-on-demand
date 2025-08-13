#!/usr/bin/env node

/**
 * Simple Node.js runner for the extraction script
 * Avoids Prisma prepared statement issues
 */

const { spawn } = require('child_process');
const path = require('path');

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔄 Starting extraction process...\n');

// Run the extraction script with tsx
const extraction = spawn('npx', ['tsx', 'scripts/extract-real-data.ts'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    // Force a new Prisma connection
    DATABASE_URL: process.env.DATABASE_URL,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
  },
  stdio: 'inherit'
});

extraction.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Extraction completed successfully!');
  } else {
    console.error(`\n❌ Extraction failed with code ${code}`);
    process.exit(code);
  }
});

extraction.on('error', (error) => {
  console.error('❌ Failed to start extraction:', error);
  process.exit(1);
});