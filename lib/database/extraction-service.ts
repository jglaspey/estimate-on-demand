// Enhanced extraction service supporting the hybrid approach
// Based on actual data patterns discovered in subtasks 3.1-3.3

import { PrismaClient, ExtractionMethod } from '../../src/generated/prisma'
import { 
  ExtractionData, 
  ExtractionRequest, 
  BusinessRuleField,
  DocumentPageData 
} from '../../src/types/database'

const prisma = new PrismaClient()

export class ExtractionService {
  
  /**
   * Store full-text content for each document page
   * This supports the split-screen UI requirement from CLAUDE.md
   */
  async storeDocumentPages(
    jobId: string, 
    documentId: string, 
    pages: Array<{
      pageNumber: number
      fullText: string
      wordCount: number
      extractionMethod?: string
      confidence?: number
      width?: number
      height?: number
      imageCount?: number
    }>
  ): Promise<DocumentPageData[]> {
    
    const storedPages = await Promise.all(
      pages.map(page => 
        prisma.documentPage.create({
          data: {
            documentId,
            jobId,
            pageNumber: page.pageNumber,
            fullText: page.fullText,
            wordCount: page.wordCount,
            extractionMethod: page.extractionMethod || 'pdf-parse',
            confidence: page.confidence,
            width: page.width,
            height: page.height,
            imageCount: page.imageCount || 0
          }
        })
      )
    )

    return storedPages
  }

  /**
   * Store structured extraction results with enhanced tracking
   * Supports multiple extraction engines as discovered in testing
   */
  async storeExtraction(request: {
    jobId: string
    engineUsed: string
    extractionMethod: ExtractionMethod
    processingTime: number
    tokenUsage: { input: number; output: number; cost: number }
    cost: number
    success: boolean
    error?: string
    businessRuleFields: {
      hipRidgeCap: BusinessRuleField
      starterStrip: BusinessRuleField
      dripEdge: BusinessRuleField
      gutterApron: BusinessRuleField
      iceWaterBarrier: BusinessRuleField
    }
    sourcePages?: number[]
    textSources?: Record<string, any>
    parentExtractionId?: string
  }): Promise<ExtractionData> {

    // Calculate quality metrics based on findings from subtask 3.3
    const fieldsFound = this.calculateFieldsFound(request.businessRuleFields)
    const hasGutterApron = request.businessRuleFields.gutterApron.found
    const hasLocationData = this.checkLocationData(request.businessRuleFields)
    const hasQuantityData = this.checkQuantityData(request.businessRuleFields)
    const completionScore = this.calculateCompletionScore(request.businessRuleFields)

    const extraction = await prisma.extraction.create({
      data: {
        jobId: request.jobId,
        engineUsed: request.engineUsed,
        extractionMethod: request.extractionMethod,
        inputType: 'pdf',
        processingTime: request.processingTime,
        tokenUsage: request.tokenUsage,
        cost: request.cost,
        success: request.success,
        error: request.error,
        
        // Store business rule fields as JSON
        hipRidgeCap: request.businessRuleFields.hipRidgeCap,
        starterStrip: request.businessRuleFields.starterStrip,
        dripEdge: request.businessRuleFields.dripEdge,
        gutterApron: request.businessRuleFields.gutterApron,
        iceWaterBarrier: request.businessRuleFields.iceWaterBarrier,
        
        // Quality metrics
        completionScore,
        fieldsFound,
        confidence: this.calculateOverallConfidence(request.businessRuleFields),
        hasGutterApron,
        hasLocationData,
        hasQuantityData,
        
        // Source tracking
        sourcePages: request.sourcePages,
        textSources: request.textSources,
        
        parentExtractionId: request.parentExtractionId
      }
    })

    return extraction as ExtractionData
  }

  /**
   * Retrieve job data with full-text pages and structured extractions
   * Supports the hybrid data access pattern
   */
  async getJobWithData(jobId: string): Promise<{
    job: any
    documentPages: DocumentPageData[]
    extractions: ExtractionData[]
    latestExtraction?: ExtractionData
  }> {
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        documents: true,
        documentPages: {
          orderBy: { pageNumber: 'asc' }
        },
        extractions: {
          orderBy: { extractedAt: 'desc' }
        },
        ruleAnalyses: true
      }
    })

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    return {
      job,
      documentPages: job.documentPages,
      extractions: job.extractions,
      latestExtraction: job.extractions[0] // Most recent extraction
    }
  }

  /**
   * Search across both full-text pages and structured extractions
   * This enables the comprehensive search capability for the UI
   */
  async searchJobContent(
    jobId: string, 
    query: {
      fullTextSearch?: string
      businessRuleField?: string
      pageNumbers?: number[]
    }
  ): Promise<{
    textMatches: Array<{
      pageNumber: number
      matchedText: string
      fullText: string
    }>
    structuredMatches: Array<{
      extraction: ExtractionData
      matchedField: string
      value: any
    }>
  }> {

    const results = {
      textMatches: [] as any[],
      structuredMatches: [] as any[]
    }

    // Full-text search in document pages
    if (query.fullTextSearch) {
      const pages = await prisma.documentPage.findMany({
        where: {
          jobId,
          ...(query.pageNumbers && { pageNumber: { in: query.pageNumbers } }),
          fullText: {
            contains: query.fullTextSearch,
            mode: 'insensitive'
          }
        },
        orderBy: { pageNumber: 'asc' }
      })

      results.textMatches = pages.map(page => ({
        pageNumber: page.pageNumber,
        matchedText: this.extractMatchedText(page.fullText, query.fullTextSearch!),
        fullText: page.fullText
      }))
    }

    // Structured search in extractions
    if (query.businessRuleField) {
      const extractions = await prisma.extraction.findMany({
        where: { jobId },
        orderBy: { extractedAt: 'desc' }
      })

      // Search within JSON fields - this could be enhanced with database-specific JSON queries
      for (const extraction of extractions) {
        const fields = [
          'hipRidgeCap', 'starterStrip', 'dripEdge', 'gutterApron', 'iceWaterBarrier'
        ]
        
        for (const field of fields) {
          const fieldData = extraction[field as keyof typeof extraction] as any
          if (fieldData && this.fieldMatches(fieldData, query.businessRuleField)) {
            results.structuredMatches.push({
              extraction: extraction as ExtractionData,
              matchedField: field,
              value: fieldData
            })
          }
        }
      }
    }

    return results
  }

  /**
   * Compare extractions from different engines
   * Supports the testing and validation workflow from subtask 3.1
   */
  async compareExtractions(jobId: string): Promise<{
    extractions: ExtractionData[]
    comparison: {
      bestForGutterApron: ExtractionData | null
      bestOverall: ExtractionData | null
      costAnalysis: Record<string, number>
      performanceAnalysis: Record<string, number>
    }
  }> {
    
    const extractions = await prisma.extraction.findMany({
      where: { jobId },
      orderBy: { extractedAt: 'desc' }
    }) as ExtractionData[]

    const comparison = {
      bestForGutterApron: extractions.find(e => e.hasGutterApron) || null,
      bestOverall: extractions.reduce((best, current) => 
        current.completionScore > (best?.completionScore || 0) ? current : best
      ),
      costAnalysis: this.analyzeCosts(extractions),
      performanceAnalysis: this.analyzePerformance(extractions)
    }

    return { extractions, comparison }
  }

  // Helper methods for quality calculations

  private calculateFieldsFound(fields: Record<string, BusinessRuleField>): number {
    return Object.values(fields).filter(field => field.found).length
  }

  private checkLocationData(fields: Record<string, BusinessRuleField>): boolean {
    return Object.values(fields).some(field => field.location)
  }

  private checkQuantityData(fields: Record<string, BusinessRuleField>): boolean {
    return Object.values(fields).some(field => field.quantity && field.quantity > 0)
  }

  private calculateCompletionScore(fields: Record<string, BusinessRuleField>): number {
    const totalFields = Object.keys(fields).length
    const foundFields = this.calculateFieldsFound(fields)
    return (foundFields / totalFields) * 100
  }

  private calculateOverallConfidence(fields: Record<string, BusinessRuleField>): number {
    // This could be enhanced based on LLM confidence scores
    const foundFields = Object.values(fields).filter(f => f.found)
    if (foundFields.length === 0) return 0
    
    // Base confidence on data completeness
    return foundFields.length / Object.keys(fields).length
  }

  private extractMatchedText(fullText: string, searchTerm: string): string {
    const index = fullText.toLowerCase().indexOf(searchTerm.toLowerCase())
    if (index === -1) return ''
    
    const start = Math.max(0, index - 50)
    const end = Math.min(fullText.length, index + searchTerm.length + 50)
    return fullText.slice(start, end)
  }

  private fieldMatches(fieldData: any, searchTerm: string): boolean {
    const searchValue = JSON.stringify(fieldData).toLowerCase()
    return searchValue.includes(searchTerm.toLowerCase())
  }

  private analyzeCosts(extractions: ExtractionData[]): Record<string, number> {
    const costByEngine: Record<string, number[]> = {}
    
    extractions.forEach(e => {
      if (!costByEngine[e.engineUsed]) {
        costByEngine[e.engineUsed] = []
      }
      costByEngine[e.engineUsed].push(e.cost)
    })

    return Object.entries(costByEngine).reduce((acc, [engine, costs]) => {
      acc[engine] = costs.reduce((sum, cost) => sum + cost, 0) / costs.length
      return acc
    }, {} as Record<string, number>)
  }

  private analyzePerformance(extractions: ExtractionData[]): Record<string, number> {
    const performanceByEngine: Record<string, number[]> = {}
    
    extractions.forEach(e => {
      if (!performanceByEngine[e.engineUsed]) {
        performanceByEngine[e.engineUsed] = []
      }
      performanceByEngine[e.engineUsed].push(e.processingTime)
    })

    return Object.entries(performanceByEngine).reduce((acc, [engine, times]) => {
      acc[engine] = times.reduce((sum, time) => sum + time, 0) / times.length
      return acc
    }, {} as Record<string, number>)
  }
}

export const extractionService = new ExtractionService()