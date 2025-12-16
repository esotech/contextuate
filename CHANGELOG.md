# Changelog

All notable changes to Contextuate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-16

### Added
- **NPM Package**: Now available as `@esotech/contextuate` on npm
- **New `install` command**: Install templates (agents, standards, tools) from the global repository
  - Flag style: `contextuate install --agents archon base`
  - Subcommand style: `contextuate install agents archon base`
  - List available: `contextuate install --list`
- **Non-interactive mode for `init`**: Specify platforms directly via CLI arguments
  - `contextuate init claude cursor copilot`
  - `contextuate init all` to install all platforms
  - `--agents` flag to specify agents: `contextuate init claude --agents archon base`
- **Fuzzy platform matching**: Partial names work (e.g., `gem` matches `gemini`)
- **15 new specialized agents**:
  - `aegis` - Security and compliance
  - `atlas` - Architecture and system design
  - `chronicle` - Logging and audit trails
  - `cipher` - Cryptography and encryption
  - `crucible` - Testing and quality assurance
  - `echo` - Communication and notifications
  - `meridian` - API design and integration
  - `oracle` - Data analysis and insights
  - `sentinel` - Monitoring and alerting
  - `weaver` - Code generation and scaffolding
  - And more...
- **Framework agents**: `base`, `documentation-expert`, `tools-expert`
- **Language standards templates**: PHP, JavaScript/TypeScript, Python, Go, Java
- **Platform jump files**: Support for Claude Code, Cursor, Copilot, Windsurf, Gemini, Cline, Antigravity, Agents.ai

### Changed
- Restructured templates directory for better organization
- Agent files renamed from `.agent.md` to `.md` for simplicity
- Improved CLI help and documentation

### Removed
- Removed `.gitkeep` placeholder files from user directories

## [1.0.0] - 2025-12-01

### Added
- Initial release of Contextuate framework
- Core directory structure (`docs/ai/`)
- Basic agent system with Archon orchestrator
- `contextuate init` command (interactive mode)
- `contextuate run` command for agent execution
- `contextuate create-agent` command
- `contextuate index` command for project structure generation
- `contextuate add-context` command
- `contextuate remove` command
- Multi-session task workflow support
- Platform configuration for major AI coding assistants
