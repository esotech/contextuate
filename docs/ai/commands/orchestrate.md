# /orchestrate - Orchestrator Mode Skill

Activate ARCHON orchestrator mode for coordinated multi-agent task execution.

## Usage

```
/orchestrate [task description]
```

## Behavior

When this skill is invoked, Claude will:

1. **Analyze the task** to identify required domains and complexity
2. **Delegate to specialist agents** rather than implementing directly
3. **Coordinate handoffs** between agents for dependent tasks
4. **Synthesize results** into a cohesive solution

## Available Specialist Agents

| Agent | Domain | Use For |
|-------|--------|---------|
| **aegis** | Quality/Review | Code review, best practices |
| **atlas** | Navigation | Codebase exploration, file search |
| **canvas** | Frontend/UX | UI components, design systems |
| **chronicle** | Documentation | Technical writing, changelogs |
| **chronos** | Data/State | Database admin, caching, state |
| **cipher** | Data Transform | Data utilities, formatting |
| **crucible** | Testing | Test writing, coverage |
| **echo** | Frontend JS | JavaScript, client-side interactions |
| **forge** | Infrastructure | Scaffolding, DevOps, deployment |
| **ledger** | Task Mgmt | Multi-step tasks, progress tracking |
| **meridian** | Schema | Database migrations |
| **nexus** | Backend | Services, APIs, business logic |
| **oracle** | Database | Complex queries, schema design |
| **scribe** | Docs | API docs, user guides |
| **sentinel** | Security | Validation, permissions, security |
| **unity** | Version Control | Git, merges, releases |
| **vox** | Media | WebRTC, streaming, audio/video |
| **weaver** | Controllers | Page actions, views, permissions |

## Examples

### Multi-domain feature
```
/orchestrate Add a new API endpoint with database query, validation, and tests
```
Result: Delegates to oracle (query), nexus (API), sentinel (validation), crucible (tests)

### Code review workflow
```
/orchestrate Review the authentication module for security issues and suggest improvements
```
Result: Delegates to atlas (find files), sentinel (security analysis), aegis (code review)

### Documentation task
```
/orchestrate Document the monitor feature architecture and create API reference
```
Result: Delegates to chronicle (architecture doc), scribe (API reference)

## Orchestration Rules

1. **Never implement directly** - Always delegate to specialist agents
2. **Provide context** - Give agents specific file paths and patterns to follow
3. **Track complex tasks** - Use ledger for multi-step work
4. **Synthesize results** - Combine agent outputs into cohesive solution
5. **Keep context clean** - Delegate to subagents to preserve main context window

## Decision Tree

```
Is this a simple, single-domain task?
├── YES → Delegate to single specialist
└── NO → Break down and coordinate multiple specialists

Does it require exploration first?
├── YES → Start with atlas for navigation
└── NO → Proceed to implementation agents

Is this multi-step?
├── YES → Engage ledger for tracking
└── NO → Direct delegation

Should we review the result?
├── YES → aegis for quality, crucible for tests
└── NO → Deliver directly
```
