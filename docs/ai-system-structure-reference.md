# AI Coding Assistant System Structure Reference

> **Purpose:** Comprehensive reference for AI coding assistant configuration systems to inform Contextuate multi-platform support.
> **Last Updated:** 2026-01-18
> **Research Scope:** Claude Code, Cursor, Gemini CLI, Google Antigravity/IDX, OpenAI Codex CLI, Cline

---

## Executive Summary

This document provides detailed configuration structures for major AI coding assistants. Use this reference when implementing Contextuate's multi-platform installer and symlink support.

### Quick Comparison Matrix

| Feature | Claude Code | Cursor | Gemini CLI | Codex CLI | Cline |
|---------|-------------|--------|------------|-----------|-------|
| **Instruction File** | `CLAUDE.md` | `.cursorrules` / `.cursor/rules/*.mdc` | `GEMINI.md` | `AGENTS.md` | `.clinerules` |
| **Config Folder** | `.claude/` | `.cursor/` | `.gemini/` | `.codex/` | `.clinerules/` |
| **Settings Format** | JSON | JSON | JSON | TOML | VS Code JSON |
| **Hooks System** | ✅ Full (10 events) | ✅ Full (10+ events) | ✅ Experimental | ⚠️ Notify only | ✅ Limited (4 events) |
| **MCP Support** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Custom Commands** | ✅ Markdown | ✅ Markdown | ✅ TOML | ✅ Markdown | ✅ Markdown |
| **Agent/Persona** | ✅ Subagents | ⚠️ Via rules | ⚠️ Via extensions | ✅ Skills | ⚠️ Via rules |
| **Global Config** | `~/.claude/` | `~/.cursor/` | `~/.gemini/` | `~/.codex/` | `~/Documents/Cline/` |

---

## 1. Claude Code CLI

### Configuration Hierarchy

```
~/.claude/                          # User-global
├── CLAUDE.md                       # Global instructions
├── settings.json                   # User settings
├── commands/                       # Personal slash commands
├── agents/                         # Personal subagents
└── rules/                          # User rules

project-root/
├── CLAUDE.md                       # Project instructions (team)
├── CLAUDE.local.md                 # Personal notes (gitignored)
├── .mcp.json                       # Project MCP servers
└── .claude/
    ├── CLAUDE.md                   # Alternative location
    ├── CLAUDE.local.md             # Personal (gitignored)
    ├── settings.json               # Project settings (team)
    ├── settings.local.json         # Local settings (gitignored)
    ├── rules/                      # Modular rules
    │   └── *.md
    ├── commands/                   # Custom slash commands
    │   └── *.md
    └── agents/                     # Custom subagents
        └── *.md
```

### Key Files

| File | Format | Purpose |
|------|--------|---------|
| `CLAUDE.md` | Markdown (freeform) | Project/user instructions |
| `settings.json` | JSON | Permissions, hooks, model |
| `.mcp.json` | JSON | MCP server definitions |
| `commands/*.md` | Markdown + YAML frontmatter | Custom slash commands |
| `agents/*.md` | Markdown + YAML frontmatter | Custom subagents |

### Hooks System (Full)

**Available Events:** `PreToolUse`, `PostToolUse`, `PermissionRequest`, `UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`, `PreCompact`, `SessionStart`, `SessionEnd`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "./validate.sh" }]
      }
    ]
  }
}
```

### Permissions Format

```json
{
  "permissions": {
    "allow": ["Bash(npm run:*)", "Read(~/.zshrc)"],
    "deny": ["Bash(curl:*)", "Read(./.env)"]
  }
}
```

---

## 2. Cursor IDE

### Configuration Hierarchy

```
~/.cursor/                          # User-global
├── mcp.json                        # Global MCP servers
├── hooks.json                      # Global hooks
└── extensions/                     # VS Code-style extensions

project-root/
├── .cursorrules                    # Legacy rules (deprecated)
├── .cursorignore                   # Exclude from AI
├── .cursorindexingignore           # Exclude from indexing
├── AGENTS.md                       # Alternative rules
└── .cursor/
    ├── rules/                      # Project rules (recommended)
    │   └── *.mdc                   # MDC format with frontmatter
    ├── commands/                   # Custom slash commands
    │   └── *.md
    ├── hooks.json                  # Project hooks
    └── mcp.json                    # Project MCP servers
```

### MDC Rules Format

```markdown
---
description: "TypeScript coding standards"
alwaysApply: false
globs: ["**/*.ts", "src/**/*"]
---

# TypeScript Standards

- Use strict mode
- Prefer interfaces over type aliases
```

### Frontmatter Options

| Field | Type | Purpose |
|-------|------|---------|
| `description` | string | AI relevance matching |
| `alwaysApply` | boolean | Always include in context |
| `globs` | string[] | File patterns that trigger rule |

### Hooks System (Full)

**Available Events:** `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "./scripts/validate-command.sh" }
    ],
    "afterFileEdit": [
      { "command": "npm run format -- ${file_path}" }
    ]
  }
}
```

### MCP Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "token" }
    }
  }
}
```

---

## 3. Google Gemini CLI

### Configuration Hierarchy

```
~/.gemini/                          # User-global
├── settings.json                   # User settings
├── GEMINI.md                       # Global instructions
├── commands/                       # Global custom commands (TOML)
│   └── *.toml
├── extensions/                     # Global extensions
└── .env                            # Global environment

project-root/
├── GEMINI.md                       # Project instructions
└── .gemini/
    ├── settings.json               # Project settings
    ├── GEMINI.md                   # Alternative location
    ├── commands/                   # Project commands
    │   └── *.toml
    ├── extensions/                 # Project extensions
    ├── hooks/                      # Hook scripts
    └── .env                        # Project environment
```

### Settings Precedence

1. System defaults (lowest)
2. User settings (`~/.gemini/settings.json`)
3. Project settings (`.gemini/settings.json`)
4. System override (enterprise)
5. Environment variables
6. Command-line arguments (highest)

### Custom Commands Format (TOML)

```toml
# .gemini/commands/review.toml
description = "Review code for quality"
prompt = """
Review the following code:
!{git diff --staged}

Focus on: <args>
"""
```

### Hooks System (Experimental)

**Available Events:** `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeTool`, `AfterTool`, `BeforeToolSelection`, `Notification`, `PreCompress`

```json
{
  "tools": { "enableHooks": true },
  "hooks": {
    "BeforeTool": [
      {
        "matcher": "write_file|replace_in_file",
        "hooks": [
          {
            "name": "validate",
            "type": "command",
            "command": ".gemini/hooks/validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Extensions System

```
.gemini/extensions/my-extension/
├── gemini-extension.json           # Manifest (required)
├── GEMINI.md                       # Extension context
├── commands/                       # Extension commands
└── src/                            # MCP server code
```

---

## 4. Google Antigravity / Firebase Studio

### Antigravity Configuration

```
~/.gemini/antigravity/              # Global Antigravity
├── mcp_config.json                 # MCP servers
├── skills/                         # Global skills
├── global_workflows/               # Global workflows
├── brain/                          # Persistent knowledge
└── browserAllowlist.txt            # Browser navigation

project-root/
├── .agent/                         # Project-level
│   ├── rules/                      # Project rules
│   │   └── *.md
│   ├── workflows/                  # Project workflows
│   │   └── *.md
│   └── skills/                     # Project skills
│       └── skill-name/
│           └── SKILL.md
└── .antigravity/
    └── rules.md                    # Alternative rules location
```

### SKILL.md Format

```markdown
---
name: code-review
description: Reviews code for bugs and best practices
---

# Code Review Skill

When reviewing code:
1. Check for correctness
2. Identify edge cases
3. Verify error handling
```

### Firebase Studio (Project IDX)

```
project-root/
├── .idx/
│   ├── dev.nix                     # Environment config (Nix)
│   └── airules.md                  # AI rules (highest priority)
├── GEMINI.md                       # Fallback
├── .gemini/styleguide.md           # Style guide
├── AGENTS.md                       # Cross-tool instructions
└── .cursorrules                    # Cursor compatibility
```

**Firebase Studio AI Rules Priority:**
1. `.idx/airules.md` (highest)
2. `GEMINI.md`
3. `.gemini/styleguide.md`
4. `AGENTS.md`
5. `.cursorrules`

---

## 5. OpenAI Codex CLI

### Configuration Hierarchy

```
~/.codex/                           # User-global (or $CODEX_HOME)
├── config.toml                     # Main configuration
├── AGENTS.md                       # Global instructions
├── AGENTS.override.md              # Override instructions
├── skills/                         # User skills
│   └── skill-name/
│       └── SKILL.md
├── prompts/                        # Custom slash commands
│   └── *.md
└── log/                            # Debug logs

project-root/
├── AGENTS.md                       # Project instructions
├── AGENTS.override.md              # Override instructions
└── .codex/
    └── skills/                     # Project skills
```

### AGENTS.md Discovery

1. Starts at git root
2. Walks down to current working directory
3. At each level: `AGENTS.override.md` → `AGENTS.md` → fallbacks
4. Files concatenate (later overrides earlier)
5. Combined size capped at `project_doc_max_bytes` (default 32KB)

### config.toml Format

```toml
model = "gpt-5.2-codex"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false

project_doc_max_bytes = 65536
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]

[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]

notify = ["python", "~/.codex/scripts/notify.py"]
```

### SKILL.md Format

```yaml
---
name: draft-commit-message
description: "Draft a conventional commit message"
---

Draft a conventional commit message matching format:
`type(scope): summary`
```

### Hooks System (Limited)

Only notification hooks via `notify` setting:

**Events:** `agent-turn-complete`, `approval-requested`

```toml
notify = ["bash", "-c", "afplay /System/Library/Sounds/Blow.aiff"]
```

---

## 6. Cline (VS Code Extension)

### Configuration Hierarchy

```
~/Documents/Cline/                  # User-global
├── Rules/                          # Global rules
│   └── Hooks/                      # Global hooks
└── Workflows/                      # Global workflows

project-root/
├── .clinerules                     # Single file rules
├── .clinerules/                    # Directory rules
│   ├── *.md                        # Rule files
│   ├── workflows/                  # Project workflows
│   │   └── *.md
│   └── hooks/                      # Project hooks
│       └── PreToolUse              # Script (no extension)
├── memory-bank/                    # Persistent context
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── activeContext.md
│   └── systemPatterns.md
├── cline_docs/                     # Alternative memory location
└── AGENTS.md                       # Fallback rules
```

### VS Code Extension Storage

| OS | MCP Settings Path |
|----|-------------------|
| Windows | `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| macOS | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| Linux | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |

### Hooks System (Limited)

**Available Events:** `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `TaskStart`

Hook files are scripts (no extension) in `.clinerules/hooks/` or global hooks directory.

```bash
#!/bin/bash
# .clinerules/hooks/PreToolUse
read -r input
tool_name=$(echo "$input" | jq -r '.toolName')
echo '{"cancel": false}'
```

### Workflow Format

```markdown
# Deploy Workflow

## Steps
1. Run tests: `npm test`
2. Build: `npm run build`
3. Deploy: `npm run deploy:staging`

## On Failure
- Stop deployment
- Report error details
```

---

## Feature Availability Summary

### Hooks Comparison

| Hook Event | Claude Code | Cursor | Gemini CLI | Codex CLI | Cline |
|------------|-------------|--------|------------|-----------|-------|
| PreToolUse / BeforeTool | ✅ | ✅ | ✅ | ❌ | ✅ |
| PostToolUse / AfterTool | ✅ | ✅ | ✅ | ❌ | ✅ |
| SessionStart | ✅ | ✅ | ✅ | ❌ | ❌ |
| SessionEnd | ✅ | ✅ | ✅ | ❌ | ❌ |
| BeforeShellExecution | ❌ | ✅ | ❌ | ❌ | ❌ |
| AfterFileEdit | ❌ | ✅ | ❌ | ❌ | ❌ |
| UserPromptSubmit | ✅ | ✅ | ❌ | ❌ | ✅ |
| Notification | ✅ | ❌ | ✅ | ✅ | ❌ |
| TaskStart | ❌ | ❌ | ❌ | ❌ | ✅ |

### MCP Support

All platforms support MCP with similar JSON configuration:
- **Claude Code:** `.mcp.json` (project), `~/.claude.json` (user)
- **Cursor:** `.cursor/mcp.json` (project), `~/.cursor/mcp.json` (user)
- **Gemini CLI:** `.gemini/settings.json` under `mcpServers` key
- **Codex CLI:** `~/.codex/config.toml` under `[mcp_servers.*]` sections
- **Cline:** `cline_mcp_settings.json` in VS Code globalStorage

### Custom Commands/Skills

| Platform | Location | Format | Features |
|----------|----------|--------|----------|
| Claude Code | `.claude/commands/` | Markdown + YAML | Arguments, bash execution, file refs |
| Cursor | `.cursor/commands/` | Markdown | Basic prompts |
| Gemini CLI | `.gemini/commands/` | TOML | Shell execution, file injection |
| Codex CLI | `~/.codex/prompts/` | Markdown + YAML | Arguments, placeholders |
| Cline | `.clinerules/workflows/` | Markdown | Step-by-step workflows |

---

## Contextuate Implementation Recommendations

### Symlink Strategy

For each platform, Contextuate should create symlinks from its managed files to platform-specific locations:

```
docs/ai/
├── context.md                      → (content source)
├── .contextuate/                   → (framework files)
├── agents/                         → (agent definitions)
├── standards/                      → (coding standards)
└── platform-configs/               → (generated configs)
    ├── claude/
    │   ├── CLAUDE.md              → ../../context.md (symlink or generated)
    │   └── settings.json          → (platform-specific)
    ├── cursor/
    │   └── rules/
    │       └── contextuate.mdc    → (generated from context.md)
    ├── gemini/
    │   └── GEMINI.md              → ../../context.md
    ├── codex/
    │   └── AGENTS.md              → ../../context.md
    └── cline/
        └── .clinerules            → ../../context.md
```

### Platform Detection

```bash
# Detect which platforms are in use
[ -d ".claude" ] && echo "Claude Code detected"
[ -d ".cursor" ] || [ -f ".cursorrules" ] && echo "Cursor detected"
[ -d ".gemini" ] || [ -f "GEMINI.md" ] && echo "Gemini CLI detected"
[ -d ".codex" ] || [ -f "AGENTS.md" ] && echo "Codex CLI detected"
[ -d ".clinerules" ] || [ -f ".clinerules" ] && echo "Cline detected"
```

### Feature Parity Notes

1. **Hooks:** Only Claude Code and Cursor have full hook systems. Gemini CLI hooks are experimental. Codex has notification-only. Cline has limited events (macOS/Linux only).

2. **Commands/Skills:** Each platform has different formats. Consider generating platform-specific files from a common source.

3. **AGENTS.md Standard:** OpenAI has established `AGENTS.md` as a cross-platform standard. Cursor, Cline, and Firebase Studio all detect it as a fallback.

4. **MCP:** Universal support but different config file locations and formats.

---

## Sources

### Claude Code
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/memory

### Cursor
- https://cursor.com/docs/context/rules
- https://cursor.com/docs/agent/hooks
- https://cursor.com/docs/context/model-context-protocol

### Gemini CLI
- https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html
- https://geminicli.com/docs/hooks/
- https://geminicli.com/docs/extensions/

### Google Antigravity / Firebase Studio
- https://firebase.google.com/docs/studio/set-up-gemini
- https://antigravity.google/docs/agent
- https://codelabs.developers.google.com/getting-started-google-antigravity

### OpenAI Codex CLI
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/config-reference/
- https://developers.openai.com/codex/skills/

### Cline
- https://docs.cline.bot/features/cline-rules
- https://docs.cline.bot/mcp/configuring-mcp-servers
- https://cline.bot/blog/cline-v3-36-hooks
