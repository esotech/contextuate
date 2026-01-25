# /interview - Requirements Interview Mode

Activate the SIBYL agent for iterative requirements gathering through structured questioning.

## Agent Invocation

**IMPORTANT:** Before proceeding, read and adopt the SIBYL agent persona:

**Agent Definition:** [../agents/sibyl.md](../agents/sibyl.md)

Read the agent file above, then follow its guidelines for confidence tracking, question selection, and requirements elicitation.

## Usage

```
/interview [feature or request]
```

## When to Use

Use `/interview` when you encounter:
- Vague or incomplete feature requests ("Build me a dashboard")
- Multiple possible interpretations of requirements
- Complex domains requiring discovery
- "Just build me a..." requests without clear specifications
- Features that could reasonably go many different directions
- Users who know what they want but can't articulate it yet

## When NOT to Use

Skip `/interview` when:
- Requirements are already clear and specific
- The user has provided a detailed specification
- You're doing technical research (use `/consult` instead)
- You're ready to implement (use `/orchestrate` instead)

## Workflow

```
User Request (vague)
      │
      ▼
┌─────────────┐
│   SIBYL     │  ← /interview (requirements elicitation)
│ (Interview) │
└─────┬───────┘
      │ Requirements Document
      ▼
┌─────────────┐
│   PYTHIA    │  ← /consult (technical research, optional)
│ (Research)  │
└─────┬───────┘
      │ Technical Specification
      ▼
┌─────────────┐
│   ARCHON    │  ← /orchestrate (implementation)
│(Orchestrate)│
└─────────────┘
```

## Behavior

When this skill is invoked, read the SIBYL agent definition and adopt its persona to:

1. **Initialize** - Identify domain patterns, set baseline confidence
2. **Question** - Ask targeted questions based on confidence gaps
3. **Summarize** - Update running specification after each round
4. **Conclude** - Produce requirements document when thresholds met
5. **Handoff** - Structure output for PYTHIA or ARCHON

## Examples

### Vague Feature Request
```
/interview Build me a notification system
```
SIBYL will ask:
- "What types of notifications do you need - email, push, in-app, SMS?"
- "Who triggers notifications - the system automatically, users, or admins?"
- "How urgent are different notification types?"

### Complex Domain
```
/interview We need a booking system for our spa
```
SIBYL will explore:
- Service types and durations
- Staff availability and skills
- Resource constraints (rooms, equipment)
- Booking rules and policies

### Multi-stakeholder Needs
```
/interview Add a reporting dashboard for management
```
SIBYL will discover:
- Who uses reports (executives, managers, analysts)
- What decisions reports support
- Frequency and freshness requirements
- Access control and data sensitivity

## Confidence Categories

SIBYL tracks confidence (0-100%) across:

| Category | Focus |
|----------|-------|
| **Architecture** | System structure, components, boundaries |
| **Integrations** | External systems, APIs, dependencies |
| **Data Model** | Entities, relationships, persistence |
| **Business Logic** | Rules, workflows, validations |
| **Constraints** | Performance, security, compliance, timeline |

Interview concludes when all categories reach 75% confidence (or user overrides).

## Exit Conditions

| Condition | What Happens |
|-----------|--------------|
| All categories >= 75% | Present final requirements, offer handoff |
| User approves draft | Finalize and proceed |
| "Just build it" | Document assumptions, proceed with warnings |
| No new info (3 rounds) | Summarize gaps, ask how to proceed |

## SIBYL vs PYTHIA

| Aspect | SIBYL (/interview) | PYTHIA (/consult) |
|--------|-------------------|-------------------|
| **Purpose** | Elicit requirements from users | Research technical approaches |
| **When to use** | Don't know WHAT to build | Know what, need to know HOW |
| **Question style** | "What do you need?" | "How should we build it?" |
| **Input** | Vague requests | Clear requirements |
| **Output** | Requirements document | Technical specification |
| **Model** | Opus (adaptive reasoning) | Opus (deep research) |

## Integration with Other Skills

### After /interview
```
User: /interview Build an inventory management system

SIBYL: [Asks questions, builds requirements document]

User: Looks good, but I'm not sure about the best approach for real-time sync

User: /consult Research real-time inventory sync approaches

PYTHIA: [Researches options, produces technical specification]

User: Let's go with WebSocket approach

User: /orchestrate Implement the inventory system with WebSocket sync
```

### Direct to Orchestration
For straightforward requirements that don't need technical research:

```
User: /interview Add a simple contact form

SIBYL: [Produces requirements]

User: /orchestrate Implement the contact form per requirements above
```

## Tips

1. **Be patient** - SIBYL asks multiple rounds of questions; this is by design

2. **Engage with questions** - Detailed answers raise confidence faster

3. **Say "I don't know"** - SIBYL can make reasonable assumptions and flag them

4. **Review the summary** - Each round shows updated understanding; correct early

5. **Override if needed** - Say "just build it" to proceed with assumptions flagged

6. **Provide context** - Mention existing systems, constraints, and preferences upfront

## Output

SIBYL produces a structured requirements document including:
- Executive summary
- Functional requirements by category
- Non-functional requirements
- Data model with entities and relationships
- Integration points
- Business rules
- Constraints
- Assumptions (explicitly flagged)
- Out of scope items
- Suggested next steps

---

## Contributor

This skill was conceptualized by Gregory Conroy ([@sudravirodhin](https://github.com/sudravirodhin), greg@esotech.com).
