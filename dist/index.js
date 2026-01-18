#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const remove_1 = require("./commands/remove");
const run_1 = require("./commands/run");
const create_1 = require("./commands/create");
const index_1 = require("./commands/index");
const context_1 = require("./commands/context");
const install_1 = require("./commands/install");
const monitor_1 = require("./commands/monitor");
const claude_1 = require("./commands/claude");
const fs_1 = require("fs");
const path_1 = require("path");
const program = new commander_1.Command();
// Try to read version from package.json
let version = '0.0.0';
try {
    const packageJson = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../package.json'), 'utf-8'));
    version = packageJson.version;
}
catch (error) {
    // Ignore error if package.json is not found (e.g. during development)
}
program
    .name('contextuate')
    .description('Standardized AI context framework for any project.')
    .version(version);
program
    .command('init [platforms...]')
    .description('Initialize Contextuate in the current project')
    .option('-f, --force', 'Overwrite existing files')
    .option('-a, --agents <agents...>', 'Install specific agents (e.g., "base archon" or "all")')
    .action(init_1.initCommand);
program
    .command('remove')
    .description('Remove unmodified platform jump files')
    .action(remove_1.removeCommand);
program
    .command('create-agent')
    .alias('new-agent')
    .description('Create a new agent definition')
    .argument('[name]', 'Name of the agent (kebab-case)')
    .option('-d, --description <text>', 'Description of the agent')
    .action(create_1.createAgentCommand);
program
    .command('index')
    .description('Generate a project structure index for AI context')
    .option('-d, --depth <number>', 'Maximum depth of the file tree', '5')
    .option('-f, --force', 'Overwrite existing index')
    .action(index_1.indexCommand);
program
    .command('add-context')
    .description('Interactively add files to docs/ai/context.md')
    .action(context_1.addContextCommand);
program
    .command('run')
    .description('Run an agent definition')
    .argument('<agent>', 'Name of the agent to run (e.g. "documentation-expert")')
    .option('--dry-run', 'Simulate execution without running logic')
    .option('--isolation <mode>', 'Isolation mode (worktree, none)', 'none')
    .option('--goal <text>', 'Goal or instructions for the agent')
    .option('--task <name>', 'Load a task context (scope and latest log)')
    .action(run_1.runCommand);
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
    .action(install_1.installCommand);
// Subcommand: install agents
install
    .command('agents [names...]')
    .description('Install agent templates')
    .option('--all', 'Install all agents')
    .option('-f, --force', 'Overwrite existing files')
    .action(install_1.installAgentsCommand);
// Subcommand: install standards
install
    .command('standards [names...]')
    .description('Install language standard templates')
    .option('--all', 'Install all standards')
    .option('-f, --force', 'Overwrite existing files')
    .action(install_1.installStandardsCommand);
// Subcommand: install tools
install
    .command('tools [names...]')
    .description('Install tool templates')
    .option('--all', 'Install all tools')
    .option('-f, --force', 'Overwrite existing files')
    .action(install_1.installToolsCommand);
// Subcommand: install skills
install
    .command('skills [names...]')
    .description('Install skill templates (slash commands like /orchestrate)')
    .option('--all', 'Install all skills')
    .option('-f, --force', 'Overwrite existing files')
    .action(install_1.installSkillsCommand);
// Monitor command with subcommands
const monitor = program
    .command('monitor')
    .description('Real-time monitoring dashboard for Claude Code sessions')
    .option('-p, --port <number>', 'HTTP server port')
    .option('-w, --ws-port <number>', 'WebSocket server port')
    .option('--no-open', 'Do not open browser automatically')
    .option('-f, --foreground', 'Run server in foreground (blocking)')
    .action((options) => (0, monitor_1.monitorStartCommand)({
    port: options.port ? parseInt(options.port) : undefined,
    wsPort: options.wsPort ? parseInt(options.wsPort) : undefined,
    noOpen: options.open === false,
    foreground: options.foreground,
}));
// Subcommand: monitor init
monitor
    .command('init')
    .description('Initialize monitor configuration and install hooks')
    .option('--global', 'Install hooks at user level (~/.claude/settings.json) - DEFAULT')
    .option('--project', 'Install hooks at project level (.claude/settings.json)')
    .action(monitor_1.monitorInitCommand);
// Subcommand: monitor start (explicit)
monitor
    .command('start')
    .description('Start the monitor server')
    .option('-p, --port <number>', 'HTTP server port')
    .option('-w, --ws-port <number>', 'WebSocket server port')
    .option('--no-open', 'Do not open browser automatically')
    .option('-f, --foreground', 'Run server in foreground (blocking)')
    .action((options) => (0, monitor_1.monitorStartCommand)({
    port: options.port ? parseInt(options.port) : undefined,
    wsPort: options.wsPort ? parseInt(options.wsPort) : undefined,
    noOpen: options.open === false,
    foreground: options.foreground,
}));
// Subcommand: monitor stop
monitor
    .command('stop')
    .description('Stop the monitor daemon')
    .option('--all', 'Also stop any background processes')
    .action((options) => (0, monitor_1.monitorStopCommand)({ all: options.all }));
// Subcommand: monitor status
monitor
    .command('status')
    .description('Show monitor server status')
    .action(monitor_1.monitorStatusCommand);
// Daemon command group (top-level)
const daemon = program
    .command('daemon')
    .description('Manage the monitor daemon');
daemon
    .command('start')
    .description('Start the event processing daemon')
    .option('-d, --detach', 'Run in background (detached mode)')
    .action(async (options) => {
    await (0, monitor_1.monitorDaemonStartCommand)(options);
});
daemon
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
    await (0, monitor_1.monitorDaemonStopCommand)();
});
daemon
    .command('status')
    .description('Check daemon status')
    .action(async () => {
    await (0, monitor_1.monitorDaemonStatusCommand)();
});
daemon
    .command('logs')
    .description('View daemon logs')
    .option('-f, --follow', 'Follow log output (like tail -f)')
    .option('-n, --lines <n>', 'Number of lines to show', '50')
    .action(async (options) => {
    await (0, monitor_1.monitorDaemonLogsCommand)({
        follow: options.follow,
        lines: parseInt(options.lines)
    });
});
// Claude wrapper command - wraps Claude CLI with PTY for monitor integration
program
    .command('claude')
    .description('Run Claude Code with monitor integration (PTY wrapper)')
    .argument('[args...]', 'Arguments to pass to Claude CLI')
    .allowUnknownOption(true)
    .action((args) => {
    (0, claude_1.claudeCommand)(args);
});
// Wrapper command group - manage Claude wrapper sessions
const wrapper = program
    .command('wrapper')
    .description('Manage Claude wrapper sessions');
wrapper
    .command('list')
    .description('List active wrapper sessions')
    .action(claude_1.listWrappersCommand);
wrapper
    .command('kill')
    .argument('<wrapperId>', 'Wrapper ID to kill')
    .description('Kill a wrapper session')
    .action(claude_1.killWrapperCommand);
program.parse();
