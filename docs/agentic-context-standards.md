# Agentic Context Files & Standards

This document lists the primary instruction/rules files and fallback behaviors for various AI coding agents and harnesses.

## Standardized Context Files

| AI Coding Agent / Harness | Primary Instruction File(s) | Fallback to `AGENTS.md`? | Notes |
| :--- | :--- | :--- | :--- |
| **Antigravity CLI** | `GEMINI.md` | **Yes** (Layers `GEMINI.md` $\rightarrow$ `AGENTS.md` $\rightarrow$ `.agent/rules/`) | Developed by Google DeepMind. |
| **Claude Code** | `CLAUDE.md` | **Yes** (Falls back if `CLAUDE.md` is missing) | Developed by Anthropic. |
| **Grok** | `AGENTS.md` | **N/A** (Primary standard) | Developed by xAI. |
| **Codex CLI** | `AGENTS.md` | **N/A** (Primary standard) | Standardized command-line coding harness. |
| **Hermes Agent** | `.hermes.md` or `HERMES.md` | **Yes** (Priority: `.hermes.md` $\rightarrow$ `HERMES.md` $\rightarrow$ `AGENTS.md` $\rightarrow$ `CLAUDE.md` $\rightarrow$ `.cursorrules`) | Developed by Nous Research. Features autonomous skill writing. |
| **OpenClaw** | `SOUL.md` (identity), `AGENTS.md` (workspace rules) | **Yes** (Uses `AGENTS.md` natively) | Proactive desktop/laptop daemon agent. |
| **OpenCode** | `AGENTS.md` | **Yes** (Natively scans for it alongside `CLAUDE.md`) | Session-based TUI coding assistant. |
| **Kimi Code** | `KIMI.md`, `.kimi/agents/`, `.kimi/skills/` | **Yes** (Supports custom references like `@AGENTS.md`) | Developed by Moonshot AI. |
| **Cursor** | `.cursorrules` | **Yes** | IDE assistant. Natively detects and reads `AGENTS.md` in the project root. |
| **Windsurf** | `.windsurfrules` | **Yes** | IDE assistant (Cascade). Natively detects and reads `AGENTS.md` at the root and subdirectories. |
| **Copilot (VS Code)** | `.github/copilot-instructions.md` | **Config** | Natively supported if setting `chat.useAgentsMdFile` is enabled. |
| **Aider** | `.aider.conf.yml`, `.aider.instruction.md` / `CONVENTIONS.md` | **Config** | Supported if added to `.aider.conf.yml` under `read:` or loaded via `--read AGENTS.md`. |
| **Supermaven** | `.supermavenrules` | **No** | Inline completion / chat assistant. |
| **Mentat** | `.mentat/`, `.mentat_config.json` | **No** | Terminal-based coding assistant. |

## Synopsis of Agentic Harnesses & Fallback Rules

1. **Antigravity CLI (Gemini)**
   * **Primary File**: `GEMINI.md`
   * **`AGENTS.md` Fallback**: **Yes** (Layers `GEMINI.md` $\rightarrow$ `AGENTS.md` $\rightarrow$ `.agent/rules/`)

2. **Claude Code**
   * **Primary File**: `CLAUDE.md`
   * **`AGENTS.md` Fallback**: **Yes** (Falls back natively if `CLAUDE.md` is absent)

3. **Hermes Agent (Nous Research)**
   * **Primary File**: `.hermes.md` or `HERMES.md`
   * **`AGENTS.md` Fallback**: **Yes** (Priority: `.hermes.md` $\rightarrow$ `HERMES.md` $\rightarrow$ `AGENTS.md` $\rightarrow$ `CLAUDE.md` $\rightarrow$ `.cursorrules`)

4. **OpenClaw**
   * **Primary File**: `SOUL.md` (for agent identity) and `AGENTS.md` (for workspace rules)
   * **`AGENTS.md` Fallback**: **Yes** (Uses `AGENTS.md` natively as its environment standard)

5. **OpenCode**
   * **Primary File**: `AGENTS.md`
   * **`AGENTS.md` Fallback**: **Yes** (Natively scans for it alongside `CLAUDE.md`)

6. **Kimi Code**
   * **Primary File**: `KIMI.md` (Also loads configuration from `.kimi/agents/` and `.kimi/skills/`)
   * **`AGENTS.md` Fallback**: **Yes** (Supports custom references like `@AGENTS.md` in chat sessions)

7. **Codex CLI / Grok**
   * **Primary File**: `AGENTS.md`
   * **`AGENTS.md` Fallback**: **N/A** (It is the primary standard)

8. **Cursor**
   * **Primary File**: `.cursorrules`
   * **`AGENTS.md` Fallback**: **Yes** (Natively detects and reads `AGENTS.md` in the project root)

9. **Windsurf**
   * **Primary File**: `.windsurfrules`
   * **`AGENTS.md` Fallback**: **Yes** (Cascade natively detects and reads `AGENTS.md` at the root and subdirectories)

10. **Aider**
    * **Primary File**: `.aider.conf.yml` and `.aider.instruction.md` / `CONVENTIONS.md`
    * **`AGENTS.md` Fallback**: **Config** (Can be auto-loaded by adding `read: [AGENTS.md]` to `.aider.conf.yml` or passing `--read AGENTS.md`)

11. **VS Code GitHub Copilot**
    * **Primary File**: `.github/copilot-instructions.md`
    * **`AGENTS.md` Fallback**: **Config** (Supported if VS Code setting `chat.useAgentsMdFile` is enabled)

12. **Supermaven**
    * **Primary File**: `.supermavenrules`
    * **`AGENTS.md` Fallback**: **No**

13. **Mentat**
    * **Primary File**: `.mentat/` (directory) and `.mentat_config.json`
    * **`AGENTS.md` Fallback**: **No**

## Interoperability Best Practice: The Single Source of Truth

To ensure compatibility across different developer machines and varying AI coding tools without duplicating files or running into cross-platform symbolic link bugs (especially on Windows), use one of the following methods:

### 1. Unified `AGENTS.md` (Simplest)
Keep only **`AGENTS.md`** at your project's root. Since modern CLI agents (Claude Code, Gemini/Antigravity CLI, Hermes, etc.) natively support `AGENTS.md` fallback, they will parse your rules automatically.

### 2. The Hook Method (Safest for Tool-Specific Requirements)
If a specific tool requires its primary file to exist, create a real text file for it containing only a hook reference pointing to the main file:

**`GEMINI.md`**
\`\`\`markdown
@AGENTS.md
\`\`\`

**`CLAUDE.md`**
\`\`\`markdown
@AGENTS.md
\`\`\`
