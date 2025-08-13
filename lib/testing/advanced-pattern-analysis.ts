/**
 * Advanced Pattern Analysis with Mistral Vision
 * 
 * Compares extraction methods including:
 * 1. Claude Haiku 3.5 (direct PDF)
 * 2. Mistral Vision models (PDF → image → OCR)
 * 3. Pattern analysis across document types
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
config({ path: path.join(__dirname, '..', '..', '.env') });

import { createHaikuEngine } from '../extraction/haiku-extraction-engine';
import { createMistralEngine } from '../extraction/mistral-extraction-engine';
import { convertPDFToImages } from '../utils/pdf-to-images';

interface ComparisonResult {
  document: string;
  haiku: any;
  mistralPixtral12B: any;
  mistralPixtralLarge: any;
  processingTimes: {
    haiku: number;
    mistralPixtral12B: number;
    mistralPixtralLarge: number;
  };
  costs: {
    haiku: number;
    mistralPixtral12B: number;
    mistralPixtralLarge: number;
  };
  accuracy: {
    haiku: number;
    mistralPixtral12B: number;
    mistralPixtralLarge: number;
  };
}

interface PatternAnalysis {
  fieldFrequency: {
    hipRidgeCap: number;
    starterStrip: number;
    dripEdge: number;
    gutterApron: number;
    iceWaterBarrier: number;
  };
  commonDescriptions: {
    [field: string]: string[];
  };
  quantityRanges: {
    [field: string]: { min: number; max: number; avg: number };
  };
  modelStrengths: {
    [model: string]: string[];
  };
}

async function runAdvancedPatternAnalysis() {
  console.log('🔍 Starting Advanced Pattern Analysis with Mistral Vision...\n');

  // Test documents
  const testDocuments = [
    'examples/estimate-1.pdf',
    'examples/estimate-2.pdf', 
    'examples/roof-report-1.pdf',
    'examples/supplement-1.pdf',
    'examples/eod-sample.pdf'
  ].filter(doc => fs.existsSync(doc));

  if (testDocuments.length === 0) {
    console.error('❌ No test documents found. Please add PDF files to examples/ folder.');
    return;
  }

  console.log(`📄 Found ${testDocuments.length} test documents`);

  // Initialize engines
  const haikuEngine = createHaikuEngine();
  const mistralPixtral12B = createMistralEngine(undefined, 'pixtral-12b-2409');
  const mistralPixtralLarge = createMistralEngine(undefined, 'pixtral-large-2411');

  const results: ComparisonResult[] = [];

  // Process each document
  for (const docPath of testDocuments) {
    console.log(`\n🔄 Processing: ${docPath}`);
    
    try {
      const pdfBuffer = fs.readFileSync(docPath);
      const docName = path.basename(docPath);

      // Run all extractions in parallel for fair comparison
      console.log('   ⚡ Running parallel extractions...');
      
      const [haikuResult, mistral12BResult, mistralLargeResult] = await Promise.allSettled([
        haikuEngine.extractFromPDF(pdfBuffer, `haiku-${docName}`),
        mistralPixtral12B.extractFromPDF(pdfBuffer, `mistral12b-${docName}`),
        mistralPixtralLarge.extractFromPDF(pdfBuffer, `mistrallarge-${docName}`)
      ]);

      // Process results
      const comparison: ComparisonResult = {
        document: docName,
        haiku: haikuResult.status === 'fulfilled' ? haikuResult.value : { error: 'Failed' },
        mistralPixtral12B: mistral12BResult.status === 'fulfilled' ? mistral12BResult.value : { error: 'Failed' },
        mistralPixtralLarge: mistralLargeResult.status === 'fulfilled' ? mistralLargeResult.value : { error: 'Failed' },
        processingTimes: {
          haiku: haikuResult.status === 'fulfilled' ? haikuResult.value.metrics.processingTime : 0,
          mistralPixtral12B: mistral12BResult.status === 'fulfilled' ? mistral12BResult.value.metrics.processingTime : 0,
          mistralPixtralLarge: mistralLargeResult.status === 'fulfilled' ? mistralLargeResult.value.metrics.processingTime : 0,
        },
        costs: {
          haiku: haikuResult.status === 'fulfilled' ? haikuResult.value.metrics.cost : 0,
          mistralPixtral12B: mistral12BResult.status === 'fulfilled' ? mistral12BResult.value.metrics.cost : 0,
          mistralPixtralLarge: mistralLargeResult.status === 'fulfilled' ? mistralLargeResult.value.metrics.cost : 0,
        },
        accuracy: {
          haiku: haikuResult.status === 'fulfilled' ? calculateAccuracy(haikuResult.value.data) : 0,
          mistralPixtral12B: mistral12BResult.status === 'fulfilled' ? calculateAccuracy(mistral12BResult.value.data) : 0,
          mistralPixtralLarge: mistralLargeResult.status === 'fulfilled' ? calculateAccuracy(mistralLargeResult.value.data) : 0,
        }
      };

      results.push(comparison);

      // Display quick results
      console.log('   📊 Quick Results:');
      console.log(`      Haiku: ${comparison.accuracy.haiku}% accuracy, ${comparison.processingTimes.haiku}ms, $${comparison.costs.haiku.toFixed(4)}`);
      console.log(`      Mistral 12B: ${comparison.accuracy.mistralPixtral12B}% accuracy, ${comparison.processingTimes.mistralPixtral12B}ms, $${comparison.costs.mistralPixtral12B.toFixed(4)}`);
      console.log(`      Mistral Large: ${comparison.accuracy.mistralPixtralLarge}% accuracy, ${comparison.processingTimes.mistralPixtralLarge}ms, $${comparison.costs.mistralPixtralLarge.toFixed(4)}`);

    } catch (error) {
      console.error(`❌ Failed to process ${docPath}:`, error);
    }
  }

  // Generate comprehensive analysis
  console.log('\n📈 COMPREHENSIVE ANALYSIS RESULTS\n');
  console.log('=' .repeat(80));

  // Overall performance comparison
  const avgMetrics = calculateAverageMetrics(results);
  
  console.log('\n🎯 AVERAGE PERFORMANCE METRICS:');
  console.log('┌─────────────────┬──────────┬───────────────┬─────────────┐');
  console.log('│ Model           │ Accuracy │ Time (ms)     │ Cost ($)    │');
  console.log('├─────────────────┼──────────┼───────────────┼─────────────┤');
  console.log(`│ Haiku 3.5       │ ${avgMetrics.haiku.accuracy.toFixed(1).padStart(7)}% │ ${avgMetrics.haiku.time.toFixed(0).padStart(11)} │ ${avgMetrics.haiku.cost.toFixed(4).padStart(10)} │`);
  console.log(`│ Mistral 12B     │ ${avgMetrics.mistral12B.accuracy.toFixed(1).padStart(7)}% │ ${avgMetrics.mistral12B.time.toFixed(0).padStart(11)} │ ${avgMetrics.mistral12B.cost.toFixed(4).padStart(10)} │`);
  console.log(`│ Mistral Large   │ ${avgMetrics.mistralLarge.accuracy.toFixed(1).padStart(7)}% │ ${avgMetrics.mistralLarge.time.toFixed(0).padStart(11)} │ ${avgMetrics.mistralLarge.cost.toFixed(4).padStart(10)} │`);
  console.log('└─────────────────┴──────────┴───────────────┴─────────────┘');

  // Field detection analysis
  const patternAnalysis = analyzePatterns(results);
  
  console.log('\n🔍 FIELD DETECTION FREQUENCY:');
  Object.entries(patternAnalysis.fieldFrequency).forEach(([field, frequency]) => {
    const percentage = (frequency / results.length * 100).toFixed(1);
    console.log(`   ${field}: ${frequency}/${results.length} documents (${percentage}%)`);
  });

  // Model strengths analysis
  console.log('\n💪 MODEL STRENGTHS:');
  Object.entries(patternAnalysis.modelStrengths).forEach(([model, strengths]) => {
    console.log(`   ${model}:`);
    strengths.forEach(strength => console.log(`      - ${strength}`));
  });

  // Critical findings
  console.log('\n🚨 CRITICAL FINDINGS:');
  const criticalFindings = identifyCriticalFindings(results);
  criticalFindings.forEach(finding => console.log(`   - ${finding}`));

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  const recommendations = generateRecommendations(avgMetrics, patternAnalysis);
  recommendations.forEach(rec => console.log(`   - ${rec}`));

  // Save detailed results
  const outputPath = 'lib/testing/advanced-pattern-analysis-results.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    averageMetrics: avgMetrics,
    patternAnalysis,
    detailedResults: results,
    criticalFindings,
    recommendations
  }, null, 2));

  console.log(`\n💾 Detailed results saved to: ${outputPath}`);
  console.log('\n✅ Advanced pattern analysis complete!');
}

function calculateAccuracy(extractionResult: any): number {
  if (!extractionResult || extractionResult.error) return 0;
  
  const fields = [
    extractionResult.hipRidgeCap?.found,
    extractionResult.starterStrip?.found, 
    extractionResult.dripEdge?.found,
    extractionResult.gutterApron?.found,
    extractionResult.iceWaterBarrier?.found
  ];
  
  const foundFields = fields.filter(found => found === true).length;
  return (foundFields / fields.length) * 100;
}

function calculateAverageMetrics(results: ComparisonResult[]) {
  const validResults = results.filter(r => r.haiku && !r.haiku.error);
  
  const avgHaiku = {
    accuracy: validResults.reduce((sum, r) => sum + r.accuracy.haiku, 0) / validResults.length,
    time: validResults.reduce((sum, r) => sum + r.processingTimes.haiku, 0) / validResults.length,
    cost: validResults.reduce((sum, r) => sum + r.costs.haiku, 0) / validResults.length
  };

  const avgMistral12B = {
    accuracy: validResults.reduce((sum, r) => sum + r.accuracy.mistralPixtral12B, 0) / validResults.length,
    time: validResults.reduce((sum, r) => sum + r.processingTimes.mistralPixtral12B, 0) / validResults.length,
    cost: validResults.reduce((sum, r) => sum + r.costs.mistralPixtral12B, 0) / validResults.length
  };

  const avgMistralLarge = {
    accuracy: validResults.reduce((sum, r) => sum + r.accuracy.mistralPixtralLarge, 0) / validResults.length,
    time: validResults.reduce((sum, r) => sum + r.processingTimes.mistralPixtralLarge, 0) / validResults.length,
    cost: validResults.reduce((sum, r) => sum + r.costs.mistralPixtralLarge, 0) / validResults.length
  };

  return { haiku: avgHaiku, mistral12B: avgMistral12B, mistralLarge: avgMistralLarge };
}

function analyzePatterns(results: ComparisonResult[]): PatternAnalysis {
  const fieldFrequency = {
    hipRidgeCap: 0,
    starterStrip: 0,
    dripEdge: 0,
    gutterApron: 0,
    iceWaterBarrier: 0
  };

  const modelStrengths: { [model: string]: string[] } = {
    'Haiku 3.5': [],
    'Mistral 12B': [],
    'Mistral Large': []
  };

  // Analyze field detection across all results
  for (const result of results) {
    if (result.haiku?.data) {
      if (result.haiku.data.hipRidgeCap?.found) fieldFrequency.hipRidgeCap++;
      if (result.haiku.data.starterStrip?.found) fieldFrequency.starterStrip++;
      if (result.haiku.data.dripEdge?.found) fieldFrequency.dripEdge++;
      if (result.haiku.data.gutterApron?.found) fieldFrequency.gutterApron++;
      if (result.haiku.data.iceWaterBarrier?.found) fieldFrequency.iceWaterBarrier++;
    }
  }

  // Determine model strengths
  const avgAccuracies = calculateAverageMetrics(results);
  
  if (avgAccuracies.haiku.accuracy >= avgAccuracies.mistral12B.accuracy && avgAccuracies.haiku.cost <= avgAccuracies.mistral12B.cost) {
    modelStrengths['Haiku 3.5'].push('Best cost-effectiveness');
  }
  if (avgAccuracies.haiku.time <= avgAccuracies.mistral12B.time) {
    modelStrengths['Haiku 3.5'].push('Fastest processing');
  }
  
  modelStrengths['Mistral 12B'].push('Vision-based OCR capability');
  modelStrengths['Mistral 12B'].push('Multi-page document analysis');
  modelStrengths['Mistral Large'].push('Advanced vision understanding');

  return {
    fieldFrequency,
    commonDescriptions: {},
    quantityRanges: {},
    modelStrengths
  };
}

function identifyCriticalFindings(results: ComparisonResult[]): string[] {
  const findings: string[] = [];
  
  let gutterApronDetections = 0;
  for (const result of results) {
    if (result.haiku?.data?.gutterApron?.found) gutterApronDetections++;
  }
  
  if (gutterApronDetections > 0) {
    findings.push(`Gutter apron detected in ${gutterApronDetections}/${results.length} documents - critical for compliance`);
  }

  const avgMetrics = calculateAverageMetrics(results);
  if (avgMetrics.mistral12B.cost > avgMetrics.haiku.cost * 3) {
    findings.push('Mistral models significantly more expensive than Haiku for similar accuracy');
  }

  return findings;
}

function generateRecommendations(avgMetrics: any, patternAnalysis: PatternAnalysis): string[] {
  const recommendations: string[] = [];
  
  // Cost-effectiveness
  if (avgMetrics.haiku.cost < avgMetrics.mistral12B.cost && avgMetrics.haiku.accuracy >= avgMetrics.mistral12B.accuracy * 0.9) {
    recommendations.push('Continue using Haiku 3.5 as primary engine for cost-effectiveness');
  }

  // Vision capabilities
  recommendations.push('Consider Mistral vision models for documents with poor OCR quality or complex layouts');
  recommendations.push('Implement hybrid approach: Haiku for standard docs, Mistral for complex/visual documents');

  // Performance optimization
  if (avgMetrics.mistral12B.time > avgMetrics.haiku.time * 2) {
    recommendations.push('Use Mistral models only when direct PDF processing fails');
  }

  return recommendations;
}

// Run the analysis
if (require.main === module) {
  runAdvancedPatternAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}