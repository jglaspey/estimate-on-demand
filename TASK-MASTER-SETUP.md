# Task Master Integration Setup

## Overview
We're using [Task Master AI](https://github.com/eyaltoledano/claude-task-master) for project management and task tracking instead of manual session logs. Task Master integrates with Claude and provides AI-powered task breakdown, progress tracking, and automated project management.

## Installation & Setup

### 1. Install Task Master CLI
```bash
npm install -g task-master-ai
```

### 2. Initialize in Project
```bash
cd /Users/jasonglaspey/Obsidian\ Sync\ Vaults/CopyEmpire/Copy\ Empire/Clients/Estimate\ on\ Demand/EOD-08.25-user-centric
task-master init
```

### 3. Configure AI Models
```bash
task-master models --setup
```

Set up API keys in your environment:
```bash
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here  # optional
export PERPLEXITY_API_KEY=your_key_here  # optional for research
```

## Task Master Workflow

### Daily Development Commands
```bash
# See what to work on next
task-master next

# List all tasks
task-master list

# Show task details
task-master show <task-id>

# Mark task complete
task-master set-status --id=<task-id> --status=done

# Add new task
task-master add-task "Implement user authentication"
```

### Project Management Commands
```bash
# Parse PRD and create initial tasks
task-master parse-prd PROJECT.md

# Generate sprint plan
task-master sprint-plan

# Analyze task complexity
task-master analyze-complexity

# Research specific topics
task-master research "Next.js WebSocket implementation"
```

## Integration with Development

### File Structure
Task Master creates a `.taskmaster/` directory with:
```
.taskmaster/
├── config.json          # AI model configuration
├── tasks.json           # Task database
├── docs/               # PRDs and documentation
└── generated/          # Auto-generated files
```

### Claude Code Integration
Task Master works seamlessly with Claude Code:
- Auto-detects project context
- Provides task-aware suggestions
- Tracks progress across sessions
- Maintains development history

## Project-Specific Setup

### 1. Create Initial PRD
```bash
# Copy PROJECT.md content to Task Master PRD
cp PROJECT.md .taskmaster/docs/prd.txt
```

### 2. Generate Initial Tasks
```bash
task-master parse-prd .taskmaster/docs/prd.txt
```

### 3. Set Development Priorities
```bash
# Mark critical path items
task-master set-priority --id=<task-id> --priority=high

# Set dependencies
task-master add-dependency --id=<task-id> --depends-on=<other-task-id>
```

## Benefits for EOD Project

### Automated Task Management
- **PRD Parsing**: Automatically break down project requirements into tasks
- **Dependency Tracking**: Understand what needs to be done first
- **Progress Monitoring**: See completion percentages and time estimates

### AI-Powered Insights
- **Research Integration**: Get current best practices for technical decisions
- **Complexity Analysis**: Understand which tasks are most challenging
- **Sprint Planning**: Organize work into manageable chunks

### Seamless Development
- **Context Awareness**: Tasks stay relevant to current development branch
- **Progress Persistence**: Never lose track of what you're working on
- **Automated Updates**: Task status updates based on code changes

## Usage Examples

### Starting a Development Session
```bash
# Check what's next
task-master next

# Start working on a specific task
task-master set-status --id=task-001 --status=in-progress

# Research if needed
task-master research "Railway PostgreSQL setup best practices" --id=task-001
```

### Ending a Development Session
```bash
# Mark completed work
task-master set-status --id=task-001 --status=done

# Add follow-up tasks discovered during development
task-master add-task "Add error handling for PDF upload failures" --depends-on=task-001
```

### Project Planning
```bash
# Generate comprehensive task breakdown
task-master parse-prd PROJECT.md --expand

# Create sprint plan
task-master sprint-plan --duration=2weeks

# Get complexity report
task-master analyze-complexity --output=report
```

This replaces manual session tracking with intelligent, AI-powered project management that scales with the project's complexity.