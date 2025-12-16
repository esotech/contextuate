# Project Context

> **Purpose:** Master index for AI assistants working with this project. This is the primary entry point for all AI context.
> **Directive:** Read this file first. It is the "Brain" of the project.

---

## 1. Project Identity

**Project Name:** {YOUR_PROJECT_NAME}

**Description:** {Brief description of what this project does}

**Tech Stack:**
- **Languages:** {Language 1}, {Language 2}
- **Frameworks:** {Framework 1}, {Framework 2}
- **Infrastructure:** {Database}, {Cloud Provider}

---

## 2. Agent Framework

> **Rule:** If a specialized agent exists for your task, you MUST adopt that persona and read its specific context.

### Agent Registry
| Task Domain | Agent | Context File |
|-------------|-------|--------------|
| General Coding | Base Agent | [.context/agents/base.md](.context/agents/base.md) |
| Documentation | Docs Expert | [.context/agents/documentation-expert.md](.context/agents/documentation-expert.md) |
| Tool Usage | Tools Expert | [.context/agents/tools-expert.md](.context/agents/tools-expert.md) |
| {Custom Domain} | {Custom Agent} | [agents/{agent}.md](agents/{agent}.md) |

### How to Create Agents
If you need expertise that doesn't exist yet:
1. Load the **Tools Expert** agent.
2. Request: "Create a new agent for {domain}".
3. It will use the `agent-creator.tool.md` to generate the file in `docs/ai/agents/`.

---

## 3. Tooling Ecosystem

### Framework Tools
These tools are available to help you perform complex tasks.

| Tool | Purpose | Instruction Guide |
|------|---------|-------------------|
| **Standards Detector** | Analyze code to find patterns | [.context/tools/standards-detector.tool.md](.context/tools/standards-detector.tool.md) |
| **Quickref Generator** | Condense docs for AI usage | [.context/tools/quickref.tool.md](.context/tools/quickref.tool.md) |
| **Agent Creator** | Generate new agent personas | [.context/tools/agent-creator.tool.md](.context/tools/agent-creator.tool.md) |

### Project Tools
| Command | Description |
|---------|-------------|
| `npm test` | Run test suite |
| `npm run build` | Build production artifacts |
| `{custom command}` | {description} |

---

## 4. Standards & Conventions

### Coding Standards
**[Coding Standards](.context/standards/coding-standards.md)**
- **PHP:** `templates/standards/php.standards.md`
- **JS/TS:** `templates/standards/javascript.standards.md`
- **Python:** `templates/standards/python.standards.md`
- **Go:** `templates/standards/go.standards.md`
- **Java:** `templates/standards/java.standards.md`
(Customize these in `standards/`)

### Behavioral Guidelines
**[Behavioral Guidelines](.context/standards/behavioral-guidelines.md)**
- Verified Truth: Do not speculate.
- Minimal Intervention: Only change what is requested.

---

## 5. Documentation Strategy

> **Rule:** Store knowledge where it belongs. Do not rely on chat history.

| Content Type | Location |
|--------------|----------|
| **AI Context** | `docs/ai/` (This folder) |
| **Source Code** | `src/` |
| **Human Docs** | `docs/` |
| **Architecture** | `docs/architecture/` |
| **Services** | `docs/services/` |
| **API** | `docs/api/` |

### Multi-Session Tasks
For complex tasks that span multiple sessions, use the **Task Workflow**:
1. Read **[Task Workflow](.context/standards/task-workflow.md)**.
2. Create a folder in `docs/ai/tasks/{task-name}/`.
3. Maintain a `00-project-scope.md` and log files.

---

## 6. Key Concepts

### {Concept 1}
{Explanation of important concept}

### {Concept 2}
{Explanation of important concept}

---

## 7. Resources

- **Repository:** {URL}
- **Issue Tracker:** {URL}
- **Staging/Prod:** {URL}
