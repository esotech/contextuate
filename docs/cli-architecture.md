# Contextuate CLI Architecture

This document describes how the Contextuate CLI parses and executes commands. Use this as a reference when building new features or commands.

## Overview

Contextuate uses the [commander](https://www.npmjs.com/package/commander) library (v14.0.2) for CLI argument parsing and command registration. The architecture follows a modular pattern with:

- **Entry Point:** `src/index.ts` - Command registration and program initialization
- **Command Handlers:** `src/commands/*.ts` - Individual command implementations
- **Utilities:** `src/utils/*.ts` - Shared helper functions
- **Runtime:** `src/runtime/*.ts` - Agent execution engine

## Entry Point

**File:** `src/index.ts`

```typescript
import { Command } from 'commander';

const program = new Command();

program
    .name('contextuate')
    .version(/* loaded from package.json */);

// Commands registered here...

program.parse();
```

The entry point:
1. Creates a `commander.Command()` instance
2. Sets program name and version
3. Registers all commands with their options/arguments
4. Calls `program.parse()` to process CLI input

## Command Registration Pattern

All commands follow this registration pattern:

```typescript
program
    .command('command-name [optional-arg] <required-arg>')
    .alias('shortname')
    .description('Human-readable description')
    .option('-f, --flag', 'Boolean flag description')
    .option('-v, --value <val>', 'Option with required value')
    .option('-l, --list <items...>', 'Variadic option (array)')
    .argument('[name]', 'Positional argument description')
    .action(handlerFunction);
```

### Argument Types

| Syntax | Type | Example |
|--------|------|---------|
| `<arg>` | Required | `contextuate run <agent>` |
| `[arg]` | Optional | `contextuate create-agent [name]` |
| `[args...]` | Variadic (array) | `contextuate init [platforms...]` |

### Option Types

| Syntax | Type | Example |
|--------|------|---------|
| `-f, --flag` | Boolean | `--force` |
| `-d, --depth <n>` | Single value | `--depth 5` |
| `-a, --agents <names...>` | Array | `--agents archon forge` |

## Handler Function Signature

Command handlers receive arguments in order, followed by an options object:

```typescript
async function commandHandler(
    positionalArg: string,           // First argument
    variadicArg: string[],           // Variadic argument (if any)
    options: {                       // Options object (always last)
        force?: boolean;
        depth?: string;
        agents?: string[];
    }
): Promise<void>
```

**Important:** When a command has only options (no positional arguments), the handler receives the options object as the first parameter.

## Available Commands

### `init [platforms...]`

**Handler:** `src/commands/init.ts`

Initializes Contextuate in the current project.

```bash
contextuate init                    # Interactive mode
contextuate init claude cursor      # Non-interactive with platforms
contextuate init -a archon forge    # With specific agents
contextuate init -f                 # Force overwrite
```

**Options:**
- `-f, --force` - Overwrite existing files
- `-a, --agents <agents...>` - Install specific agents

**Flow:**
1. Check for project markers (.git, package.json, etc.)
2. Select platforms (interactive or via arguments)
3. Select agents to install
4. Create directory structure
5. Copy templates and create symlinks

### `test-init [platforms...]`

**Handler:** `src/commands/test-init.ts`

Development helper that recreates `./contextuate-test` from the current working
directory and runs the real `init` command inside it.

```bash
contextuate-test                 # Interactive init fixture
contextuate-test all --force     # Non-interactive fixture
contextuate test-init claude     # Same behavior through the main CLI
```

**Flow:**
1. Remove the existing `contextuate-test/` directory
2. Recreate it with a minimal `package.json` project marker
3. Change into the fixture directory
4. Delegate to `initCommand` with the provided platform arguments
5. Restore the original working directory

### `remove`

**Handler:** `src/commands/remove.ts`

Removes Contextuate files that haven't been modified.

```bash
contextuate remove
```

**Flow:**
1. Calculate SHA256 hashes of installed files
2. Compare against original template hashes
3. Only remove files that match (preserves customizations)

### `create-agent [name]`

**Handler:** `src/commands/create.ts`

**Alias:** `new-agent`

Creates a new custom agent definition.

```bash
contextuate create-agent                    # Interactive
contextuate create-agent my-agent           # With name
contextuate create-agent my-agent -d "..."  # With description
```

**Options:**
- `-d, --description <text>` - Agent description

**Validation:** Name must match `/^[a-z0-9-]+$/` (kebab-case)

### `index`

**Handler:** `src/commands/index.ts`

Generates a project structure index for AI context.

```bash
contextuate index              # Default depth 5
contextuate index -d 3         # Custom depth
contextuate index -f           # Force overwrite
```

**Options:**
- `-d, --depth <number>` - Maximum tree depth (default: 5)
- `-f, --force` - Overwrite existing index

**Output:** `docs/ai/project-structure.md`

### `add-context`

**Handler:** `src/commands/context.ts`

Interactive tool to add files to the project context.

```bash
contextuate add-context
```

**Flow:**
1. Display action menu
2. Prompt for file path (with validation)
3. Append file content to `context.md` with metadata

### `run <agent>`

**Handler:** `src/commands/run.ts`

Executes an agent with optional isolation.

```bash
contextuate run archon                      # Run agent
contextuate run archon --dry-run            # Simulate only
contextuate run archon --goal "Fix bugs"    # With instructions
contextuate run archon --task my-task       # Load task context
contextuate run archon --isolation worktree # Git worktree isolation
```

**Options:**
- `--dry-run` - Simulate without executing
- `--isolation <mode>` - Isolation mode (worktree, none)
- `--goal <text>` - Instructions for agent
- `--task <name>` - Load task context from `docs/ai/tasks/`

**Flow:**
1. Locate agent file at `docs/ai/agents/{agent}.md`
2. Parse YAML frontmatter with `gray-matter`
3. Set up Git worktree if isolation enabled
4. Load and validate context files
5. Execute via LLMDriver or display dry-run output

### `install`

**Handler:** `src/commands/install.ts`

Installs templates (agents, standards, tools).

```bash
contextuate install                         # Interactive
contextuate install -l                      # List available
contextuate install --all                   # Install everything
contextuate install -a archon forge         # Specific agents
contextuate install -s typescript python    # Specific standards
contextuate install -t quickref             # Specific tools
```

**Options:**
- `-a, --agents <names...>` - Install specific agents
- `-s, --standards <names...>` - Install language standards
- `-t, --tools <names...>` - Install tools
- `--all` - Install all templates
- `-l, --list` - List available templates
- `-f, --force` - Overwrite existing files

**Subcommands:**
```bash
contextuate install agents [names...]
contextuate install standards [names...]
contextuate install tools [names...]
```

## Execution Flow

```
CLI Input (e.g., "contextuate init claude -f")
    │
    ▼
commander.parse()
    │
    ▼
Pattern Matching → Finds "init" command
    │
    ▼
Extract Arguments → platforms: ["claude"]
Extract Options   → { force: true }
    │
    ▼
Invoke Handler → initCommand(["claude"], { force: true })
    │
    ▼
Handler Execution
├── Interactive prompts (inquirer) if needed
├── File operations (fs-extra)
├── Template discovery and copying
└── Console output (chalk)
    │
    ▼
Process Exit (0 = success, 1 = error)
```

## Interactive vs Non-Interactive Mode

Commands support both modes:

**Interactive** (no arguments provided):
```typescript
if (platforms.length === 0) {
    const answers = await inquirer.prompt([{
        type: 'checkbox',
        name: 'platforms',
        message: 'Select platforms:',
        choices: availablePlatforms
    }]);
    platforms = answers.platforms;
}
```

**Non-Interactive** (arguments provided):
```typescript
if (platforms.length > 0) {
    // Use provided platforms directly
    // Fuzzy match against available options
}
```

## Adding a New Command

### 1. Create the Handler

Create `src/commands/my-command.ts`:

```typescript
import chalk from 'chalk';
import inquirer from 'inquirer';

export async function myCommand(
    name?: string,
    options?: { force?: boolean; value?: string }
): Promise<void> {
    // Handle missing arguments interactively
    if (!name) {
        const answers = await inquirer.prompt([{
            type: 'input',
            name: 'name',
            message: 'Enter name:',
            validate: (input) => input.length > 0 || 'Required'
        }]);
        name = answers.name;
    }

    // Implementation
    console.log(chalk.green(`Created: ${name}`));
}
```

### 2. Register the Command

In `src/index.ts`:

```typescript
import { myCommand } from './commands/my-command.js';

program
    .command('my-command [name]')
    .description('Description of what it does')
    .option('-f, --force', 'Force operation')
    .option('-v, --value <val>', 'Some value')
    .action(myCommand);
```

### 3. Export (if needed)

In `src/commands/index.ts`:

```typescript
export { myCommand } from './my-command.js';
```

## Template Discovery

Templates are discovered dynamically to handle both development and production:

```typescript
function getTemplateSource(): string {
    const paths = [
        path.join(__dirname, '../templates'),      // dist/commands → dist/templates
        path.join(__dirname, '../../src/templates'), // ts-node
        path.join(__dirname, '../../templates')     // fallback
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Templates not found');
}
```

## Error Handling

Standard error handling pattern:

```typescript
try {
    // Operation
} catch (error: any) {
    if (error.isTtyError) {
        // inquirer prompt rendering issue
        console.error(chalk.red('Terminal does not support prompts'));
    } else if (error.name === 'ExitPromptError') {
        // User cancelled (Ctrl+C)
        process.exit(0);
    } else {
        console.error(chalk.red(`[ERROR] ${error.message}`));
        process.exit(1);
    }
}
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `commander` | ^14.0.2 | CLI parsing and command registration |
| `chalk` | ^5.6.2 | Colored console output |
| `inquirer` | ^13.0.1 | Interactive prompts |
| `fs-extra` | ^11.3.2 | Enhanced file operations |
| `gray-matter` | ^4.0.3 | YAML frontmatter parsing |

## File Structure

```
src/
├── index.ts                 # CLI entry point, command registration
├── commands/
│   ├── init.ts              # Platform & agent initialization
│   ├── remove.ts            # Cleanup unmodified files
│   ├── create.ts            # Agent creation
│   ├── index.ts             # Project structure indexing
│   ├── context.ts           # Interactive context builder
│   ├── run.ts               # Agent execution
│   └── install.ts           # Template installation
├── utils/
│   ├── tokens.ts            # Token estimation & file tree
│   └── git.ts               # Git operations (worktree)
└── runtime/
    ├── driver.ts            # LLM execution driver
    └── tools.ts             # Tool loader for agents
```

## Console Output Conventions

Use chalk for consistent output styling:

```typescript
import chalk from 'chalk';

console.log(chalk.green('✓ Success message'));
console.log(chalk.yellow('⚠ Warning message'));
console.log(chalk.red('✗ Error message'));
console.log(chalk.cyan('ℹ Info message'));
console.log(chalk.dim('  Secondary text'));
```
