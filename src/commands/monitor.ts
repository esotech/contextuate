/**
 * Monitor Command
 *
 * CLI commands for the Contextuate Monitor feature.
 * - contextuate monitor init: Interactive setup
 * - contextuate monitor [start]: Start the monitor server
 * - contextuate monitor status: Show server status
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import { spawn, ChildProcess } from 'child_process';
import type { MonitorConfig, MonitorMode, PersistenceType, MonitorPaths } from '../types/monitor';
import { DEFAULT_CONFIG, getDefaultMonitorPaths } from '../types/monitor';

// Use the centralized paths
const PATHS = getDefaultMonitorPaths();

// For backward compatibility, also define legacy paths
const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.contextuate');
const LEGACY_CONFIG_FILE = path.join(LEGACY_CONFIG_DIR, 'monitor.config.json');
const LEGACY_SESSIONS_DIR = path.join(LEGACY_CONFIG_DIR, 'sessions');

// Claude settings file (unchanged)
const CLAUDE_SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * Migrate from old directory structure to new structure
 *
 * Old structure: ~/.contextuate/{monitor.config.json,sessions/,hooks/}
 * New structure: ~/.contextuate/monitor/{config.json,sessions/,hooks/,raw/,processed/}
 *
 * @returns true if migration was performed, false if nothing to migrate or already migrated
 */
async function migrateToNewStructure(): Promise<boolean> {
    // Check if old structure exists
    const legacyConfigExists = await fs.pathExists(LEGACY_CONFIG_FILE);
    const legacySessionsExists = await fs.pathExists(LEGACY_SESSIONS_DIR);
    const newConfigExists = await fs.pathExists(PATHS.configFile);

    if (!legacyConfigExists && !legacySessionsExists) {
        return false; // Nothing to migrate
    }

    if (newConfigExists) {
        return false; // Already migrated
    }

    console.log(chalk.blue('[Migration] Migrating to new directory structure...'));

    try {
        // Create new directories
        await fs.mkdir(PATHS.baseDir, { recursive: true });
        await fs.mkdir(PATHS.rawDir, { recursive: true });
        await fs.mkdir(PATHS.processedDir, { recursive: true });

        // Move config file
        if (legacyConfigExists) {
            await fs.rename(LEGACY_CONFIG_FILE, PATHS.configFile);
            console.log(chalk.green('[Migration] Moved config file'));
        }

        // Move sessions directory
        if (legacySessionsExists) {
            await fs.rename(LEGACY_SESSIONS_DIR, PATHS.sessionsDir);
            console.log(chalk.green('[Migration] Moved sessions directory'));
        }

        // Move hooks directory if it exists
        const legacyHooksDir = path.join(LEGACY_CONFIG_DIR, 'hooks');
        const legacyHooksExists = await fs.pathExists(legacyHooksDir);
        if (legacyHooksExists) {
            await fs.rename(legacyHooksDir, PATHS.hooksDir);
            console.log(chalk.green('[Migration] Moved hooks directory'));
        }

        console.log(chalk.green('[Migration] Complete! New structure at ~/.contextuate/monitor/'));
        console.log('');
        return true;
    } catch (error: any) {
        console.log(chalk.yellow(`[Migration] Warning: Migration partially failed: ${error.message}`));
        console.log(chalk.yellow('[Migration] You may need to manually move files to ~/.contextuate/monitor/'));
        return false;
    }
}

/**
 * Load monitor configuration
 */
async function loadConfig(): Promise<MonitorConfig | null> {
    try {
        if (await fs.pathExists(PATHS.configFile)) {
            const content = await fs.readFile(PATHS.configFile, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
        }
    } catch (err) {
        // Ignore errors
    }
    return null;
}

/**
 * Save monitor configuration
 */
async function saveConfig(config: MonitorConfig): Promise<void> {
    await fs.ensureDir(PATHS.baseDir);
    await fs.writeFile(PATHS.configFile, JSON.stringify(config, null, 2));
}

/**
 * Initialize monitor command
 */
export async function monitorInitCommand(): Promise<void> {
    console.log(chalk.blue(''));
    console.log(chalk.blue('=========================================='));
    console.log(chalk.blue('  Contextuate Monitor Setup'));
    console.log(chalk.blue('=========================================='));
    console.log('');

    try {
        // Attempt migration from old structure
        await migrateToNewStructure();

        // Check for existing configuration
        const existingConfig = await loadConfig();
        if (existingConfig) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Configuration already exists. Overwrite?',
                    default: false,
                },
            ]);
            if (!overwrite) {
                console.log(chalk.yellow('[INFO] Setup cancelled.'));
                return;
            }
        }

        // Step 1: Choose mode
        const { mode } = await inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'Select monitor mode:',
                choices: [
                    { name: 'Local (Unix socket) - Single machine', value: 'local' },
                    { name: 'Redis (pub/sub) - Distributed/multi-machine', value: 'redis' },
                ],
                default: 'local',
            },
        ]);

        const config: MonitorConfig = { ...DEFAULT_CONFIG, mode: mode as MonitorMode };

        // Step 2: Redis configuration (if selected)
        if (mode === 'redis') {
            console.log('');
            console.log(chalk.blue('[INFO] Configure Redis connection:'));

            const redisAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'host',
                    message: 'Redis host:',
                    default: 'localhost',
                },
                {
                    type: 'number',
                    name: 'port',
                    message: 'Redis port:',
                    default: 6379,
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Redis password (leave empty for none):',
                    default: '',
                },
                {
                    type: 'input',
                    name: 'channel',
                    message: 'Redis channel:',
                    default: 'contextuate:events',
                },
            ]);

            config.redis = {
                host: redisAnswers.host,
                port: redisAnswers.port,
                password: redisAnswers.password || null,
                channel: redisAnswers.channel,
            };
        }

        // Step 3: Server configuration
        console.log('');
        console.log(chalk.blue('[INFO] Configure server ports:'));

        const serverAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'host',
                message: 'Server host:',
                default: '0.0.0.0',
            },
            {
                type: 'number',
                name: 'port',
                message: 'HTTP port:',
                default: 3847,
            },
            {
                type: 'number',
                name: 'wsPort',
                message: 'WebSocket port:',
                default: 3848,
            },
        ]);

        config.server = {
            host: serverAnswers.host,
            port: serverAnswers.port,
            wsPort: serverAnswers.wsPort,
        };

        // Step 4: Persistence configuration
        console.log('');
        console.log(chalk.blue('[INFO] Configure data persistence:'));

        const { persistenceType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'persistenceType',
                message: 'Persistence type:',
                choices: [
                    { name: 'File-based (recommended)', value: 'file' },
                    { name: 'MySQL (coming soon)', value: 'mysql', disabled: true },
                    { name: 'PostgreSQL (coming soon)', value: 'postgresql', disabled: true },
                ],
                default: 'file',
            },
        ]);

        config.persistence = {
            enabled: true,
            type: persistenceType as PersistenceType,
        };

        // Step 5: Socket path (local mode only)
        if (mode === 'local') {
            const { socketPath } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'socketPath',
                    message: 'Unix socket path:',
                    default: '/tmp/contextuate-monitor.sock',
                },
            ]);
            config.socketPath = socketPath;
        }

        // Create new directory structure
        await fs.ensureDir(PATHS.baseDir);
        await fs.ensureDir(PATHS.rawDir);
        await fs.ensureDir(PATHS.processedDir);
        await fs.ensureDir(PATHS.sessionsDir);
        await fs.ensureDir(PATHS.hooksDir);

        // Save configuration
        await saveConfig(config);
        console.log('');
        console.log(chalk.green(`[OK] Configuration saved to ${PATHS.configFile}`));

        // Step 6: Install hook script
        console.log('');
        console.log(chalk.blue('[INFO] Installing hook script...'));

        // Find the hook script source
        let hookSource = path.join(__dirname, '../monitor/hooks/emit-event.js');
        if (!await fs.pathExists(hookSource)) {
            hookSource = path.join(__dirname, '../../src/monitor/hooks/emit-event.js');
        }

        const hookDest = path.join(PATHS.hooksDir, 'emit-event.js');

        if (await fs.pathExists(hookSource)) {
            await fs.copy(hookSource, hookDest);
            await fs.chmod(hookDest, 0o755);
            console.log(chalk.green(`[OK] Hook script installed to ${hookDest}`));
        } else {
            console.log(chalk.yellow(`[WARN] Hook script source not found. You may need to copy it manually.`));
        }

        // Step 7: Ask about Claude settings integration
        console.log('');
        const { hookLocation } = await inquirer.prompt([
            {
                type: 'list',
                name: 'hookLocation',
                message: 'Where should hooks be registered?',
                choices: [
                    { name: 'Project level (.claude/settings.json in current directory)', value: 'project' },
                    { name: 'Home level (~/.claude/settings.json - applies to all projects)', value: 'home' },
                    { name: 'Skip - I will configure hooks manually', value: 'skip' },
                ],
                default: 'project',
            },
        ]);

        if (hookLocation !== 'skip') {
            const settingsFile = hookLocation === 'project'
                ? path.join(process.cwd(), '.claude', 'settings.json')
                : CLAUDE_SETTINGS_FILE;
            await updateClaudeHookSettings(hookDest, settingsFile);
        }

        // Done!
        console.log('');
        console.log(chalk.green('=========================================='));
        console.log(chalk.green('  Setup Complete!'));
        console.log(chalk.green('=========================================='));
        console.log('');
        console.log('Next steps:');
        console.log(`  1. Start the monitor: ${chalk.cyan('contextuate monitor')}`);
        console.log(`  2. Open your browser to: ${chalk.cyan(`http://localhost:${config.server.port}`)}`);
        console.log(`  3. Start a Claude Code session - events will appear in the dashboard`);
        console.log('');

    } catch (error: any) {
        if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
            console.log('');
            console.log(chalk.yellow('Setup cancelled.'));
            return;
        }
        throw error;
    }
}

/**
 * Update Claude settings with hook registrations
 */
async function updateClaudeHookSettings(hookPath: string, settingsFile: string): Promise<void> {
    try {
        const claudeDir = path.dirname(settingsFile);
        await fs.ensureDir(claudeDir);

        let settings: Record<string, unknown> = {};

        if (await fs.pathExists(settingsFile)) {
            try {
                const content = await fs.readFile(settingsFile, 'utf-8');
                settings = JSON.parse(content);
            } catch {
                // Start fresh if parsing fails
            }
        }

        // Define hooks using new matcher-based format
        // Format: { "matcher": "<pattern>", "hooks": [{"type": "command", "command": "..."}] }
        // Empty string matcher = match all
        const hookEntry = {
            matcher: '',
            hooks: [{ type: 'command', command: hookPath }]
        };
        const hookTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop'];

        // Initialize hooks object if needed
        if (!settings.hooks || typeof settings.hooks !== 'object') {
            settings.hooks = {};
        }

        const hooks = settings.hooks as Record<string, unknown[]>;

        // Add our hook to each hook type
        for (const hookType of hookTypes) {
            if (!Array.isArray(hooks[hookType])) {
                hooks[hookType] = [];
            }

            // Check if our hook is already registered (look inside the hooks array)
            const existing = hooks[hookType].find((entry: any) =>
                entry.hooks?.some((h: any) => h.type === 'command' && h.command === hookPath)
            );

            if (!existing) {
                hooks[hookType].push(hookEntry);
            }
        }

        // Save settings
        await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
        console.log(chalk.green(`[OK] Hooks registered in ${settingsFile}`));

    } catch (err) {
        console.log(chalk.yellow(`[WARN] Could not update Claude settings: ${err}`));
    }
}

/**
 * Start monitor server command
 */
export async function monitorStartCommand(options: {
    port?: number;
    wsPort?: number;
    noOpen?: boolean;
}): Promise<void> {
    // Attempt migration from old structure
    await migrateToNewStructure();

    // Load configuration
    let config = await loadConfig();

    if (!config) {
        console.log(chalk.yellow('[WARN] No configuration found. Running init...'));
        console.log('');
        await monitorInitCommand();
        config = await loadConfig();
        if (!config) {
            console.log(chalk.red('[ERROR] Setup failed or cancelled.'));
            return;
        }
    }

    // Apply command-line overrides
    if (options.port) {
        config.server.port = options.port;
    }
    if (options.wsPort) {
        config.server.wsPort = options.wsPort;
    }

    // Auto-start daemon if not running
    const pid = await getDaemonPid();
    if (!pid || !isProcessRunning(pid)) {
        console.log(chalk.blue('[INFO] Starting daemon...'));
        await monitorDaemonStartCommand({ detach: true });
        console.log('');
    }

    console.log(chalk.blue('[INFO] Starting Contextuate Monitor...'));
    console.log('');

    try {
        // Dynamically import the server module
        const { createMonitorServer } = await import('../monitor/server');

        const server = await createMonitorServer({
            config,
            dataDir: PATHS.baseDir
        });
        await server.start();

        // Open browser if not disabled
        if (!options.noOpen) {
            const url = `http://localhost:${config.server.port}`;
            console.log(chalk.blue(`[INFO] Opening browser: ${url}`));

            // Platform-specific browser open
            const { exec } = await import('child_process');
            const platform = process.platform;
            const command = platform === 'darwin' ? 'open' :
                platform === 'win32' ? 'start' : 'xdg-open';

            exec(`${command} ${url}`, (err) => {
                if (err) {
                    console.log(chalk.yellow(`[WARN] Could not open browser automatically.`));
                    console.log(chalk.yellow(`       Please open ${url} manually.`));
                }
            });
        }

        // Handle shutdown signals
        const shutdown = async () => {
            console.log('');
            console.log(chalk.blue('[INFO] Shutting down...'));
            await server.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        // Keep running
        console.log(chalk.green('[OK] Monitor is running. Press Ctrl+C to stop.'));

    } catch (err: any) {
        console.error(chalk.red(`[ERROR] Failed to start server: ${err.message}`));
        process.exit(1);
    }
}

/**
 * Stop monitor server command
 */
export async function monitorStopCommand(options: { all?: boolean }): Promise<void> {
    console.log(chalk.blue('[INFO] Stopping monitor server...'));

    // The UI server is typically running in foreground, so this command
    // primarily stops the daemon. If the UI server is running, the user
    // would typically use Ctrl+C to stop it.

    // Check if daemon is running and stop it
    const pid = await getDaemonPid();

    if (options.all || pid) {
        await monitorDaemonStopCommand();
    }

    // Note: The UI server doesn't have a PID file since it typically runs in foreground
    // If we want to support background UI server, we'd add that logic here

    console.log(chalk.green('[OK] Monitor stopped'));
}

/**
 * Show monitor status command
 */
export async function monitorStatusCommand(): Promise<void> {
    const config = await loadConfig();

    console.log(chalk.blue(''));
    console.log(chalk.blue('=========================================='));
    console.log(chalk.blue('  Contextuate Monitor Status'));
    console.log(chalk.blue('=========================================='));
    console.log('');

    if (!config) {
        console.log(chalk.yellow('Status: Not configured'));
        console.log('');
        console.log(`Run ${chalk.cyan('contextuate monitor init')} to set up the monitor.`);
        return;
    }

    // Configuration info
    console.log(chalk.white('Configuration:'));
    console.log(`  Mode:        ${chalk.cyan(config.mode)}`);
    console.log(`  HTTP Port:   ${chalk.cyan(config.server.port)}`);
    console.log(`  WS Port:     ${chalk.cyan(config.server.wsPort)}`);

    if (config.mode === 'redis') {
        console.log(`  Redis:       ${chalk.cyan(`${config.redis.host}:${config.redis.port}`)}`);
    } else {
        console.log(`  Socket:      ${chalk.cyan(config.socketPath)}`);
    }

    console.log(`  Persistence: ${chalk.cyan(config.persistence.type)}`);
    console.log('');

    // Check daemon status
    console.log(chalk.white('Daemon Status:'));
    const pid = await getDaemonPid();
    if (pid && isProcessRunning(pid)) {
        console.log(`  Status:      ${chalk.green('Running')} (PID: ${pid})`);
    } else {
        console.log(`  Status:      ${chalk.yellow('Not running')}`);
    }
    console.log('');

    // Check if server is running
    console.log(chalk.white('UI Server Status:'));

    try {
        const response = await fetch(`http://localhost:${config.server.port}/api/status`);
        if (response.ok) {
            const status = await response.json() as {
                status: string;
                sessions: number;
                activeSessions: number;
                uptime: number;
            };
            console.log(`  Status:      ${chalk.green('Running')}`);
            console.log(`  Sessions:    ${chalk.cyan(status.sessions)} total, ${chalk.cyan(status.activeSessions)} active`);
            console.log(`  Uptime:      ${chalk.cyan(formatUptime(status.uptime))}`);
            console.log('');
            console.log(`Dashboard: ${chalk.cyan(`http://localhost:${config.server.port}`)}`);
        } else {
            console.log(`  Status:      ${chalk.red('Error (HTTP ' + response.status + ')')}`);
        }
    } catch (err) {
        console.log(`  Status:      ${chalk.yellow('Not running')}`);
        console.log('');
        console.log(`Start with: ${chalk.cyan('contextuate monitor')}`);
    }

    console.log('');
}

/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

// =============================================================================
// Daemon Management Helper Functions
// =============================================================================

/**
 * Get daemon PID from PID file
 */
async function getDaemonPid(): Promise<number | null> {
    try {
        const pidStr = await fs.readFile(PATHS.daemonPidFile, 'utf-8');
        return parseInt(pidStr.trim(), 10);
    } catch {
        return null;
    }
}

/**
 * Check if a process is running
 */
function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0); // Signal 0 just checks if process exists
        return true;
    } catch {
        return false;
    }
}

// =============================================================================
// Daemon Management Commands
// =============================================================================

/**
 * Start daemon command
 */
export async function monitorDaemonStartCommand(options: { detach?: boolean }): Promise<void> {
    const config = await loadConfig();
    if (!config) {
        console.log(chalk.red('[Error] Monitor not initialized. Run: contextuate monitor init'));
        return;
    }

    // Check if already running
    const pid = await getDaemonPid();
    if (pid && isProcessRunning(pid)) {
        console.log(chalk.blue(`[Info] Daemon already running (PID: ${pid})`));
        return;
    }

    if (options.detach) {
        // Start as background process
        // Find the daemon CLI entry point
        let daemonPath = path.join(__dirname, '..', 'monitor', 'daemon', 'cli.js');
        if (!await fs.pathExists(daemonPath)) {
            // Try alternative paths
            const alternatives = [
                path.join(__dirname, '..', '..', 'dist', 'monitor', 'daemon', 'cli.js'),
                path.join(__dirname, 'monitor', 'daemon', 'cli.js'),
            ];
            for (const altPath of alternatives) {
                if (await fs.pathExists(altPath)) {
                    daemonPath = altPath;
                    break;
                }
            }
        }

        if (!await fs.pathExists(daemonPath)) {
            console.log(chalk.red(`[Error] Daemon CLI not found at ${daemonPath}`));
            console.log(chalk.yellow('[Info] Try running: npm run build'));
            return;
        }

        const child = spawn(process.execPath, [
            daemonPath,
            '--config', PATHS.configFile,
        ], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Write PID file
        await fs.writeFile(PATHS.daemonPidFile, child.pid!.toString());

        // Redirect output to log file
        const logStream = fs.createWriteStream(PATHS.daemonLogFile, { flags: 'a' });
        child.stdout?.pipe(logStream);
        child.stderr?.pipe(logStream);

        child.unref();

        console.log(chalk.green(`[OK] Daemon started in background (PID: ${child.pid})`));
        console.log(chalk.blue(`[Info] Logs: ${PATHS.daemonLogFile}`));
    } else {
        // Run in foreground
        console.log(chalk.blue('[Info] Starting daemon in foreground (Ctrl+C to stop)'));

        const { startDaemon } = await import('../monitor/daemon/index.js');
        const daemon = await startDaemon(config);

        // Handle shutdown
        const shutdown = async () => {
            console.log('');
            console.log(chalk.blue('[Info] Shutting down daemon...'));
            await daemon.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
}

/**
 * Stop daemon command
 */
export async function monitorDaemonStopCommand(): Promise<void> {
    const pid = await getDaemonPid();

    if (!pid) {
        console.log(chalk.blue('[Info] Daemon not running (no PID file)'));
        return;
    }

    if (!isProcessRunning(pid)) {
        console.log(chalk.blue('[Info] Daemon not running (stale PID file)'));
        await fs.remove(PATHS.daemonPidFile);
        return;
    }

    try {
        process.kill(pid, 'SIGTERM');
        console.log(chalk.green(`[OK] Sent shutdown signal to daemon (PID: ${pid})`));

        // Wait for process to exit
        let attempts = 0;
        while (isProcessRunning(pid) && attempts < 10) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        if (isProcessRunning(pid)) {
            console.log(chalk.yellow('[Warning] Daemon still running, sending SIGKILL'));
            process.kill(pid, 'SIGKILL');
        }

        await fs.remove(PATHS.daemonPidFile);
        console.log(chalk.green('[OK] Daemon stopped'));
    } catch (err: any) {
        console.error(chalk.red(`[Error] Failed to stop daemon: ${err.message}`));
    }
}

/**
 * Show daemon status command
 */
export async function monitorDaemonStatusCommand(): Promise<void> {
    const pid = await getDaemonPid();

    if (!pid) {
        console.log('Daemon: not running (no PID file)');
        return;
    }

    if (isProcessRunning(pid)) {
        console.log(`Daemon: ${chalk.green('running')} (PID: ${pid})`);
        console.log(`Logs:   ${PATHS.daemonLogFile}`);
    } else {
        console.log('Daemon: not running (stale PID file)');
        await fs.remove(PATHS.daemonPidFile);
    }
}

/**
 * View daemon logs command
 */
export async function monitorDaemonLogsCommand(options: { follow?: boolean; lines?: number }): Promise<void> {
    const lines = options.lines || 50;

    try {
        await fs.access(PATHS.daemonLogFile);
    } catch {
        console.log(chalk.blue('[Info] No daemon log file found'));
        return;
    }

    if (options.follow) {
        // Use tail -f
        const tail = spawn('tail', ['-f', '-n', lines.toString(), PATHS.daemonLogFile], {
            stdio: 'inherit',
        });

        process.on('SIGINT', () => {
            tail.kill();
            process.exit(0);
        });
    } else {
        // Read last N lines
        const content = await fs.readFile(PATHS.daemonLogFile, 'utf-8');
        const allLines = content.split('\n');
        const lastLines = allLines.slice(-lines).join('\n');
        console.log(lastLines);
    }
}
