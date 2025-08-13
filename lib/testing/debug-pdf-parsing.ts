/**
 * Debug PDF Parsing
 * Check what text we're actually feeding to the models
 */

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

async function debugPdfParsing() {
  console.log('🔍 DEBUGGING PDF PARSING');
  console.log('='.repeat(50));
  
  const examplesDir = path.join(process.cwd(), 'examples');
  const testFile = 'Evans___Bob_NE_5916_estimate.pdf';
  const documentPath = path.join(examplesDir, testFile);
  
  if (!fs.existsSync(documentPath)) {
    console.log('❌ Test file not found:', testFile);
    return;
  }
  
  console.log(`📄 Analyzing: ${testFile}\n`);
  
  // Load and parse PDF
  const pdfBuffer = fs.readFileSync(documentPath);
  const pdfData = await pdf(pdfBuffer);
  
  console.log('📊 PDF Stats:');
  console.log(`  Pages: ${pdfData.numpages}`);
  console.log(`  Text Length: ${pdfData.text.length} characters`);
  console.log(`  Info: ${JSON.stringify(pdfData.info, null, 2)}`);
  
  console.log('\n📝 First 2000 characters of extracted text:');
  console.log('-'.repeat(50));
  console.log(pdfData.text.substring(0, 2000));
  console.log('-'.repeat(50));
  
  console.log('\n🔍 Looking for key terms:');
  const keyTerms = [
    'Total Area',
    'Hip / Ridge cap',
    'Starter',
    'Drip Edge',
    'Gutter',
    'Ice & water',
    'LF',
    'SF',
    'Squares'
  ];
  
  keyTerms.forEach(term => {
    const found = pdfData.text.includes(term);
    const count = (pdfData.text.match(new RegExp(term, 'gi')) || []).length;
    console.log(`  ${found ? '✅' : '❌'} "${term}" - ${count} occurrences`);
  });
  
  console.log('\n🔍 Searching for specific patterns:');
  
  // Look for area patterns
  const areaMatches = pdfData.text.match(/\d+[,.]?\d*\s*(sf|SF|sq\s*ft|square\s*feet)/gi);
  console.log(`  Area patterns found: ${areaMatches?.length || 0}`);
  if (areaMatches) {
    areaMatches.slice(0, 5).forEach(match => console.log(`    "${match}"`));
  }
  
  // Look for linear feet patterns  
  const lfMatches = pdfData.text.match(/\d+[,.]?\d*\s*(lf|LF|linear\s*feet)/gi);
  console.log(`  Linear feet patterns found: ${lfMatches?.length || 0}`);
  if (lfMatches) {
    lfMatches.slice(0, 5).forEach(match => console.log(`    "${match}"`));
  }
  
  // Look for the specific values we expect
  console.log('\n🎯 Expected values check:');
  const expectedValues = [
    '3,633',
    '3633', 
    '324.99',
    '101.32',
    '104.25',
    '37'
  ];
  
  expectedValues.forEach(val => {
    const found = pdfData.text.includes(val);
    console.log(`  ${found ? '✅' : '❌'} "${val}"`);
  });
  
  console.log('\n💡 Recommendations:');
  console.log('1. Check if pdf-parse is losing table structure');
  console.log('2. Consider using vision models with PDF images instead');
  console.log('3. Try different PDF parsing libraries');
  console.log('4. Test with OCR if PDFs are image-based');
}

if (require.main === module) {
  debugPdfParsing().catch(console.error);
}