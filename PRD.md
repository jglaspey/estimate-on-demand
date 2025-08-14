# Product Requirements Document (PRD)
## EOD Insurance Supplement Analysis System - User-Centric Version

### Executive Summary

**Product Vision**: Transform insurance supplement analysis from batch processing into an interactive, transparent workflow where adjusters watch analysis happen in real-time and maintain complete control over every recommendation.

**Target User**: Professional insurance adjusters and contractors who need to identify missing items in insurance estimates with speed, accuracy, and full transparency.

**Success Metrics**: 
- 85%+ user acceptance rate of AI recommendations
- < 2 minutes from upload to first actionable insight  
- Zero manual data entry for extracted fields
- 99% uptime with < 3 second page loads

---

## 1. User Stories & Journey

### Primary User Persona: "Sarah the Insurance Adjuster"
- **Background**: 5+ years experience, processes 20-30 supplements weekly
- **Pain Points**: Manual data entry, opaque analysis tools, time-consuming reviews
- **Goals**: Fast, accurate analysis with full visibility into reasoning
- **Trust Factors**: Needs to see source data, edit recommendations, maintain professional credibility

### Core User Journey

```
Upload Documents → Watch Extraction → Review Business Rules → Generate Report → Deliver to Client
     ↓               ↓                    ↓                    ↓              ↓
   30 sec         90 sec              2-3 min            30 sec        Immediate
```

---

## 2. Detailed User Stories

### 2.1 Document Upload Phase
**As Sarah, I want to:**

- **US-001**: Drag and drop PDF files with instant visual feedback so I know upload succeeded
- **US-002**: See document previews before analysis to verify I uploaded the right files  
- **US-003**: Get immediate validation errors for wrong file types or corrupted PDFs
- **US-004**: Upload multiple documents simultaneously without waiting
- **US-005**: See clear progress indicators during upload process

**UI Requirements:**
- Large drop zone with visual hover states
- Document thumbnails with type badges (Estimate/Roof Report)
- Progress bars for each file upload
- Error states with clear recovery instructions
- Support for drag-and-drop from desktop/email

### 2.2 Real-Time Data Extraction Phase
**As Sarah, I want to:**

- **US-006**: Watch job details populate in real-time as AI extracts data from documents
- **US-007**: Click on any extracted field to see the source location in the document
- **US-008**: Edit any extracted value if the AI got it wrong
- **US-009**: See confidence scores so I know which fields need manual review
- **US-010**: Navigate between document pages while extraction continues

**UI Requirements:**
- Split-screen layout: PDF viewer on left, job details form on right
- Progressive field population with smooth animations
- Click-to-highlight functionality linking form fields to PDF locations
- Inline editing with save/cancel states
- Real-time progress updates via WebSocket connection

### 2.3 Business Rule Analysis Phase
**As Sarah, I want to:**

- **US-011**: Review each business rule analysis in dedicated cards with clear status indicators
- **US-012**: See visual evidence (highlighted text, diagrams) supporting each recommendation
- **US-013**: Understand the reasoning behind each recommendation in plain English
- **US-014**: Accept, reject, or modify each recommendation individually
- **US-015**: See cost impact of each recommendation before deciding
- **US-016**: Add my own notes to justify decisions for client delivery

**UI Requirements:**
- Four distinct rule cards (Ridge Cap, Starter Strip, Drip Edge, Ice & Water)
- Status indicators: Compliant (green), Supplement Needed (yellow), Insufficient Data (red)
- Expandable evidence sections with source document references
- Decision buttons: Accept/Edit/Reject with confirmation dialogs
- Cost calculator showing line item pricing changes
- Notes field for custom justifications

### 2.4 Report Generation Phase  
**As Sarah, I want to:**

- **US-017**: Review a summary of all accepted recommendations before generating the report
- **US-018**: Generate professional PDF and Excel reports ready for client delivery
- **US-019**: See total cost impact and line-by-line pricing breakdown
- **US-020**: Download reports immediately without waiting
- **US-021**: [Version 2] Email reports directly from the system

**UI Requirements:**
- Summary dashboard showing all decisions and total impact
- Report preview with professional formatting
- Multiple export formats (PDF, Excel, Word)
- [Version 2] Email integration with customizable templates
- Direct download (no queue needed for MVP)

---

## 3. Detailed UI Specifications

### 3.1 Page Structure & Navigation

```
/                           # Landing page with upload interface
/job/[id]                  # Main analysis dashboard
/job/[id]/documents        # Document viewer (modal overlay)
/job/[id]/rule/[rule-name] # Individual rule details (modal overlay)  
/job/[id]/report           # Final report generation
```

### 3.2 Component Specifications

#### UploadInterface Component
- **Layout**: Full-screen centered with large drop zone
- **States**: Default, Hover, Uploading, Success, Error
- **Features**: Multi-file support, file type validation, progress tracking
- **Focus**: Desktop-first design (mobile basic responsiveness only)

#### JobDashboard Component  
- **Layout**: Fixed header, scrollable main content, persistent sidebar
- **Sections**: Job Details, Business Rules, Documents, Actions
- **Real-time**: WebSocket connection for live updates
- **States**: Loading, Active, Complete, Error

#### BusinessRuleCard Component
- **Visual States**: 
  - Pending: Gray with spinner
  - Compliant: Green with checkmark  
  - Supplement Needed: Red with action icon (priority)
  - Insufficient Data: Orange with question mark (needs info)
- **Interactions**: Expandable details, decision buttons, notes field
- **Evidence Panel**: Collapsible section with source references

#### DocumentViewer Component
- **Features**: PDF.js integration, zoom controls, page navigation
- **Highlighting**: Dynamic text highlighting linked to form fields
- **Overlay**: Modal with semi-transparent background
- **Mobile**: Basic responsive view only (not optimized for touch)

### 3.3 Design System

#### Color Palette
- **Primary**: #2563EB (blue) - main actions, links
- **Success**: #16A34A (green) - compliant rules, success states  
- **Action Needed**: #DC2626 (red) - supplement needed, must address
- **Warning**: #D97706 (orange) - insufficient data, needs more information
- **Neutral**: #64748B (gray) - text, borders, backgrounds

#### Typography
- **Headers**: Inter Bold, 24px/20px/16px
- **Body**: Inter Regular, 14px line-height 1.5
- **Code**: JetBrains Mono, 12px
- **UI Labels**: Inter Medium, 12px uppercase

#### Layout System
- **Breakpoints**: Desktop (1024px+) primary, basic responsive for smaller screens
- **Grid**: 12-column with 16px gutters
- **Spacing**: 4px base unit (4, 8, 16, 24, 32, 48px)
- **Max Width**: 1200px for main content

---

## 4. Technical Requirements

### 4.1 Performance Standards
- **Time to First Byte**: < 200ms
- **Page Load**: < 3 seconds on 3G connection
- **Document Upload**: 10MB files upload in < 30 seconds  
- **Real-time Updates**: < 500ms WebSocket latency
- **Extraction Speed**: Job details populated within 90 seconds

### 4.2 Browser Support
- **Primary**: Chrome 100+, Safari 15+, Firefox 100+, Edge 100+
- **Mobile**: Basic functionality only (not optimized)
- **Fallbacks**: Graceful degradation for older browsers
- **JavaScript**: ES2021+ with polyfills

### 4.3 Accessibility Standards
- **WCAG**: 2.1 AA compliance minimum
- **Screen Readers**: Full compatibility with VoiceOver, NVDA, JAWS
- **Keyboard Navigation**: Complete functionality without mouse
- **Color Contrast**: 4.5:1 minimum for text, 3:1 for UI elements

### 4.4 Security Requirements  
- **File Upload**: Type validation, size limits (10MB), malware scanning
- **Data Storage**: Encryption at rest and in transit
- **API Security**: Rate limiting, authentication, input sanitization
- **Privacy**: No PII stored longer than necessary, secure deletion

---

## 5. Business Rule Specifications

### 5.1 Ridge Cap Quality Analysis
**Purpose**: Ensure purpose-built ridge caps vs. cut 3-tab shingles

**Logic Flow**:
1. Extract ridge cap line items from estimate
2. Analyze descriptions for "cut from 3-tab" or similar language
3. Check quantities against roof measurements
4. Verify ASTM compliance standards
5. Calculate replacement costs for non-compliant materials

**User Interface**:
- Status indicator based on compliance
- Evidence section showing extracted line items
- Cost comparison table (current vs. recommended)
- Recommendation with quantity and pricing

### 5.2 Starter Strip Quality Analysis  
**Purpose**: Universal starter courses vs. inadequate cut shingles

**Logic Flow**:
1. Extract starter strip line items and quantities
2. Calculate required linear footage from roof measurements
3. Verify factory adhesive strip specifications
4. Check coverage adequacy for eave length
5. Generate supplement for insufficient coverage

**User Interface**:
- Coverage map showing current vs. required footage
- Material specification comparison
- Gap analysis with visual indicators
- Recommended quantities with pricing

### 5.3 Drip Edge & Gutter Apron Analysis
**Purpose**: Proper edge protection at rakes and eaves

**Logic Flow**:  
1. Extract drip edge quantities from estimate
2. Calculate required linear feet from roof measurements
3. Differentiate between rake (drip edge) and eave (gutter apron) requirements
4. Verify coverage matches building perimeter
5. Generate supplement for missing protection

**User Interface**:
- Roof diagram showing current vs. required coverage
- Measurement breakdown by edge type
- Cost impact for additional materials
- Installation specification notes

### 5.4 Ice & Water Barrier Analysis
**Purpose**: Code-compliant coverage calculation

**Logic Flow**:
1. Extract current ice & water barrier quantities
2. Calculate required coverage based on:
   - Eave coverage (soffit depth + wall thickness + 2 feet minimum)
   - Valley coverage (36 inches minimum each side)
   - Roof pitch considerations
3. Apply local building code requirements (IRC R905.1.2)
4. Generate supplement for insufficient coverage

**User Interface**:
- Coverage calculator with input parameters
- Code reference citations
- Visual representation of required coverage areas
- Quantity and cost calculations

---

## 6. Data Requirements

### 6.1 Job Data Structure
```typescript
interface JobData {
  id: string;
  status: 'uploading' | 'extracting' | 'analyzing' | 'reviewing' | 'complete';
  customerName: string;
  propertyAddress: string;
  insuranceCarrier: string;
  claimNumber: string;
  dateOfLoss: Date;
  totalEstimateValue: number;
  supplements: SupplementItem[];
  documents: DocumentData[];
  ruleAnalysis: RuleAnalysisResult[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.2 Rule Analysis Data
```typescript
interface RuleAnalysisResult {
  ruleName: 'ridge_cap' | 'starter_strip' | 'drip_edge' | 'ice_water_barrier';
  status: 'COMPLIANT' | 'SUPPLEMENT_NEEDED' | 'INSUFFICIENT_DATA';
  confidence: number; // 0-1 scale
  evidence: EvidenceItem[];
  recommendation: RecommendationData;
  userDecision: 'accepted' | 'rejected' | 'modified' | null;
  userNotes: string;
  costImpact: number;
}
```

### 6.3 Extracted Data Schema
```typescript
interface ExtractedData {
  jobDetails: {
    customerName: string;
    propertyAddress: string;
    insuranceInfo: InsuranceData;
    roofMeasurements: RoofMeasurements;
  };
  lineItems: EstimateLineItem[];
  roofReport: RoofReportData;
  confidence: ConfidenceScores;
}
```

---

## 7. Integration Requirements

### 7.1 LLM Integration ✅ **IMPLEMENTED**
- **Primary Model**: Mistral OCR API for document text extraction
- **Secondary Model**: Mistral Large for business rule analysis
- **Processing**: PDF to base64 → OCR API → structured JSON extraction
- **Error Handling**: Retry logic with exponential backoff implemented
- **Cost Management**: ~$0.02 per document processing cost
- **Performance**: 4-5 seconds for complete 6-page document extraction

### 7.2 Database Integration
- **Primary**: PostgreSQL with JSONB for flexible data storage
- **Tables**: jobs, documents, extracted_data, rule_analysis
- **Performance**: Indexed queries, connection pooling
- **Backup**: Automated daily backups with point-in-time recovery

### 7.3 File Storage
- **Development**: Local file system with organized directory structure
- **Production**: Railway local volumes (same server as hosting)
- **Security**: Signed URLs, access controls, automatic cleanup
- **Processing**: PDF to image conversion, text extraction

---

## 8. Success Criteria & Validation

### 8.1 User Experience Metrics
- **Task Completion**: 95% of users complete full analysis workflow
- **Time Efficiency**: Average job analysis < 5 minutes end-to-end
- **User Satisfaction**: 4.5/5 average rating in usability testing
- **Error Recovery**: < 1% of jobs fail due to system errors

### 8.2 Business Metrics  
- **Adoption**: 80% of existing EOD customers migrate within 3 months
- **Accuracy**: 90% of AI recommendations accepted by users
- **Throughput**: System handles 100+ concurrent jobs
- **Revenue**: 25% increase in EOD processing capacity

### 8.3 Technical Validation
- **Performance**: All performance targets met under load testing
- **Reliability**: 99.9% uptime over 30-day periods
- **Security**: Passes third-party security audit
- **Scalability**: Linear performance scaling to 10x current load

---

## 9. Implementation Phases

### Phase 1: Foundation & Upload (Weeks 1-2) ✅ **COMPLETE**
- ✅ Project setup with Next.js, TypeScript, Tailwind
- ✅ File upload interface with validation
- ✅ Complete database schema and API routes
- ✅ Document storage and processing pipeline

### Phase 2: Data Extraction & UI (Weeks 3-4) ✅ **COMPLETE**
- ✅ Mistral OCR integration implemented and working
- ✅ Real-time job status updates via API polling
- ✅ Priority field extraction (< 30 seconds)
- ✅ Job details auto-population from extracted data

### Phase 3: Business Rules & Analysis (Weeks 5-6) 🔄 **IN PROGRESS**
- 🔄 Business rule foundation in place (data structures ready)
- ⏳ Business rule UI components with evidence panels
- ⏳ User decision handling and cost calculations
- ⏳ Rule analysis workflow integration

### Phase 4: Reports & Polish (Weeks 7-8) ⏳ **PLANNED**
- ⏳ Report generation in multiple formats
- ⏳ Email integration and delivery system
- ⏳ Error handling and edge cases
- ⏳ Performance optimization and testing

### Phase 5: Deploy & Monitor (Week 9) ⏳ **PLANNED**
- ⏳ Railway deployment with PostgreSQL
- ⏳ Production environment setup
- ⏳ Monitoring and logging implementation
- ⏳ User acceptance testing and feedback

---

## 10. Risk Management

### High-Risk Items
1. **LLM API Reliability**: Implement robust retry logic and fallback strategies
2. **PDF Processing Complexity**: Test with diverse document formats and edge cases  
3. **Real-time Performance**: Load testing with concurrent users and large files
4. **User Adoption**: Early user feedback and iterative UI improvements

### Mitigation Strategies
- **API Failures**: Multiple provider support, graceful degradation
- **Performance Issues**: Caching, optimization, horizontal scaling
- **Data Loss**: Regular backups, transaction logging, recovery procedures
- **Security Breaches**: Regular audits, input validation, access controls

---

## Appendices

### A. Wireframe Sketches
*[To be added during UI design phase]*

### B. Technical Architecture Diagrams  
*[Reference existing PROJECT.md diagrams]*

### C. Sample Documents & Test Cases
*[Use existing examples/ folder content]*

### D. Competitive Analysis
*[Current manual processes vs. competitor tools]*

---

**Document Status**: v2.0 - Updated with Current Implementation ✅  
**Last Updated**: 2025-08-14  
**Task Breakdown**: 11 main tasks → 72 subtasks via Task Master AI  
**Current Phase**: Phase 3 (Business Rules) - Phases 1 & 2 Complete  

**Implementation Status**: Core document processing pipeline fully operational. Upload → OCR extraction → priority field population → database storage working end-to-end. Ready for business rule analysis implementation and UI enhancement.