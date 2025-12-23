#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { removeCommand } from './commands/remove';
import { runCommand } from './commands/run';
import { createAgentCommand } from './commands/create';
import { indexCommand } from './commands/index';
import { addContextCommand } from './commands/context';
import { installCommand, installAgentsCommand, installStandardsCommand, installToolsCommand, installSkillsCommand } from './commands/install';
import {
    monitorInitCommand,
    monitorStartCommand,
    monitorStopCommand,
    monitorStatusCommand,
    monitorDaemonStartCommand,
    monitorDaemonStopCommand,
    monitorDaemonStatusCommand,
    monitorDaemonLogsCommand
} from './commands/monitor';
import { readFileSync } from 'fs';
import { join } from 'path';

const program = new Command();

// Try to read version from package.json
let version = '0.0.0';
try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
    version = packageJson.version;
} catch (error) {
    // Ignore error if package.json is not found (e.g. during development)
}

program
    .name('contextuate')
    .description('Standardized AI context framework for any project. Powered by Esotech.')
    .version(version);

program
    .command('init [platforms...]')
    .description('Initialize Contextuate in the current project')
    .option('-f, --force', 'Overwrite existing files')
    .option('-a, --agents <agents...>', 'Install specific agents (e.g., "base archon" or "all")')
    .action(initCommand);

program
    .command('remove')
    .description('Remove unmodified platform jump files')
    .action(removeCommand);

program
    .command('create-agent')
    .alias('new-agent')
    .description('Create a new agent definition')
    .argument('[name]', 'Name of the agent (kebab-case)')
    .option('-d, --description <text>', 'Description of the agent')
    .action(createAgentCommand);

program
    .command('index')
    .description('Generate a project structure index for AI context')
    .option('-d, --depth <number>', 'Maximum depth of the file tree', '5')
    .option('-f, --force', 'Overwrite existing index')
    .action(indexCommand);

program
    .command('add-context')
    .description('Interactively add files to docs/ai/context.md')
    .action(addContextCommand);

program
    .command('run')
    .description('Run an agent definition')
    .argument('<agent>', 'Name of the agent to run (e.g. "documentation-expert")')
    .option('--dry-run', 'Simulate execution without running logic')
    .option('--isolation <mode>', 'Isolation mode (worktree, none)', 'none')
    .option('--goal <text>', 'Goal or instructions for the agent')
    .option('--task <name>', 'Load a task context (scope and latest log)')
    .action(runCommand);

// Install command with subcommands and flag-based usage
const install = program
    .command('install')
    .description('Install templates from the Contextuate repository')
    .option('-a, --agents <names...>', 'Install specific agents (use "all" for all)')
    .option('-s, --standards <names...>', 'Install language standards (use "all" for all)')
    .option('-t, --tools <names...>', 'Install tools (use "all" for all)')
    .option('-k, --skills <names...>', 'Install skills/slash commands (use "all" for all)')
    .option('--all', 'Install all available templates')
    .option('-l, --list', 'List available templates')
    .option('-f, --force', 'Overwrite existing files')
    .action(installCommand);

// Subcommand: install agents
install
    .command('agents [names...]')
    .description('Install agent templates')
    .option('--all', 'Install all agents')
    .option('-f, --force', 'Overwrite existing files')
    .action(installAgentsCommand);

// Subcommand: install standards
install
    .command('standards [names...]')
    .description('Install language standard templates')
    .option('--all', 'Install all standards')
    .option('-f, --force', 'Overwrite existing files')
    .action(installStandardsCommand);

// Subcommand: install tools
install
    .command('tools [names...]')
    .description('Install tool templates')
    .option('--all', 'Install all tools')
    .option('-f, --force', 'Overwrite existing files')
    .action(installToolsCommand);

// Subcommand: install skills
install
    .command('skills [names...]')
    .description('Install skill templates (slash commands like /orchestrate)')
    .option('--all', 'Install all skills')
    .option('-f, --force', 'Overwrite existing files')
    .action(installSkillsCommand);

// Monitor command with subcommands
const monitor = program
    .command('monitor')
    .description('Real-time monitoring dashboard for Claude Code sessions')
    .option('-p, --port <number>', 'HTTP server port')
    .option('-w, --ws-port <number>', 'WebSocket server port')
    .option('--no-open', 'Do not open browser automatically')
    .action((options) => monitorStartCommand({
        port: options.port ? parseInt(options.port) : undefined,
        wsPort: options.wsPort ? parseInt(options.wsPort) : undefined,
        noOpen: options.open === false,
    }));

// Subcommand: monitor init
monitor
    .command('init')
    .description('Initialize monitor configuration and install hooks')
    .action(monitorInitCommand);

// Subcommand: monitor start (explicit)
monitor
    .command('start')
    .description('Start the monitor server')
    .option('-p, --port <number>', 'HTTP server port')
    .option('-w, --ws-port <number>', 'WebSocket server port')
    .option('--no-open', 'Do not open browser automatically')
    .action((options) => monitorStartCommand({
        port: options.port ? parseInt(options.port) : undefined,
        wsPort: options.wsPort ? parseInt(options.wsPort) : undefined,
        noOpen: options.open === false,
    }));

// Subcommand: monitor stop
monitor
    .command('stop')
    .description('Stop the monitor daemon')
    .option('--all', 'Also stop any background processes')
    .action((options) => monitorStopCommand({ all: options.all }));

// Subcommand: monitor status
monitor
    .command('status')
    .description('Show monitor server status')
    .action(monitorStatusCommand);

// Daemon subcommand group
const daemon = monitor
    .command('daemon')
    .description('Manage the monitor daemon');

daemon
    .command('start')
    .description('Start the event processing daemon')
    .option('-d, --detach', 'Run in background (detached mode)')
    .action(async (options) => {
        await monitorDaemonStartCommand(options);
    });

daemon
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
        await monitorDaemonStopCommand();
    });

daemon
    .command('status')
    .description('Check daemon status')
    .action(async () => {
        await monitorDaemonStatusCommand();
    });

daemon
    .command('logs')
    .description('View daemon logs')
    .option('-f, --follow', 'Follow log output (like tail -f)')
    .option('-n, --lines <n>', 'Number of lines to show', '50')
    .action(async (options) => {
        await monitorDaemonLogsCommand({
            follow: options.follow,
            lines: parseInt(options.lines)
        });
    });

program.parse();
