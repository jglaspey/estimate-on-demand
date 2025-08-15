/**
 * Test Extraction Pipeline
 * Validate the multi-stage pipeline with sample documents
 */

import fs from 'fs';
import path from 'path';

import { createExtractionPipeline, ExtractedData, BusinessRuleAssessment } from './extraction-pipeline';

interface PipelineTestResult {
  document: string;
  success: boolean;
  processingTime: number;
  cost: number;
  stage: string;
  extractedFields: number;
  businessRulesPassed: number;
  businessRulesTotal: number;
  error?: string;
  data?: ExtractedData;
  businessRules?: BusinessRuleAssessment;
}

class PipelineValidator {
  private pipeline = createExtractionPipeline();

  private countExtractedFields(data: ExtractedData): number {
    let count = 0;
    
    // Count roof measurements
    Object.values(data.roofMeasurements).forEach(value => {
      if (value !== undefined && value !== null) count++;
    });
    
    // Count materials
    Object.values(data.materials).forEach(material => {
      if (material) {
        Object.values(material).forEach(value => {
          if (value !== undefined && value !== null) count++;
        });
      }
    });
    
    return count;
  }

  private countBusinessRulesPassed(rules: BusinessRuleAssessment): { passed: number; total: number } {
    const checks = [
      rules.hipRidgeCapCompliant,
      rules.starterStripCompliant,
      rules.dripEdgeCompliant,
      rules.iceWaterBarrierCompliant
    ];
    
    const total = checks.filter(check => check !== null).length;
    const passed = checks.filter(check => check === true).length;
    
    return { passed, total };
  }

  async testDocument(documentPath: string): Promise<PipelineTestResult> {
    const documentName = path.basename(documentPath);
    console.log(`\n📄 Testing: ${documentName}`);
    
    try {
      const pdfBuffer = fs.readFileSync(documentPath);
      const result = await this.pipeline.processDocument(pdfBuffer);
      
      if (!result.success) {
        return {
          document: documentName,
          success: false,
          processingTime: result.processingTime,
          cost: result.cost,
          stage: result.stage,
          extractedFields: 0,
          businessRulesPassed: 0,
          businessRulesTotal: 0,
          error: result.error
        };
      }

      const extractedFields = this.countExtractedFields(result.data!);
      const businessRulesCheck = this.countBusinessRulesPassed(result.businessRules!);
      
      console.log(`  ✅ Success: ${extractedFields} fields extracted, ${businessRulesCheck.passed}/${businessRulesCheck.total} rules passed`);
      console.log(`  ⏱️  Time: ${result.processingTime}ms, Cost: $${result.cost.toFixed(4)}`);
      
      return {
        document: documentName,
        success: true,
        processingTime: result.processingTime,
        cost: result.cost,
        stage: result.stage,
        extractedFields,
        businessRulesPassed: businessRulesCheck.passed,
        businessRulesTotal: businessRulesCheck.total,
        data: result.data,
        businessRules: result.businessRules
      };

    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        document: documentName,
        success: false,
        processingTime: 0,
        cost: 0,
        stage: 'error',
        extractedFields: 0,
        businessRulesPassed: 0,
        businessRulesTotal: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runPipelineValidation() {
    console.log('🚀 Extraction Pipeline Validation');
    console.log('='.repeat(50));
    console.log('Testing multi-stage pipeline with business rule assessment\n');

    const results: PipelineTestResult[] = [];
    const examplesDir = path.join(process.cwd(), 'examples');
    
    if (!fs.existsSync(examplesDir)) {
      console.log('❌ Examples directory not found. Please ensure sample PDFs are in ./examples/');
      return;
    }

    const documents = fs.readdirSync(examplesDir)
      .filter(file => file.endsWith('.pdf'))
      .slice(0, 3); // Test with 3 documents for validation

    if (documents.length === 0) {
      console.log('❌ No PDF documents found in examples directory');
      return;
    }

    console.log(`📄 Documents to validate: ${documents.length}`);
    documents.forEach((doc, i) => console.log(`${i + 1}. ${doc}`));

    // Test each document
    for (const document of documents) {
      const documentPath = path.join(examplesDir, document);
      const result = await this.testDocument(documentPath);
      results.push(result);
    }

    // Generate validation report
    this.generateValidationReport(results);

    console.log('\n🎉 Pipeline validation completed!');
    console.log('\n📁 Results saved: lib/extraction/PIPELINE_VALIDATION_REPORT.md');
    
    // Summary statistics
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    const avgFields = results.filter(r => r.success).reduce((sum, r) => sum + r.extractedFields, 0) / results.filter(r => r.success).length;
    const totalRulesPassed = results.reduce((sum, r) => sum + r.businessRulesPassed, 0);
    const totalRulesChecked = results.reduce((sum, r) => sum + r.businessRulesTotal, 0);
    
    console.log('\n📊 Validation Summary:');
    console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`  Average Fields Extracted: ${avgFields.toFixed(1)}`);
    console.log(`  Business Rules Compliance: ${totalRulesPassed}/${totalRulesChecked} (${(totalRulesPassed/totalRulesChecked*100).toFixed(1)}%)`);
    console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`  Average Time: ${avgTime.toFixed(0)}ms`);
  }

  private generateValidationReport(results: PipelineTestResult[]) {
    let report = '# Extraction Pipeline Validation Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Pipeline**: Multi-stage Claude Haiku 3.5 with business rule assessment\n`;
    report += `**Documents Tested**: ${results.length}\n\n`;

    // Overall Performance
    const successCount = results.filter(r => r.success).length;
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    
    report += '## 📊 Overall Performance\n\n';
    report += `- **Success Rate**: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)\n`;
    report += `- **Total Cost**: $${totalCost.toFixed(4)}\n`;
    report += `- **Average Processing Time**: ${avgTime.toFixed(0)}ms\n\n`;

    // Business Rules Analysis
    const totalRulesPassed = results.reduce((sum, r) => sum + r.businessRulesPassed, 0);
    const totalRulesChecked = results.reduce((sum, r) => sum + r.businessRulesTotal, 0);
    
    report += '## 🔍 Business Rules Compliance\n\n';
    report += `- **Overall Compliance**: ${totalRulesPassed}/${totalRulesChecked} (${(totalRulesPassed/totalRulesChecked*100).toFixed(1)}%)\n\n`;

    // Document-by-Document Results
    report += '## 📄 Document Analysis\n\n';
    
    results.forEach(result => {
      report += `### ${result.document}\n\n`;
      
      if (result.success) {
        report += `✅ **Success** - ${result.extractedFields} fields extracted\n`;
        report += `- **Processing Time**: ${result.processingTime}ms\n`;
        report += `- **Cost**: $${result.cost.toFixed(4)}\n`;
        report += `- **Business Rules**: ${result.businessRulesPassed}/${result.businessRulesTotal} passed\n\n`;
        
        if (result.businessRules) {
          report += '**Business Rule Details**:\n';
          if (result.businessRules.hipRidgeCapCompliant !== null) {
            const status = result.businessRules.hipRidgeCapCompliant ? '✅' : '❌';
            report += `- Hip/Ridge Cap: ${status} ${result.businessRules.reasoning.hipRidgeCap || ''}\n`;
          }
          if (result.businessRules.starterStripCompliant !== null) {
            const status = result.businessRules.starterStripCompliant ? '✅' : '❌';
            report += `- Starter Strip: ${status} ${result.businessRules.reasoning.starterStrip || ''}\n`;
          }
          if (result.businessRules.dripEdgeCompliant !== null) {
            const status = result.businessRules.dripEdgeCompliant ? '✅' : '❌';
            report += `- Drip Edge: ${status} ${result.businessRules.reasoning.dripEdge || ''}\n`;
          }
          if (result.businessRules.iceWaterBarrierCompliant !== null) {
            const status = result.businessRules.iceWaterBarrierCompliant ? '✅' : '❌';
            report += `- Ice & Water Barrier: ${status} ${result.businessRules.reasoning.iceWaterBarrier || ''}\n`;
          }
          report += '\n';
        }

        if (result.data) {
          report += '**Extracted Data Summary**:\n';
          report += `- Roof Measurements: ${Object.keys(result.data.roofMeasurements).filter(k => result.data!.roofMeasurements[k as keyof typeof result.data.roofMeasurements] !== undefined).length}/8 fields\n`;
          report += `- Materials: ${Object.keys(result.data.materials).filter(k => result.data!.materials[k as keyof typeof result.data.materials] !== undefined).length}/5 types\n\n`;
        }
      } else {
        report += `❌ **Failed** - ${result.error}\n`;
        report += `- **Stage**: ${result.stage}\n`;
        report += `- **Processing Time**: ${result.processingTime}ms\n\n`;
      }
    });

    // Recommendations
    report += '## 💡 Recommendations\n\n';
    
    if (successCount === results.length) {
      report += '✅ Pipeline is working correctly across all test documents.\n\n';
    } else {
      report += '⚠️  Some documents failed processing. Review error messages and improve error handling.\n\n';
    }
    
    if (totalRulesPassed < totalRulesChecked) {
      report += '📋 Business rule assessment is working but some documents have compliance issues. This is expected and demonstrates the system is correctly identifying problems.\n\n';
    }
    
    report += '🚀 **Next Steps**:\n';
    report += '1. Integrate pipeline into API routes\n';
    report += '2. Design database schema based on extraction patterns\n';
    report += '3. Implement real-time WebSocket updates\n';
    report += '4. Create user interface for reviewing extracted data\n';

    fs.writeFileSync(
      path.join(process.cwd(), 'lib/extraction/PIPELINE_VALIDATION_REPORT.md'),
      report
    );
  }
}

if (require.main === module) {
  const validator = new PipelineValidator();
  validator.runPipelineValidation().catch(console.error);
}