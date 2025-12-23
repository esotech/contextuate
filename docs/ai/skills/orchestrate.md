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

## Parallel Execution

**CRITICAL: Always spawn independent agents in parallel.**

When multiple agents can work independently (no dependencies between their outputs), you MUST launch them in a single message with multiple Task tool calls:

```
Good: Single message with parallel Task calls for independent work
├── Task: atlas (find auth files)
├── Task: oracle (analyze schema)
└── Task: sentinel (security review)

Bad: Sequential Task calls when work is independent
├── Message 1: Task: atlas...
├── Message 2: Task: oracle...
└── Message 3: Task: sentinel...
```

**Parallel execution rules:**
- Identify independent tasks that don't depend on each other's output
- Launch all independent tasks in a single response
- Only serialize tasks that have true dependencies
- Use background execution (`run_in_background: true`) for long-running tasks when appropriate

## File Contention & Conflict Avoidance

When multiple agents may modify the same files, use the **Intent-First Locking Protocol**.

> **Full Protocol:** [agent-workflow.md](.contextuate/standards/agent-workflow.md#conflict-avoidance--file-locking)

### Quick Reference

**Step 1: Intent Declaration** - Before editing, agents declare intent:
```yaml
Status: PLANNING
Intent:
  - Modify: src/path/to/file.js
  - Create: src/path/to/new-file.js
```

**Step 2: Archon Validation** - Check against Active Lock Table:
- **Clear**: Lock the files, approve execution
- **Conflict**: Queue the agent until files are released

**Step 3: Resolution Options:**
| Scenario | Resolution |
|----------|------------|
| Files are free | Lock and proceed |
| Files locked by another agent | Queue and wait |
| Highly parallel work | Use Git Worktree isolation |

### Git Worktree Alternative
For highly parallel tasks where locking is too restrictive:
1. Create disposable Git worktree (branch) per agent
2. Agent works entirely within worktree
3. Agent commits and signals ready
4. **Unity** merges branch into main

## Agent Preference Order

**CRITICAL: Prefer specialist agents over general-purpose agents.**

When deciding which agent to use, follow this preference hierarchy:

1. **Custom Specialist Agents** (STRONGLY PREFERRED)
   - aegis, atlas, canvas, chronicle, chronos, cipher, crucible, echo, forge, ledger, meridian, nexus, oracle, scribe, sentinel, unity, vox, weaver
   - These have domain-specific expertise and context

2. **Built-in Specialized Agents** (Use only if no specialist fits)
   - Plan, Explore, claude-code-guide

3. **General-Purpose Agents** (AVOID unless absolutely necessary)
   - general-purpose - Only use for truly generic tasks that don't fit any specialist

**Examples:**
| Task | Wrong Choice | Right Choice |
|------|-------------|--------------|
| Find files related to auth | general-purpose | **atlas** |
| Write API documentation | general-purpose | **scribe** |
| Review code quality | Explore | **aegis** |
| Create database queries | general-purpose | **oracle** |
| Build new component | general-purpose | **forge** (scaffold) + **canvas** (UI) |

**Always ask: "Which specialist agent has domain expertise for this task?"**

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
