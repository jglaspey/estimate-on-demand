# PROJECT.md - Technical Planning & Architecture

## 🎯 Project Overview

**Interactive Insurance Supplement Automation System**  
Transform document analysis from batch processing to real-time, user-guided workflow where adjusters watch analysis happen and control every recommendation.

## 🏗️ Technical Architecture

### Hosting & Infrastructure Decision

**Recommended: Railway**
- **Pros**: Simple deployment, integrated PostgreSQL, automatic SSL, fair pricing
- **Database**: Native PostgreSQL (no need for external services)
- **Deployment**: Git-based, automatic builds
- **Cost**: ~$20-30/month for production-ready setup
- **Alternative**: Digital Ocean App Platform similar benefits

**Not Recommended**: 
- Supabase: Adds complexity, we only need simple database + auth
- Vercel + separate DB: More pieces to manage

### Tech Stack

**Frontend**
- Next.js 14+ (App Router)
- TypeScript for type safety  
- Tailwind CSS for styling
- WebSockets for real-time updates
- React Query for state management
- Framer Motion for smooth animations

**Backend**
- Node.js API routes (Next.js)
- Anthropic Claude SDK for document analysis
- PostgreSQL database
- BullMQ + Redis for job processing
- Multer for file uploads
- PDF-lib/PDF2pic for document processing

**Real-time Communication**
- WebSockets (ws library)
- Server-sent events as fallback
- Job progress streaming

## 📊 Database Schema Design

### Core Tables

```sql
-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) NOT NULL DEFAULT 'uploading',
  customer_name VARCHAR(255),
  property_address TEXT,
  insurance_carrier VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table  
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'estimate' | 'roof_report'
  file_path VARCHAR(500) NOT NULL,
  upload_status VARCHAR(50) DEFAULT 'pending',
  extraction_status VARCHAR(50) DEFAULT 'pending'
);

-- Extracted data table
CREATE TABLE extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  data_type VARCHAR(100) NOT NULL, -- 'job_details', 'measurements', 'line_items'
  extracted_content JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  source_document VARCHAR(255)
);

-- Business rule analysis
CREATE TABLE rule_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL, -- 'ridge_cap', 'starter_strip', etc.
  status VARCHAR(50) NOT NULL, -- 'COMPLIANT', 'SUPPLEMENT_NEEDED', 'INSUFFICIENT_DATA'
  confidence DECIMAL(3,2),
  analysis_data JSONB NOT NULL,
  recommendations JSONB,
  user_decision VARCHAR(50), -- 'accepted', 'rejected', 'modified'
  user_notes TEXT
);
```

## 🔄 System Workflow

### 1. Document Upload Phase
```
User drops files → Validation → Store in uploads/ → Create job record
```

### 2. Real-time Extraction Phase
```
Queue PDF processing → Stream results via WebSocket → Update UI progressively
```

### 3. Business Rule Analysis Phase  
```
For each rule: Extract data → Apply logic → Generate recommendation → Wait for user input
```

### 4. Report Generation Phase
```
Collect accepted recommendations → Format supplement → Generate PDF/Excel output
```

## 🎨 UI/UX Component Architecture

### Page Structure
```
/                    # Upload interface
/job/[id]           # Main analysis interface  
/job/[id]/rule/[n]  # Individual rule analysis (optional modal)
/job/[id]/report    # Final supplement report
```

### Key Components

**UploadInterface.tsx**
- Drag-and-drop file handling
- Document type validation
- Progress indicators

**JobDetailsCard.tsx**  
- Real-time field population
- Click-to-edit functionality
- Source document highlighting

**BusinessRuleCard.tsx**
- Status indicators with animations
- Evidence panels (collapsible)
- Decision controls
- Cost impact calculations

**DocumentViewer.tsx**
- PDF.js integration
- Text highlighting for evidence
- Jump-to-page functionality

**RealtimeProgress.tsx**
- WebSocket connection management
- Progress bars and status updates
- Error state handling

## 🔧 Claude SDK Integration

### Document Processing Pipeline
```javascript
// 1. PDF to text/images
const extractedContent = await processPDF(file);

// 2. Structured data extraction  
const jobDetails = await claude.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [{
    role: "user", 
    content: [
      { type: "text", text: extractionPrompt },
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: pdfImage }}
    ]
  }]
});

// 3. Business rule analysis per rule
const ruleAnalysis = await analyzeBusinessRule(extractedData, ruleName);
```

### Specialized Agents (via Claude SDK)
- **pdf-data-extractor**: Extract structured data from documents
- **gutter-apron-analyzer**: Apply gutter apron business rule
- **ridge-cap-analyzer**: Ridge cap quality analysis  
- **ice-water-barrier-analyzer**: Code compliance calculations
- **starter-strip-analyzer**: Starter strip requirements
- **supplement-report-writer**: Generate final reports

## 📡 Real-time Updates Implementation

### WebSocket Events
```javascript
// Client subscribes to job updates
socket.on('job:progress', (data) => {
  // Update progress bars, status indicators
});

socket.on('extraction:complete', (data) => {
  // Populate job details form
});

socket.on('rule:analysis', (data) => {  
  // Show business rule results
});
```

### Server-side Job Processing
```javascript
// Queue job with progress reporting
const job = await jobQueue.add('analyzeDocuments', {
  jobId,
  documents: uploadedFiles
}, {
  onProgress: (progress) => {
    io.to(jobId).emit('job:progress', progress);
  }
});
```

## 🧪 Testing Strategy

### Test Data
- Use existing sample documents in `examples/`
- Known expected outputs for validation
- Edge cases (missing data, corrupted PDFs)

### Testing Levels
1. **Unit Tests**: Business rule logic functions
2. **Integration Tests**: Claude SDK interactions
3. **E2E Tests**: Complete user workflows
4. **Performance Tests**: Large document processing

## 🚀 Deployment Plan

### Railway Setup
1. **Create Railway project**
2. **Connect GitHub repository**
3. **Configure PostgreSQL addon**
4. **Set environment variables**:
   ```
   ANTHROPIC_API_KEY=xxx
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=xxx
   ```

### File Storage
- **Development**: Local `/uploads` directory
- **Production**: Railway volumes or S3-compatible storage

## 📋 Development Phases

**Note**: Task breakdown and tracking managed via Task Master AI. Run `task-master parse-prd PROJECT.md` to generate detailed task lists.

### Phase 1: Foundation 
- Next.js project setup with TypeScript
- Database schema creation
- File upload functionality
- Basic Claude SDK integration
- Task Master integration and workflow setup

### Phase 2: Document Processing
- PDF processing pipeline
- Data extraction with structured outputs
- WebSocket real-time updates
- Job details interface

### Phase 3: Business Rules
- Individual rule analyzers
- Interactive rule cards UI
- Evidence visualization
- User decision handling

### Phase 4: Polish & Deploy
- Report generation
- Error handling & edge cases  
- Performance optimization
- Railway deployment

Use `task-master next` to see current priorities and `task-master analyze-complexity` for detailed estimates.

## 🔐 Security Considerations

- File upload validation (type, size limits)
- Input sanitization for extracted text
- Secure file storage with access controls
- API rate limiting
- Environment variable management

## 📊 Performance Targets

- **Upload**: < 30 seconds for 10MB PDF files
- **Extraction**: < 90 seconds for job details
- **Rule Analysis**: < 30 seconds per rule
- **Real-time Updates**: < 500ms WebSocket latency

## 🎯 Success Metrics

**User Experience**
- Time from upload to first insight < 2 minutes
- User acceptance rate of recommendations > 85%
- Zero manual data entry for extracted fields

**Technical Performance**  
- 99% uptime on Railway
- < 3 second page load times
- Support for 10+ concurrent users

---

**Next**: 
1. Install Task Master: `npm install -g task-master-ai`
2. Initialize project: `task-master init`  
3. Parse this PRD: `task-master parse-prd PROJECT.md`
4. Start development: `task-master next`