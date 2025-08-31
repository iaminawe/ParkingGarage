# AI Agent Usage Guide

## Overview

This project leverages two powerful AI orchestration systems to accelerate development and improve code quality:

1. **CCPM (Claude Code Package Manager)** - Project management via GitHub Issues
2. **Claude Flow** - AI swarm orchestration for parallel development

## CCPM - Project Management System

### What is CCPM?

CCPM is a project management system that integrates GitHub Issues with Git worktrees, enabling multiple AI agents to work on different features simultaneously while maintaining full traceability.

### Key Concepts

- **PRD (Product Requirements Document)**: High-level project goals
- **Epic**: Major feature or component
- **Task**: Specific implementation work
- **Issue**: GitHub issue tracking the work
- **Worktree**: Isolated Git branch for parallel work

### Getting Started with CCPM

#### Installation
```bash
# Clone CCPM to your project
git clone https://github.com/automazeio/ccpm.git .claude

# Initialize project management
/pm:init
```

#### Basic Commands

```bash
# Project Status
/pm:status              # Show current project status
/pm:standup             # Generate standup report
/pm:sync                # Sync with GitHub

# Working with Epics
/pm:epic-list           # List all epics
/pm:epic-start "Epic Name"  # Start working on an epic
/pm:epic-decompose      # Break epic into tasks
/pm:epic-status         # Check epic progress

# Working with Issues
/pm:issue-start 123     # Start working on issue #123
/pm:issue-status        # Check issue status
/pm:issue-close         # Close current issue

# One-shot Development
/pm:epic-oneshot "Build user authentication"  # AI completes entire epic
```

### CCPM Workflow Example

```bash
# 1. Create a PRD
/pm:prd-new "Parking Garage Management System"

# 2. Parse PRD into epics
/pm:prd-parse

# 3. Start an epic
/pm:epic-start "User Authentication"

# 4. Decompose into issues
/pm:epic-decompose

# 5. Work on issues
/pm:issue-start 1

# 6. Complete and sync
/pm:issue-close
/pm:sync
```

### Using Sub-Agents in CCPM

CCPM provides specialized sub-agents for optimization:

```markdown
# File Analysis
Always use the file-analyzer sub-agent when reading large files

# Code Analysis  
Always use the code-analyzer sub-agent for searching code

# Test Running
Always use the test-runner sub-agent to execute tests
```

## Claude Flow - AI Swarm Orchestration

### What is Claude Flow?

Claude Flow enables parallel AI agent execution using swarm intelligence patterns, dramatically accelerating development through coordinated multi-agent collaboration.

### Installation

```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Initialize SPARC modes
npx claude-flow@latest init --sparc
```

### SPARC Development Methodology

SPARC provides structured development phases:

1. **Specification** - Requirements analysis
2. **Pseudocode** - Algorithm design  
3. **Architecture** - System design
4. **Refinement** - Implementation
5. **Completion** - Integration

### Claude Flow Commands

#### Basic Usage
```bash
# List available modes
npx claude-flow sparc modes

# Run specific mode
npx claude-flow sparc run architect "design payment system"

# TDD workflow
npx claude-flow sparc tdd "implement user authentication"

# Batch execution
npx claude-flow sparc batch "spec,architect,coder" "build feature"

# Full pipeline
npx claude-flow sparc pipeline "complete feature implementation"
```

#### Swarm Initialization
```javascript
// Initialize swarm topology
mcp__claude-flow__swarm_init { 
  topology: "mesh",     // mesh, hierarchical, ring, star
  maxAgents: 6,
  strategy: "adaptive"
}

// Spawn agents
mcp__claude-flow__agent_spawn { type: "researcher" }
mcp__claude-flow__agent_spawn { type: "coder" }
mcp__claude-flow__agent_spawn { type: "tester" }
```

### Available AI Agents

#### Core Development Agents
- `coder` - Implementation specialist
- `reviewer` - Code review expert
- `tester` - Testing specialist
- `planner` - Strategic planning
- `researcher` - Deep research

#### Specialized Agents
- `backend-dev` - Backend API development
- `mobile-dev` - React Native specialist
- `ml-developer` - Machine learning expert
- `cicd-engineer` - CI/CD pipeline specialist
- `api-docs` - API documentation expert

#### Swarm Coordinators
- `hierarchical-coordinator` - Top-down management
- `mesh-coordinator` - Peer-to-peer collaboration
- `adaptive-coordinator` - Dynamic topology
- `byzantine-coordinator` - Fault-tolerant consensus

## Parallel Development Patterns

### Pattern 1: Feature Development Swarm

```javascript
// Single message with all operations
[Concurrent Execution]:
  // Spawn research agent
  Task("Research", "Analyze existing payment systems and best practices", "researcher")
  
  // Spawn architecture agent
  Task("Architecture", "Design payment system architecture", "system-architect")
  
  // Spawn implementation agents
  Task("Backend", "Implement payment API endpoints", "backend-dev")
  Task("Frontend", "Build payment UI components", "coder")
  Task("Database", "Design payment schema", "code-analyzer")
  
  // Spawn quality agents
  Task("Testing", "Write comprehensive tests", "tester")
  Task("Security", "Review security implications", "reviewer")
  
  // Batch todos
  TodoWrite { todos: [...10 todos...] }
```

### Pattern 2: Bug Fix Swarm

```javascript
[Bug Investigation]:
  // Analyze the bug
  Task("Investigate", "Reproduce and analyze bug #456", "code-analyzer")
  
  // Find root cause
  Task("Debug", "Identify root cause in codebase", "researcher")
  
  // Fix implementation
  Task("Fix", "Implement bug fix with tests", "coder")
  
  // Verify fix
  Task("Test", "Verify bug is fixed", "tester")
  Task("Review", "Review fix for side effects", "reviewer")
```

### Pattern 3: TDD Development

```bash
# Use SPARC TDD mode for test-driven development
npx claude-flow sparc tdd "implement reservation system"

# This automatically:
# 1. Writes failing tests
# 2. Implements minimal code
# 3. Refactors for quality
# 4. Ensures full coverage
```

## Memory and Coordination

### Claude Flow Hooks

Agents coordinate through hooks:

```bash
# Before work
npx claude-flow@alpha hooks pre-task --description "task"

# During work
npx claude-flow@alpha hooks post-edit --file "file.js"
npx claude-flow@alpha hooks notify --message "completed feature"

# After work
npx claude-flow@alpha hooks post-task --task-id "task"
```

### Persistent Memory

```javascript
// Store information
mcp__claude-flow__memory_usage {
  action: "store",
  key: "api-design",
  value: "REST endpoints specification",
  namespace: "architecture"
}

// Retrieve information
mcp__claude-flow__memory_usage {
  action: "retrieve",
  key: "api-design",
  namespace: "architecture"
}
```

## Best Practices

### 1. Batch Operations

**✅ Good: Single message with all operations**
```javascript
[Single Message]:
  Task("Agent 1", "Task 1", "coder")
  Task("Agent 2", "Task 2", "tester")
  Task("Agent 3", "Task 3", "reviewer")
  TodoWrite { todos: [...] }
  Write "file1.js"
  Write "file2.js"
```

**❌ Bad: Multiple messages**
```javascript
Message 1: Task("Agent 1", ...)
Message 2: Task("Agent 2", ...)
Message 3: TodoWrite { ... }
```

### 2. Use Appropriate Agents

```bash
# For searching code
Use: code-analyzer agent
Not: Manual grep commands

# For running tests
Use: test-runner agent
Not: Direct test execution

# For reading large files
Use: file-analyzer agent
Not: Direct file reading
```

### 3. Maintain Traceability

```bash
# Every code change should trace back:
PRD → Epic → Task → Issue → Code → Commit

# Use CCPM for tracking
/pm:issue-start 123
# ... make changes ...
/pm:issue-close
```

### 4. Leverage Parallel Execution

```javascript
// Run independent tasks simultaneously
[Parallel Tasks]:
  Task("API", "Build REST endpoints", "backend-dev")
  Task("UI", "Create React components", "coder")
  Task("DB", "Design database schema", "code-analyzer")
  Task("Docs", "Write API documentation", "api-docs")
```

## Advanced Workflows

### Multi-Agent Feature Development

```bash
# 1. Initialize swarm
mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 8 }

# 2. Create epic in CCPM
/pm:epic-start "Payment Integration"

# 3. Spawn specialized agents
[Agent Orchestra]:
  Task("Architect", "Design payment architecture", "system-architect")
  Task("Stripe Dev", "Integrate Stripe API", "backend-dev")
  Task("PayPal Dev", "Integrate PayPal API", "backend-dev")
  Task("UI Dev", "Build payment forms", "coder")
  Task("Test Lead", "Create test suite", "tester")
  Task("Security", "Audit payment security", "reviewer")

# 4. Monitor progress
mcp__claude-flow__swarm_status
/pm:epic-status

# 5. Complete and merge
/pm:epic-close
```

### Automated Code Review

```javascript
// Spawn review swarm for PR
[Code Review Swarm]:
  Task("Security Review", "Check for vulnerabilities", "reviewer")
  Task("Performance Review", "Analyze performance impact", "perf-analyzer")
  Task("Code Quality", "Check code standards", "code-analyzer")
  Task("Test Coverage", "Verify test coverage", "tester")
  Task("Documentation", "Review documentation", "api-docs")
```

### Production Deployment

```bash
# Use production validator
Task("Prod Check", "Validate production readiness", "production-validator")

# This checks:
# - All tests pass
# - Documentation complete
# - Security validated
# - Performance acceptable
# - Deployment configs ready
```

## Monitoring and Metrics

### Swarm Performance

```javascript
// Check swarm status
mcp__claude-flow__swarm_status { verbose: true }

// Agent metrics
mcp__claude-flow__agent_metrics { agentId: "coder-001" }

// Task results
mcp__claude-flow__task_results { taskId: "task-123" }
```

### Performance Analysis

```javascript
// Run benchmarks
mcp__claude-flow__benchmark_run { suite: "full" }

// Analyze bottlenecks
mcp__claude-flow__bottleneck_analyze { component: "api" }

// Token usage
mcp__claude-flow__token_usage { timeframe: "24h" }
```

## Troubleshooting

### Common Issues

#### Agents Not Coordinating
```bash
# Check swarm status
mcp__claude-flow__swarm_status

# Verify memory sync
mcp__claude-flow__memory_usage { action: "list" }

# Check coordination
mcp__claude-flow__coordination_sync
```

#### CCPM Sync Issues
```bash
# Force sync with GitHub
/pm:sync --force

# Check worktree status
git worktree list

# Clean up worktrees
/pm:clean
```

#### Performance Problems
```bash
# Optimize topology
mcp__claude-flow__topology_optimize

# Balance load
mcp__claude-flow__load_balance

# Scale swarm
mcp__claude-flow__swarm_scale { targetSize: 10 }
```

## Tips for Success

1. **Start Small**: Begin with 2-3 agents, scale up gradually
2. **Use Templates**: Leverage base-template-generator for consistency
3. **Monitor Progress**: Regular status checks prevent surprises
4. **Document Decisions**: Use memory to persist architectural choices
5. **Test Everything**: Always include tester agents in swarms
6. **Review Critical Code**: Use reviewer agents for security-sensitive code
7. **Batch Operations**: Always combine related operations in single messages

## Resources

### Documentation
- [CCPM Documentation](https://github.com/automazeio/ccpm)
- [Claude Flow Documentation](https://github.com/ruvnet/claude-flow)
- [SPARC Methodology](https://github.com/ruvnet/claude-flow/docs/sparc.md)

### Support
- CCPM Issues: https://github.com/automazeio/ccpm/issues
- Claude Flow Issues: https://github.com/ruvnet/claude-flow/issues

---

*Remember: CCPM manages projects, Claude Flow coordinates swarms, Claude Code creates!*