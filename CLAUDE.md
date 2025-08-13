# CLAUDE.md - Development Guidelines

This file provides guidance to Claude Code when working with the EOD Insurance Supplement Automation System.

## 🎯 Project Context

**Interactive Insurance Supplement Analysis System**  
We're building a user-centric tool that transforms document analysis from batch processing to real-time, transparent workflow. Users watch analysis happen step-by-step and control every recommendation.

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript 5.9 + Tailwind CSS 4.x
- **Backend**: Node.js API routes with Claude SDK integration
- **Authentication**: Auth.js v5 (NextAuth) + Prisma + invite-only onboarding (see `USER-AUTH-GUIDANCE.md`)
- **Database**: PostgreSQL (via Railway) + Prisma ORM
- **Real-time**: WebSockets for live progress updates
- **Hosting**: Railway for simplified deployment
- **Document Processing**: Mistral OCR API + Claude SDK (hybrid extraction architecture)
- **Text Extraction**: Mistral OCR for page-by-page markdown extraction
- **Field Analysis**: Claude Haiku/Sonnet for business rule processing

### Key Design Principles
1. **Transparency**: Users see exactly what AI found and why
2. **Control**: Users can edit/accept/reject every recommendation  
3. **Real-time**: Progress updates via WebSockets
4. **Visual Evidence**: Highlight source data and reasoning
5. **Professional Output**: Generate client-ready supplement reports

## 🧠 Document Processing Architecture

### Hybrid Extraction Strategy
Based on extensive testing, we use a multi-layered approach:

1. **Primary: Mistral OCR** (`/v1/ocr` endpoint)
   - Page-by-page markdown text extraction 
   - Structured document annotation with JSON schemas
   - **Cost**: ~$0.02 per document
   - **Speed**: 4-5 seconds for 6-page documents
   - **Accuracy**: Superior field detection (found critical gutter apron missed by direct PDF)

2. **Secondary: Claude Vision** (fallback when needed)
   - Direct PDF processing for complex layouts
   - **Cost**: ~$0.011 per document  
   - **Speed**: 4-6 seconds per document
   - **Use case**: When OCR confidence is low

3. **Field Analysis: Claude Text Processing**
   - Business rule application on extracted text
   - **Cost**: ~$0.001 per analysis
   - **Speed**: 2-3 seconds
   - **Accuracy**: Consistent structured output

### Document Storage & Retrieval
- **Full-page text**: Each page stored as markdown in database
- **Source mapping**: Text coordinates linked to PDF positions  
- **Search capability**: Full-text search across all document text
- **Visual highlighting**: Map extracted fields back to source locations

## 🎨 Interactive Document Review UI

### Split-Pane Architecture
```
┌─ Claims Panel (Left 30%) ────┐ ┌─ Document Viewer (Right 70%) ─┐
│                              │ │                               │
│ ✓ Hip/Ridge Cap (Found)      │ │ [Formatted Text] [Raw PDF]    │
│   └─ 6 units, Standard       │ │                               │
│                              │ │ ┌─ Text View ─────────────┐   │
│ ⚠ Starter Strip (Missing)    │ │ │ ### Line Items          │   │
│   └─ Add recommendation      │ │ │ 3b. Hip/Ridge cap -     │   │
│                              │ │ │ **Standard profile**    │   │ 
│ ✓ Gutter Apron (Found)       │ │ │ composition shingles    │   │
│   └─ 171.42 LF, Aluminum     │ │ │ [HIGHLIGHTED]           │   │
│                              │ │ └─────────────────────────┘   │
│ ❌ Drip Edge (Not Found)      │ │                               │
│   └─ Needs supplement        │ │ ┌─ PDF View ──────────────┐   │
│                              │ │ │ [Raw PDF at exact       │   │
│ ❌ Ice & Water (Not Found)    │ │ │  same location with     │   │
│   └─ Calculate coverage      │ │ │  highlighting overlay]   │   │
│                              │ │ └─────────────────────────┘   │
└──────────────────────────────┘ └───────────────────────────────┘
```

### User Interaction Flow
1. **Click claim item** → Auto-scroll to source text/PDF location
2. **View evidence** → See highlighted text with reasoning
3. **Edit/Accept/Reject** → Modify extraction with full audit trail
4. **Quick confirmation** → Toggle between text and PDF views
5. **Generate supplement** → Create professional report with references

## 📋 Core Business Rules

The system implements four critical insurance supplement rules:

### 1. Hip/Ridge Cap Quality
- **Purpose**: Ensure purpose-built ridge caps vs cut 3-tab shingles
- **Standard**: ASTM D3161/D7158 compliance required
- **Logic**: Check ridge cap line items for "cut from 3 tab" descriptions

### 2. Starter Strip Quality
- **Purpose**: Universal starter courses vs inadequate cut shingles  
- **Coverage**: Must match eave length from roof report
- **Standard**: Factory adhesive strips required for wind resistance

### 3. Drip Edge & Gutter Apron
- **Purpose**: Proper edge protection at rakes (drip edge) and eaves (gutter apron)
- **Calculation**: Linear feet must match roof measurements
- **Priority**: Critical for water management compliance

### 4. Ice & Water Barrier  
- **Purpose**: Code-compliant coverage calculation
- **Formula**: Eave coverage based on soffit depth + wall thickness + roof pitch
- **Code**: IRC R905.1.2 requirements

## 🔧 Development Guidelines

### Task Master Integration
This project uses [Task Master AI](https://github.com/eyaltoledano/claude-task-master) for project management:
- **Task Breakdown**: Use `task-master parse-prd` to convert requirements into actionable tasks
- **Progress Tracking**: Update status with `task-master set-status --id=<id> --status=<status>`
- **Research Integration**: Use `task-master research` for technical guidance
- **Sprint Planning**: Organize work with `task-master sprint-plan`

### Code Organization
```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── ui/             # Shadcn components  
│   ├── upload/         # File upload interface
│   ├── analysis/       # Business rule components
│   ├── document/       # Interactive document viewer
│   │   ├── split-pane/ # Claims panel + document viewer
│   │   ├── text-view/  # Formatted markdown display
│   │   ├── pdf-view/   # Raw PDF with highlights
│   │   └── evidence/   # Source highlighting system
│   └── reports/        # Report generation
├── lib/                # Utility functions
│   ├── claude/         # Claude SDK integration
│   ├── mistral/        # Mistral OCR integration
│   ├── extraction/     # Hybrid extraction engines
│   ├── database/       # Database operations  
│   ├── pdf/           # PDF processing utilities
│   ├── coordinates/   # Text-to-PDF mapping
│   └── websockets/    # Real-time updates
└── types/             # TypeScript definitions
```

### Claude SDK Integration
- Use **Sonnet 4** for document analysis
- Implement structured outputs with specific JSON schemas
- Create specialized "agents" for each business rule
- Handle vision input for PDF pages as images
- Implement retry logic for API reliability

### Database Schema
- **jobs**: Main job tracking with status progression
- **documents**: File storage and processing status  
- **document_pages**: OCR-extracted page text (markdown format)
  - `page_number`, `markdown_text`, `dimensions`, `image_count`
  - Full-text search index for fast document search
- **extracted_fields**: Business rule field extractions
  - Links to source `document_pages` with text coordinates
  - User edit history and confidence scores
- **text_coordinates**: Mapping between extracted text and PDF positions
  - Enables highlighting and visual evidence display
- **rule_analysis**: Business rule results and user decisions
  - Audit trail of accept/edit/reject actions

### Real-time Updates
- WebSocket connection per job for live progress
- Update UI progressively as data becomes available
- Handle connection drops gracefully
- Emit structured events: `job:progress`, `extraction:complete`, `rule:analysis`

## 🎨 UI/UX Standards

### Component Patterns
- **Status Indicators**: Use consistent color coding (green/yellow/red)
- **Progressive Disclosure**: Start collapsed, expand on user interaction
- **Evidence Panels**: Always show source data and reasoning
- **Decision Controls**: Clear Accept/Edit/Reject buttons
- **Cost Impact**: Display pricing changes prominently

### User Flow Requirements
1. **Upload Phase**: Instant validation with visual feedback
2. **OCR Processing**: Real-time page-by-page text extraction with progress
3. **Field Extraction**: Business rule analysis with confidence scoring
4. **Interactive Review**: Split-pane document analysis interface
   - Click claim items to see source evidence
   - Toggle between formatted text and raw PDF views  
   - Edit/accept/reject extractions with full audit trail
   - Visual highlighting of source data and reasoning
5. **Report Generation**: Professional supplement with source references

### Accessibility
- Proper ARIA labels for screen readers
- Keyboard navigation support
- High contrast color schemes
- Loading states and error handling

## 🧪 Testing Approach

### Test Data
- Use sample documents in `examples/` folder
- Known expected outputs for validation
- Edge cases: missing data, corrupted files, unusual formats

### Testing Levels
1. **Unit**: Business rule logic functions
2. **Integration**: Claude SDK interactions and database operations
3. **E2E**: Complete user workflows from upload to report
4. **Performance**: Large file processing and concurrent users

## 📝 Coding Standards

### TypeScript
- Use strict mode with comprehensive type definitions
- Define interfaces for all data structures
- Avoid `any` type - use proper type guards

### Error Handling
- Comprehensive error boundaries in React
- Structured error responses from API
- User-friendly error messages with recovery options
- Logging for debugging and monitoring

### Performance
- Lazy load components for faster initial page load
- Optimize PDF processing with chunking
- Cache extracted data to avoid reprocessing
- Implement request deduplication

## 🚀 Deployment & Operations

### Environment Variables
```
# AI Services
ANTHROPIC_API_KEY=xxx           # Claude for field analysis
MISTRAL_API_KEY=xxx            # Mistral OCR for text extraction

# Database & Infrastructure  
DATABASE_URL=postgresql://...
AUTH_SECRET=xxx
AUTH_TRUST_HOST=true

# Authentication
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Communication
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=xxx

# Real-time Updates
NEXT_PUBLIC_WS_URL=xxx
```
See `USER-AUTH-GUIDANCE.md` for complete authentication environment setup.

### File Storage
- **Development**: Local `/uploads` directory
- **Production**: Railway volumes with backup strategy

### Monitoring
- Track job completion rates and processing times
- Monitor Claude API usage and costs
- Log user interactions for UX improvements

## 🔄 Development Workflow

### Git Commits
- Use descriptive commit messages with task ID context
- Reference Task Master task IDs: `feat: implement PDF upload (task-001)`
- Commit frequently with logical change groupings
- Update task status after significant commits

### Task Management
- Start each session with `task-master next` to prioritize work
- Use `task-master research` for technical questions before implementing
- Update task progress: `task-master set-status --id=<id> --status=in-progress`
- Mark tasks complete: `task-master set-status --id=<id> --status=done`
- Add new tasks discovered during development

### Code Reviews
- Focus on business logic accuracy
- Verify user experience flows
- Check error handling completeness
- Validate performance implications

## 🎯 Success Criteria

### User Experience
- Upload to first insight in < 2 minutes
- 85%+ user acceptance of recommendations
- Zero manual data entry for standard cases

### Technical Performance
- 99% uptime on Railway hosting
- < 3 second page load times
- Support 10+ concurrent users
- < 30 seconds per business rule analysis

## 🚫 Important Constraints

### Security
- Never store API keys in code
- Validate all file uploads (type, size, content)
- Sanitize extracted text before database storage
- Implement rate limiting on API endpoints

### Business Rules Accuracy
- Always reference source documentation for rule logic
- Maintain audit trail for all user decisions
- Provide clear justifications for recommendations
- Allow manual override with reasoning capture

## 📞 Client Communication

**Estimate on Demand (EOD)** specializes in insurance supplement analysis. They need:
- Professional output quality for client delivery
- Transparent reasoning for insurance adjuster review
- Flexibility to handle various document formats
- Reliable performance for daily business operations

---

**Remember**: This is a professional tool for expert users. Prioritize accuracy, transparency, and user control over automation shortcuts.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
