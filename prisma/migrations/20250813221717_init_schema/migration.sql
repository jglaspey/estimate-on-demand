-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'TEXT_EXTRACTED', 'ANALYSIS_READY', 'ANALYZING', 'REVIEWING', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AnalysisType" AS ENUM ('BUSINESS_RULES', 'COMPLIANCE', 'SUPPLEMENT', 'QUALITY_CHECK');

-- CreateEnum
CREATE TYPE "public"."RuleType" AS ENUM ('HIP_RIDGE_CAP', 'STARTER_STRIP', 'DRIP_EDGE', 'GUTTER_APRON', 'ICE_WATER_BARRIER');

-- CreateEnum
CREATE TYPE "public"."RuleStatus" AS ENUM ('PENDING', 'ANALYZING', 'PASSED', 'FAILED', 'WARNING', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."UserDecision" AS ENUM ('PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED', 'MANUAL');

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT,
    "filePath" TEXT,
    "fileHash" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "claimNumber" TEXT,
    "policyNumber" TEXT,
    "dateOfLoss" TIMESTAMP(3),
    "carrier" TEXT,
    "claimRep" TEXT,
    "estimator" TEXT,
    "originalEstimate" DOUBLE PRECISION,
    "roofSquares" DOUBLE PRECISION,
    "roofStories" INTEGER,
    "rakeLength" DOUBLE PRECISION,
    "eaveLength" DOUBLE PRECISION,
    "ridgeHipLength" DOUBLE PRECISION,
    "valleyLength" DOUBLE PRECISION,
    "roofSlope" TEXT,
    "roofMaterial" TEXT,
    "userId" TEXT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "pageCount" INTEGER,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_pages" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "markdownText" TEXT NOT NULL,
    "fullText" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extractionMethod" TEXT NOT NULL DEFAULT 'mistral-ocr',
    "confidence" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "imageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mistral_extractions" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "mistralModel" TEXT NOT NULL DEFAULT 'mistral-large-latest',
    "documentType" TEXT,
    "processingTime" INTEGER,
    "tokenUsage" JSONB,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "extractedData" JSONB NOT NULL,
    "customerName" TEXT,
    "claimNumber" TEXT,
    "pageCount" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mistral_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sonnet_analyses" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "mistralExtractionId" TEXT NOT NULL,
    "sonnetModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4',
    "analysisType" "public"."AnalysisType" NOT NULL DEFAULT 'BUSINESS_RULES',
    "processingTime" INTEGER NOT NULL,
    "tokenUsage" JSONB NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "overallAssessment" JSONB NOT NULL,
    "businessRuleEvaluations" JSONB NOT NULL,
    "complianceFindings" JSONB NOT NULL,
    "supplementRecommendations" JSONB,
    "accuracyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sonnet_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rule_analyses" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "ruleType" "public"."RuleType" NOT NULL,
    "status" "public"."RuleStatus" NOT NULL DEFAULT 'PENDING',
    "passed" BOOLEAN,
    "confidence" DOUBLE PRECISION,
    "findings" JSONB NOT NULL,
    "recommendation" TEXT,
    "reasoning" TEXT,
    "userDecision" "public"."UserDecision" NOT NULL DEFAULT 'PENDING',
    "userNotes" TEXT,
    "editedValues" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "rule_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_fileHash_key" ON "public"."jobs"("fileHash");

-- CreateIndex
CREATE INDEX "document_pages_jobId_pageNumber_idx" ON "public"."document_pages"("jobId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "document_pages_documentId_pageNumber_key" ON "public"."document_pages"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "mistral_extractions_jobId_extractedAt_idx" ON "public"."mistral_extractions"("jobId", "extractedAt");

-- CreateIndex
CREATE INDEX "sonnet_analyses_jobId_analyzedAt_idx" ON "public"."sonnet_analyses"("jobId", "analyzedAt");

-- CreateIndex
CREATE INDEX "sonnet_analyses_mistralExtractionId_idx" ON "public"."sonnet_analyses"("mistralExtractionId");

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_pages" ADD CONSTRAINT "document_pages_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_pages" ADD CONSTRAINT "document_pages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mistral_extractions" ADD CONSTRAINT "mistral_extractions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sonnet_analyses" ADD CONSTRAINT "sonnet_analyses_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sonnet_analyses" ADD CONSTRAINT "sonnet_analyses_mistralExtractionId_fkey" FOREIGN KEY ("mistralExtractionId") REFERENCES "public"."mistral_extractions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rule_analyses" ADD CONSTRAINT "rule_analyses_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
