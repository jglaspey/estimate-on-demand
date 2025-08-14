# EOD Insurance Supplement Analysis System - Workspace Guide

## 📁 Core Documentation Files

### Project Management
- **`STATUS.md`** - Current progress, next tasks, daily workflow commands
- **`CLAUDE.md`** - Development guidelines, architecture, business rules (auto-loaded by Claude Code)
- **`DEPLOYMENT.md`** - Railway hosting strategy, environment setup  
- **`USER-AUTH-GUIDANCE.md`** - Complete authentication implementation plan (Auth.js v5 + Prisma + Railway)
- **`WORKSPACE_START-HERE.md`** - This file - comprehensive workspace guide

### Code & Design Assets
- **`front-end-mockup/`** - Production-ready React prototype
  - Complete shadcn/ui component library
  - Business rule components (Hip/Ridge, Starter Strip, etc.)
  - TypeScript interfaces (essentially our database schema)
  - Mock data with dual scenarios (shortage vs adequate)

### Task Management (Task Master AI)
- **`.taskmaster/tasks/tasks.json`** - Main task database (11 tasks, 72 subtasks)
- **`.taskmaster/config.json`** - AI model configuration
- **`.taskmaster/state.json`** - Current workflow state
- **`.taskmaster/CLAUDE.md`** - Task Master integration guide (auto-loaded)

### Document Processing Architecture
- **`lib/extraction/mistral-service.ts`** - Production OCR service (Mistral OCR API)
- **`lib/extraction/mistral-extraction-engine.ts`** - Legacy vision-based extraction
- **`lib/testing/mistral-ocr-full-page-extraction.ts`** - OCR capabilities testing

## 🎯 Current System Status & Architecture

### Document Processing Pipeline - CRITICAL KNOWLEDGE
The system uses a **dual extraction architecture** with different approaches:

#### Production System (Active)
- **File**: `lib/extraction/mistral-service.ts`
- **API**: Mistral OCR API (`/v1/ocr`) - dedicated OCR endpoint
- **Cost**: ~$0.02 per document (10x cheaper than vision)
- **Processing**: Two-phase extraction
  1. **Quick Priority Fields** (1-2 pages) → Immediate UI updates
  2. **Full Document** → Complete structured data
- **Output**: Page-by-page markdown + structured JSON

#### Legacy System (For Reference)
- **File**: `lib/extraction/mistral-extraction-engine.ts`  
- **API**: Vision models (`pixtral-12b-2409`) via chat completions
- **Cost**: ~$150-300 per 1000 pages
- **Processing**: PDF → Images → Vision analysis
- **Status**: Superseded but contains valuable business rule prompts

### Two-Page Workflow System
The system implements a sophisticated **split-pane review interface**:

#### 1. Analysis Page (`/analysis/[jobId]`)
- **Purpose**: Progress tracking and basic rule status
- **File**: `app/analysis/[jobId]/page.tsx`
- **Features**: Real-time progress, rule completion status
- **Data Source**: Database rule analyses

#### 2. Job Detail Page (`/job-detail/[jobId]`) 
- **Purpose**: Interactive split-pane detailed review
- **File**: `app/job-detail/[jobId]/page.tsx`
- **Features**: 
  - Left: Business rule cards with rich decision interfaces
  - Right: Contextual document viewer with highlighting
  - Bottom: Decision tracking and supplement calculations

### Business Rule Components - UI/Data Integration
Each rule has sophisticated UI components expecting rich data:

#### Core Components
- **`HipRidgeCapCard.tsx`** - Hip/Ridge Cap analysis
- **`StarterStripCard.tsx`** - Starter Strip analysis  
- **`DripEdgeGutterApronCard.tsx`** - Edge protection analysis
- **`IceWaterBarrierCard.tsx`** - Ice & Water barrier analysis

#### Expected Data Structure
```typescript
interface RuleAnalysisResult {
  confidence: number;           // 0-1 confidence score
  reasoning: string;            // Detailed explanation
  costImpact: number;           // Dollar supplement amount
  estimateQuantity: string;     // Current estimate amount
  requiredQuantity: string;     // Required per analysis
  variance: string;             // Shortage/excess calculation
  varianceType: 'shortage' | 'adequate' | 'excess';
  materialStatus: 'compliant' | 'non-compliant';
  currentSpecification: {       // Line item details
    code: string;
    description: string;
    quantity: string;
    rate: string;
    total: string;
  };
}
```

### Current Optimization Focus (Task 20)
**Active Work**: Optimizing the two-page workflow system
- Prompt engineering for better rule analysis accuracy
- UI/UX improvements for split-pane interface
- Data integration between Mistral extraction and UI components
- Performance optimizations for document viewing

### Your Prototype is Production-Ready
1. **Database Schema**: Your `mockData.ts` interfaces ARE your database schema
2. **Component Library**: Complete shadcn/ui implementation with business-specific components
3. **Business Logic**: Sophisticated rule processing with realistic scenarios
4. **UI/UX**: Professional insurance supplement interface

### Strategic Development Path
Based on prototype analysis, we can bypass significant setup work:

**Traditional Path**: 
Project Setup → UI Design → Component Development → Business Logic

**Your Optimized Path**: 
Project Setup → Prototype Integration → Database Implementation → API Routes

### Railway Deployment Strategy
- **Web Service**: Next.js with WebSockets
- **Worker Service**: BullMQ for PDF processing
- **Managed Services**: PostgreSQL + Redis
- **Storage**: Railway volume or S3-compatible

## 🚀 Recommended Workflow

### Daily Development Commands
```bash
# Check what's next
task-master next

# Start working on a task
task-master set-status --id=<id> --status=in-progress

# Log implementation progress
task-master update-subtask --id=<id> --prompt="implementation notes"

# Complete task
task-master set-status --id=<id> --status=done
```

### Git Workflow
```bash
# Reference tasks in commits
git commit -m "feat: implement PDF upload (task-002)"

# Create PRs with task context
gh pr create --title "Complete task 1.2: User authentication" --body "Implements JWT auth system as specified in task 1.2"
```

## 📋 Current Task Priority & Progress

### Active Task: Task 20 - Optimize Two-Page Job Workflow System
**Status**: In Progress (Mid-way Complete - Major Infrastructure Issues Resolved)  
**Focus Areas**:
1. ✅ **Analysis Complete** - Dual Mistral architecture documented
2. ✅ **Infrastructure Fixed** - Critical navigation and API issues resolved
3. ✅ **Mistral OCR Verified** - Model `mistral-ocr-2505` confirmed working
4. 🔄 **Data Integration** - Connecting Mistral extraction to UI components  
5. ⏳ **UI Optimization** - Job Detail and Review Page improvements
6. ⏳ **Performance** - Code splitting, memoization, virtualization

**Recent Session Progress (August 14, 2025)**:
- ✅ Fixed critical navigation flow between dashboard → overview → review pages
- ✅ Resolved database schema mismatches in Mistral extraction service
- ✅ Updated Mistral OCR model from `mistral-ocr-latest` to `mistral-ocr-2505` 
- ✅ Disabled problematic Mistral chat completions (429 rate limit errors)
- ✅ Fixed API response parsing in job detail pages
- ✅ Verified Mistral OCR API working: 4.3s processing, ~$0.02/document, clean markdown output
- ✅ Application now running on http://localhost:3000 with working navigation

**Current State**: System is now functional end-to-end with proper OCR extraction. Ready for UI refinements and business rule integration.

### Available Tasks (Based on Dependencies)
1. **Task 1**: Project Setup (Available now - no dependencies)
2. **Task 13**: Prototype Integration (Available after Task 1)  
3. **Task 12**: Hip/Ridge Deep Dive (Available after Tasks 7 & 11)

## 🎨 Architecture Advantages

### From Prototype Analysis
- **Tailwind CSS**: Modern v3.x with complete theme system
- **Component Architecture**: Modular, reusable business rule cards
- **Type Safety**: Comprehensive TypeScript interfaces
- **Data Patterns**: Realistic mock data defines exact API structure

### Railway Benefits
- **Managed Infrastructure**: No DevOps complexity
- **Integrated Services**: PostgreSQL + Redis + Storage
- **WebSocket Support**: Real-time progress updates
- **Background Processing**: BullMQ worker service

## 🚨 Remaining Optimization Opportunities

### ✅ Recently Resolved (August 14, 2025)
- **Navigation Issues**: Fixed dashboard → job detail → review page flow
- **API Integration**: Resolved job detail API response parsing 
- **Mistral OCR Setup**: Confirmed working with `mistral-ocr-2505` model
- **Database Schema**: Fixed complex object storage in simple string/numeric fields
- **Rate Limiting**: Disabled problematic Mistral chat completions causing 429 errors

### 🔄 Current Action Items for Continued Development

#### 1. Data Flow Integration (Next Priority)
**Current Issue**: Mock data in UI doesn't match real extraction output structure.

**Action Needed**:
- Map Mistral OCR markdown output to `RuleAnalysisResult` interface
- Implement confidence scoring and cost impact calculations  
- Connect extraction results to business rule components
- Replace hardcoded mock rule analysis with real extraction data

#### 2. Prompt Engineering Enhancement  
**Opportunity**: The legacy system (`mistral-extraction-engine.ts`) has sophisticated insurance-specific prompts.

**Action Needed**: 
- Extract the valuable prompts from legacy system
- Adapt them for Claude API (since Mistral chat completions disabled)
- Generate rich `RuleAnalysisResult` objects the UI expects
- Integrate Claude SDK for business rule analysis

#### 3. Performance Optimizations
**Current Issue**: Large documents may cause UI lag in split-pane viewer.

**Action Needed**:
- Implement virtualization for document pages
- Add code splitting for rule components  
- Optimize React rendering with memoization

### Suggested Additional Documentation

#### Create `MISTRAL-EXTRACTION-GUIDE.md`
Should document:
- Exact API usage patterns for both systems
- Cost optimization strategies
- Error handling and retry logic
- Testing methodology for prompt improvements

#### Create `UI-DATA-MAPPING.md`  
Should document:
- Mapping between extraction output and UI components
- Confidence score calculation formulas
- Cost impact estimation methods
- Mock vs real data transformation patterns

#### Update `CLAUDE.md` - Business Rules Section
Should add:
- Detailed business rule prompts with expected outputs
- Confidence threshold definitions
- Evidence collection requirements
- Source text highlighting specifications

## 🔧 Next Steps

### For Continuing Task 20 Work
1. **Immediate**: Create optimized prompts generating full `RuleAnalysisResult` objects
2. **Short-term**: Implement data mapping between Mistral extraction and UI
3. **Medium-term**: Performance optimizations and user experience improvements

### For New Project Setup  
1. **Immediate**: Complete Task 1 (Project Setup) with full environment configuration
2. **Short-term**: Integrate prototype components into Next.js structure  
3. **Medium-term**: Implement backend services (database, API routes, Claude integration)

---

**Workspace Status**: ✅ **Documented and Ready for Handoff**

All critical architecture knowledge, optimization opportunities, and continuation paths are documented for seamless developer onboarding.