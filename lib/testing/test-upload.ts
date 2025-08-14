/**
 * Test Upload API Endpoint
 * Quick test to verify upload functionality works
 */

import { readFileSync } from 'fs'
import path from 'path'

async function testUpload() {
  try {
    console.log('Testing upload API endpoint...')
    
    // Read a test PDF file
    const testFile = path.join(process.cwd(), 'examples', 'boryca-est.pdf')
    const fileBuffer = readFileSync(testFile)
    
    // Create FormData
    const formData = new FormData()
    const file = new File([fileBuffer], 'boryca-est.pdf', { type: 'application/pdf' })
    formData.append('file', file)
    formData.append('jobDetails', JSON.stringify({
      propertyAddress: '123 Test St, Test City, TX 12345',
      jobReference: 'TEST-001',
      insuranceCarrier: 'Test Insurance',
      dateOfLoss: '2024-01-15'
    }))
    
    // Send upload request
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Upload successful!')
      console.log('Job ID:', result.jobId)
      console.log('Document ID:', result.documentId)
      console.log('Message:', result.message)
    } else {
      console.log('❌ Upload failed:')
      console.log('Error:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

if (require.main === module) {
  testUpload()
}