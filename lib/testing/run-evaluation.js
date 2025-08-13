#!/usr/bin/env node

/**
 * Simple runner for LLM evaluation
 * Transpiles TypeScript and executes the evaluation
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting LLM Evaluation for Insurance Document Processing\n');

try {
  // Use tsx to run TypeScript directly
  const evaluationPath = path.join(__dirname, 'llm-evaluation.ts');
  
  console.log('📦 Installing tsx if needed...');
  try {
    execSync('npm list tsx', { stdio: 'ignore' });
  } catch {
    console.log('Installing tsx...');
    execSync('npm install --save-dev tsx', { stdio: 'inherit' });
  }
  
  console.log('🔄 Running evaluation...\n');
  execSync(`npx tsx ${evaluationPath}`, { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Evaluation failed:', error.message);
  process.exit(1);
}