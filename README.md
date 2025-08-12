# EOD Insurance Supplement Automation System
## User-Centric Interactive Version (August 2025)

A complete rewrite focused on **interactive, transparent analysis** where users watch real-time progress as documents are processed and can verify/edit each business rule recommendation.

## 🎯 Project Vision

Transform insurance supplement analysis from a "black box" tool into an **interactive workflow** where adjusters:

1. **Upload** insurance estimate + roof report PDFs
2. **Watch** job details populate in real-time  
3. **Review** each of 4 business rules with visual evidence
4. **Accept/edit/reject** recommendations with full transparency
5. **Generate** final supplement report

## 🏗️ System Architecture

**Frontend**: Next.js with real-time updates via WebSockets  
**Backend**: Node.js API with Claude SDK integration  
**Database**: Railway PostgreSQL (or Supabase if preferred)  
**Hosting**: Railway (simplified deployment)  
**Styling**: Tailwind CSS  

## 📋 Four Core Business Rules

### 1. Hip/Ridge Cap Quality
- **Purpose**: Ensure purpose-built ridge caps vs cut 3-tab shingles
- **Standard**: ASTM D3161/D7158 compliance
- **Output**: Replace/add recommendations with cost impact

### 2. Starter Strip Quality  
- **Purpose**: Universal starter courses vs cut shingles
- **Coverage**: Full eave length calculation
- **Standard**: Factory adhesive strips required

### 3. Drip Edge & Gutter Apron
- **Purpose**: Proper edge protection at rakes (drip edge) and eaves (gutter apron)
- **Calculation**: Linear feet matching roof measurements
- **Priority**: Critical for water management

### 4. Ice & Water Barrier
- **Purpose**: Code-compliant coverage calculation
- **Formula**: Eave + valley coverage based on building code
- **Variables**: Soffit depth, wall thickness, roof pitch

## 🎨 User Experience Flow

```
Upload PDFs → Extract Job Details → Analyze Rules → Review & Edit → Generate Report
    ↓               ↓                    ↓            ↓              ↓
  30 sec         60-90 sec          2-3 min      User pace      30 sec
```

### Phase 1: Document Upload & Validation
- Drag-and-drop interface with instant validation
- Visual previews with document type confirmation
- Error handling for corrupt/wrong file types

### Phase 2: Job Details Extraction  
- **Split screen**: Document viewer + live job card
- **Real-time updates**: Watch fields populate with sources
- **Interactive**: Click any field to see extraction source
- **Manual editing**: Override any extracted value

### Phase 3: Business Rule Analysis
- **Individual rule cards** with status indicators
- **Visual evidence**: Roof diagrams, highlighted text
- **Decision transparency**: Show reasoning path
- **User controls**: Accept/edit/reject each recommendation

### Phase 4: Final Report Generation
- **Summary view**: All accepted changes
- **Cost calculations**: Line-by-line pricing
- **Professional formatting**: Ready for client delivery

## 📁 Project Structure

```
EOD-08.25-user-centric/
├── README.md              # This file - complete overview
├── PROJECT.md             # Technical planning and architecture
├── TASK-MASTER-SETUP.md   # Task Master AI integration guide
├── CLAUDE.md              # Development guidelines and rules
├── .taskmaster/           # Task Master project management
│   ├── config.json        # AI model configuration
│   ├── tasks.json         # Task database
│   └── docs/              # PRDs and documentation
├── docs/                  # Business requirements and specifications
│   ├── multiple-sirenas-charts - 6.18.25.md    # Business rules
│   └── comprehensive-extraction-requirements.md  # Data extraction specs
├── examples/              # Sample documents for testing
│   ├── leger est.pdf      # Sample insurance estimates
│   ├── leger roof.pdf     # Sample roof reports  
│   └── *.pdf             # Additional test cases
├── src/                   # Application source code (to be created)
└── config/               # Configuration files
```

## 🚀 Getting Started Tomorrow

### Current Status
✅ **Project Planning Complete** - PRD, Task Master setup, 72 subtasks defined  
✅ **Git Repository Initialized** - Clean commit with all planning work  
✅ **UI-First Dependencies** - Wireframes block implementation tasks  
✅ **Development Environment** - Multi-IDE support configured  

### Next Task: Project Setup (Task 1)
**Priority**: High | **Complexity**: 5/10 | **Dependencies**: None

Tomorrow you'll start with **Task 1: Project Setup with Next.js, TypeScript, and Tailwind CSS**

**Subtasks to complete:**
1. **1.1** - Next.js and TypeScript Project Initialization
2. **1.2** - Tailwind CSS Installation and Theme Configuration  
3. **1.3** - Project Structure and Routing Setup
4. **1.4** - Code Quality Tools Configuration
5. **1.5** - Base Component Library Setup

### Commands for Tomorrow
```bash
# See current status
task-master next

# Start working on Task 1
task-master set-status --id=1 --status=in-progress

# Complete subtasks as you go
task-master set-status --id=1.1 --status=done
task-master set-status --id=1.2 --status=done
# ... etc

# When Task 1 is complete
task-master set-status --id=1 --status=done
```

### After Task 1 Completion
Once Task 1 is done, **Task 11 (UI/UX Wireframes)** becomes available and should be prioritized to unblock all UI implementation tasks.

### Development Resources
- **Sample Documents**: `examples/` folder has real insurance PDFs for testing
- **Business Rules**: `docs/multiple-sirenas-charts - 6.18.25.md` 
- **Technical Specs**: `PROJECT.md` for architecture details
- **Task Management**: Use `task-master` commands for tracking progress

## 💡 Key Innovations

**Transparency**: Users see exactly what the AI found and why  
**Control**: Edit any recommendation before accepting  
**Real-time**: Watch analysis happen step-by-step  
**Visual**: Roof diagrams and evidence highlighting  
**Professional**: Generate client-ready supplement reports  

## 📞 Client Context

**Estimate on Demand (EOD)** specializes in insurance claim supplements, helping contractors identify missing items in insurance estimates. This system automates their expert analysis while maintaining human oversight and decision-making.

## 🔄 Development Workflow

- **Task Management** with Task Master AI for intelligent project tracking
- **Regular commits** with descriptive messages linked to task IDs
- **Progress updates** automated through `task-master` commands
- **Claude Code integration** following `CLAUDE.md` guidelines
- **AI-powered research** and complexity analysis

---

**Next Steps**: 
1. Run `task-master init` to set up project management
2. See `PROJECT.md` for technical implementation planning
3. Follow `TASK-MASTER-SETUP.md` for complete setup instructions