// Database types for Mistral + Sonnet 4 architecture
// Simplified schema focused on Mistral extraction + Sonnet analysis

import { 
  JobStatus, 
  DocumentStatus, 
  AnalysisType,
  RuleType, 
  RuleStatus, 
  UserDecision 
} from '@prisma/client'

// Document page with full-text content
export interface DocumentPageData {
  id: string
  documentId: string
  jobId: string
  pageNumber: number
  fullText: string
  wordCount: number
  extractedAt: Date
  extractionMethod: string // pdf-parse, ocr, manual
  confidence?: number
  width?: number
  height?: number
  imageCount: number
}

// Mistral extraction data - handles all PDF types
export interface MistralExtractionData {
  id: string
  jobId: string
  mistralModel: string // Track which Mistral model was used
  inputType: string // "text-pdf", "image-pdf", "mixed"
  processingTime: number
  tokenUsage: {
    input: number
    output: number
  }
  cost: number
  success: boolean
  error?: string
  
  // Raw Mistral output - preserve original response
  rawExtraction: any // Complete JSON response from Mistral
  
  // Structured business rule fields extracted by Mistral
  hipRidgeCap?: BusinessRuleField
  starterStrip?: BusinessRuleField
  dripEdge?: BusinessRuleField
  gutterApron?: BusinessRuleField
  iceWaterBarrier?: BusinessRuleField
  
  // Mistral quality metrics
  confidence: number // Mistral's confidence in extraction
  fieldsFound: number // Count of business rule fields found
  
  extractedAt: Date
}

// Sonnet 4 analysis of Mistral extractions
export interface SonnetAnalysisData {
  id: string
  jobId: string
  mistralExtractionId: string
  sonnetModel: string // Track Sonnet model version
  analysisType: AnalysisType
  processingTime: number
  tokenUsage: {
    input: number
    output: number
  }
  cost: number
  success: boolean
  error?: string
  
  // Sonnet analysis results
  overallAssessment: any // Sonnet's overall analysis
  businessRuleEvaluations: any // Detailed business rule evaluation
  complianceFindings: any // Compliance assessment
  supplementRecommendations?: any // Supplement recommendations
  
  // Sonnet quality scores
  accuracyScore: number // Sonnet's assessment of Mistral accuracy
  completenessScore: number // How complete the extraction is
  confidenceScore: number // Sonnet's confidence in analysis
  
  analyzedAt: Date
}

// Individual business rule field structure
export interface BusinessRuleField {
  found: boolean
  quantity?: number
  description?: string
  quality?: string
  location?: string
  coverage?: string
  material?: string
  type?: string
  calculation?: string
  codeCompliance?: boolean
  sourcePageNumber?: number
}

// Text location mapping for hybrid extraction
export interface TextLocation {
  pageNumber: number
  startIndex: number
  endIndex: number
  confidence: number
}

// Mistral extraction request
export interface MistralExtractionRequest {
  jobId: string
  documentId?: string
  mistralModel?: string // Override default Mistral model
  inputType?: string // Specify if known
  forceReextraction?: boolean
}

// Sonnet analysis request
export interface SonnetAnalysisRequest {
  jobId: string
  mistralExtractionId: string
  analysisType: AnalysisType
  sonnetModel?: string // Override default Sonnet model
}

// Combined extraction + analysis workflow
export interface ProcessingWorkflow {
  jobId: string
  mistralExtraction: MistralExtractionData
  sonnetAnalysis: SonnetAnalysisData
  combinedResults: {
    extractionAccuracy: number
    analysisQuality: number
    totalProcessingTime: number
    totalCost: number
  }
}

// Full job data with all relations
export interface JobWithData {
  id: string
  status: JobStatus
  fileName: string
  fileSize: number
  uploadedAt: Date
  processedAt?: Date
  completedAt?: Date
  error?: string
  filePath?: string
  fileHash?: string
  userId?: string
  
  documents: DocumentWithPages[]
  mistralExtractions: MistralExtractionData[]
  sonnetAnalyses: SonnetAnalysisData[]
  ruleAnalyses: RuleAnalysisData[]
}

export interface DocumentWithPages {
  id: string
  jobId: string
  fileName: string
  pageCount?: number
  status: DocumentStatus
  processedAt?: Date
  error?: string
  filePath?: string
  fileSize?: number
  mimeType?: string
  
  pages: DocumentPageData[]
}

export interface RuleAnalysisData {
  id: string
  jobId: string
  ruleType: RuleType
  status: RuleStatus
  passed?: boolean
  confidence?: number
  findings: Record<string, any>
  recommendation?: string
  reasoning?: string
  userDecision: UserDecision
  userNotes?: string
  editedValues?: Record<string, any>
  analyzedAt?: Date
  decidedAt?: Date
}

// API response types
export interface MistralExtractionResponse {
  success: boolean
  data?: MistralExtractionData
  error?: string
  processingTime: number
}

export interface SonnetAnalysisResponse {
  success: boolean
  data?: SonnetAnalysisData
  error?: string
  processingTime: number
}

export interface DocumentProcessingResponse {
  success: boolean
  document?: DocumentWithPages
  error?: string
  pagesProcessed: number
}

// Search and query types for full-text + structured search
export interface SearchQuery {
  jobId: string
  fullTextSearch?: string // Search in document pages
  structuredSearch?: BusinessRuleSearch // Search in extraction data
  pageNumbers?: number[]
}

export interface BusinessRuleSearch {
  hipRidgeCap?: Partial<BusinessRuleField>
  starterStrip?: Partial<BusinessRuleField>
  dripEdge?: Partial<BusinessRuleField>
  gutterApron?: Partial<BusinessRuleField>
  iceWaterBarrier?: Partial<BusinessRuleField>
}

export interface SearchResult {
  documentPages: DocumentPageSearchResult[]
  extractions: ExtractionSearchResult[]
  totalMatches: number
}

export interface DocumentPageSearchResult {
  page: DocumentPageData
  matchedText: string
  highlightRanges: Array<{ start: number; end: number }>
}

export interface ExtractionSearchResult {
  mistralExtraction: MistralExtractionData
  sonnetAnalysis?: SonnetAnalysisData
  matchedFields: string[]
  confidence: number
}