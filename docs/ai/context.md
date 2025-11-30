# Project Context

> **Purpose:** Master index for AI assistants working with this project. This is the primary entry point for all AI context.
> **Directive:** Read this file first. It is the "Brain" of the project.

---

## 1. Project Identity

**Project Name:** Esocontext Framework

**Description:** The source repository for the Esocontext framework, a standardized system for providing context to AI coding assistants.

**Tech Stack:**
- **Languages:** Bash (scripts), Markdown (documentation/templates), JSON (metadata).
- **Core Components:** `docs/ai/.context/` directory structure.
- **Distribution:** `install.sh` and `update.sh` scripts.

---

## 2. Agent Framework

> **Rule:** If a specialized agent exists for your task, you MUST adopt that persona and read its specific context.

### Agent Registry
| Task Domain | Agent | Context File |
|-------------|-------|--------------|
| General Coding | Base Agent | [.context/agents/base.agent.md](.context/agents/base.agent.md) |
| Documentation | Docs Expert | [.context/agents/documentation-expert.agent.md](.context/agents/documentation-expert.agent.md) |
| Tool Usage | Tools Expert | [.context/agents/tools-expert.agent.md](.context/agents/tools-expert.agent.md) |

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
| `docs/ai/.context/bin/install.sh` | Install framework in a target project |
| `docs/ai/.context/bin/update.sh` | Update framework files |

---

## 4. Standards & Conventions

### Coding Standards
**[Coding Standards](.context/standards/coding-standards.md)**
- **Bash:** See below.

#### Bash Scripting Standards
- Use `set -e` for error handling.
- Use snake_case for variables and functions.
- Quote variables to prevent word splitting.
- Use `[[ ... ]]` for tests.

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
| **Framework Source** | `docs/ai/.context/` |
| **Templates** | `docs/ai/.context/templates/` |
| **Tools** | `docs/ai/.context/tools/` |

### Multi-Session Tasks
For complex tasks that span multiple sessions, use the **Task Workflow**:
1. Read **[Task Workflow](docs/ai/.context/standards/task-workflow.md)**.
2. Create a folder in `docs/ai/tasks/{task-name}/`.
3. Maintain a `00-project-scope.md` and log files.

---

## 6. Key Concepts

### The `.context` Directory
The `docs/ai/.context/` directory is the "product". It is what gets installed into user projects. Changes here affect all users of the framework.

### Artifacts
Root files (`CLAUDE.md`, `AGENTS.md`) are treated as generated artifacts. They are pointers to `docs/ai/context.md` and should not be edited manually in user projects.

---

## 7. Resources

- **Repository:** https://github.com/esotech/esocontext
- **Website:** https://esocontext.dev
