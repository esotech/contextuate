"use strict";
/**
 * Monitor Command
 *
 * CLI commands for the Contextuate Monitor feature.
 * - contextuate monitor init: Interactive setup
 * - contextuate monitor [start]: Start the monitor server
 * - contextuate monitor status: Show server status
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorInitCommand = monitorInitCommand;
exports.monitorStartCommand = monitorStartCommand;
exports.monitorStopCommand = monitorStopCommand;
exports.monitorStatusCommand = monitorStatusCommand;
exports.monitorDaemonStartCommand = monitorDaemonStartCommand;
exports.monitorDaemonStopCommand = monitorDaemonStopCommand;
exports.monitorDaemonStatusCommand = monitorDaemonStatusCommand;
exports.monitorDaemonLogsCommand = monitorDaemonLogsCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const inquirer_1 = __importDefault(require("inquirer"));
const child_process_1 = require("child_process");
const monitor_1 = require("../types/monitor");
// Use the centralized paths
const PATHS = (0, monitor_1.getDefaultMonitorPaths)();
// For backward compatibility, also define legacy paths
const LEGACY_CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.contextuate');
const LEGACY_CONFIG_FILE = path_1.default.join(LEGACY_CONFIG_DIR, 'monitor.config.json');
const LEGACY_SESSIONS_DIR = path_1.default.join(LEGACY_CONFIG_DIR, 'sessions');
// Claude settings file (unchanged)
const CLAUDE_SETTINGS_FILE = path_1.default.join(os_1.default.homedir(), '.claude', 'settings.json');
/**
 * Migrate from old directory structure to new structure
 *
 * Old structure: ~/.contextuate/{monitor.config.json,sessions/,hooks/}
 * New structure: ~/.contextuate/monitor/{config.json,sessions/,hooks/,raw/,processed/}
 *
 * @returns true if migration was performed, false if nothing to migrate or already migrated
 */
async function migrateToNewStructure() {
    // Check if old structure exists
    const legacyConfigExists = await fs_extra_1.default.pathExists(LEGACY_CONFIG_FILE);
    const legacySessionsExists = await fs_extra_1.default.pathExists(LEGACY_SESSIONS_DIR);
    const newConfigExists = await fs_extra_1.default.pathExists(PATHS.configFile);
    if (!legacyConfigExists && !legacySessionsExists) {
        return false; // Nothing to migrate
    }
    if (newConfigExists) {
        return false; // Already migrated
    }
    console.log(chalk_1.default.blue('[Migration] Migrating to new directory structure...'));
    try {
        // Create new directories
        await fs_extra_1.default.mkdir(PATHS.baseDir, { recursive: true });
        await fs_extra_1.default.mkdir(PATHS.rawDir, { recursive: true });
        await fs_extra_1.default.mkdir(PATHS.processedDir, { recursive: true });
        // Move config file
        if (legacyConfigExists) {
            await fs_extra_1.default.rename(LEGACY_CONFIG_FILE, PATHS.configFile);
            console.log(chalk_1.default.green('[Migration] Moved config file'));
        }
        // Move sessions directory
        if (legacySessionsExists) {
            await fs_extra_1.default.rename(LEGACY_SESSIONS_DIR, PATHS.sessionsDir);
            console.log(chalk_1.default.green('[Migration] Moved sessions directory'));
        }
        // Move hooks directory if it exists
        const legacyHooksDir = path_1.default.join(LEGACY_CONFIG_DIR, 'hooks');
        const legacyHooksExists = await fs_extra_1.default.pathExists(legacyHooksDir);
        if (legacyHooksExists) {
            await fs_extra_1.default.rename(legacyHooksDir, PATHS.hooksDir);
            console.log(chalk_1.default.green('[Migration] Moved hooks directory'));
        }
        console.log(chalk_1.default.green('[Migration] Complete! New structure at ~/.contextuate/monitor/'));
        console.log('');
        return true;
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`[Migration] Warning: Migration partially failed: ${error.message}`));
        console.log(chalk_1.default.yellow('[Migration] You may need to manually move files to ~/.contextuate/monitor/'));
        return false;
    }
}
/**
 * Load monitor configuration
 */
async function loadConfig() {
    try {
        if (await fs_extra_1.default.pathExists(PATHS.configFile)) {
            const content = await fs_extra_1.default.readFile(PATHS.configFile, 'utf-8');
            return { ...monitor_1.DEFAULT_CONFIG, ...JSON.parse(content) };
        }
    }
    catch (err) {
        // Ignore errors
    }
    return null;
}
/**
 * Save monitor configuration
 */
async function saveConfig(config) {
    await fs_extra_1.default.ensureDir(PATHS.baseDir);
    await fs_extra_1.default.writeFile(PATHS.configFile, JSON.stringify(config, null, 2));
}
/**
 * Initialize monitor command
 */
async function monitorInitCommand(options) {
    console.log(chalk_1.default.blue(''));
    console.log(chalk_1.default.blue('=========================================='));
    console.log(chalk_1.default.blue('  Contextuate Monitor Setup'));
    console.log(chalk_1.default.blue('=========================================='));
    console.log('');
    try {
        // Attempt migration from old structure
        await migrateToNewStructure();
        // Check for existing configuration
        const existingConfig = await loadConfig();
        if (existingConfig) {
            const { overwrite } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Configuration already exists. Overwrite?',
                    default: false,
                },
            ]);
            if (!overwrite) {
                console.log(chalk_1.default.yellow('[INFO] Setup cancelled.'));
                return;
            }
        }
        // Step 1: Choose mode
        const { mode } = await inquirer_1.default.prompt([
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
        const config = { ...monitor_1.DEFAULT_CONFIG, mode: mode };
        // Step 2: Redis configuration (if selected)
        if (mode === 'redis') {
            console.log('');
            console.log(chalk_1.default.blue('[INFO] Configure Redis connection:'));
            const redisAnswers = await inquirer_1.default.prompt([
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
        console.log(chalk_1.default.blue('[INFO] Configure server ports:'));
        const serverAnswers = await inquirer_1.default.prompt([
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
        console.log(chalk_1.default.blue('[INFO] Configure data persistence:'));
        const { persistenceType } = await inquirer_1.default.prompt([
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
            type: persistenceType,
        };
        // Step 5: Socket path (local mode only)
        if (mode === 'local') {
            const { socketPath } = await inquirer_1.default.prompt([
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
        await fs_extra_1.default.ensureDir(PATHS.baseDir);
        await fs_extra_1.default.ensureDir(PATHS.rawDir);
        await fs_extra_1.default.ensureDir(PATHS.processedDir);
        await fs_extra_1.default.ensureDir(PATHS.sessionsDir);
        await fs_extra_1.default.ensureDir(PATHS.hooksDir);
        // Save configuration
        await saveConfig(config);
        console.log('');
        console.log(chalk_1.default.green(`[OK] Configuration saved to ${PATHS.configFile}`));
        // Step 6: Install hook script
        console.log('');
        console.log(chalk_1.default.blue('[INFO] Installing hook script...'));
        // Find the hook script source
        let hookSource = path_1.default.join(__dirname, '../monitor/hooks/emit-event.js');
        if (!await fs_extra_1.default.pathExists(hookSource)) {
            hookSource = path_1.default.join(__dirname, '../../src/monitor/hooks/emit-event.js');
        }
        const hookDest = path_1.default.join(PATHS.hooksDir, 'emit-event.js');
        if (await fs_extra_1.default.pathExists(hookSource)) {
            await fs_extra_1.default.copy(hookSource, hookDest);
            await fs_extra_1.default.chmod(hookDest, 0o755);
            console.log(chalk_1.default.green(`[OK] Hook script installed to ${hookDest}`));
        }
        else {
            console.log(chalk_1.default.yellow(`[WARN] Hook script source not found. You may need to copy it manually.`));
        }
        // Step 7: Determine hook location (from flags or interactive)
        console.log('');
        let hookLocation;
        // Check if flags were provided
        if (options?.global && options?.project) {
            console.log(chalk_1.default.yellow('[WARN] Both --global and --project flags specified. Using --global (default).'));
            hookLocation = 'home';
        }
        else if (options?.global) {
            hookLocation = 'home';
            console.log(chalk_1.default.blue('[INFO] Installing hooks at user level (--global)'));
        }
        else if (options?.project) {
            hookLocation = 'project';
            console.log(chalk_1.default.blue('[INFO] Installing hooks at project level (--project)'));
        }
        else {
            // No flags provided - ask interactively (default to global/home)
            const answer = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'hookLocation',
                    message: 'Where should hooks be registered?',
                    choices: [
                        { name: 'User level (~/.claude/settings.json - applies to all projects) - DEFAULT', value: 'home' },
                        { name: 'Project level (.claude/settings.json in current directory)', value: 'project' },
                        { name: 'Skip - I will configure hooks manually', value: 'skip' },
                    ],
                    default: 'home',
                },
            ]);
            hookLocation = answer.hookLocation;
        }
        if (hookLocation !== 'skip') {
            const settingsFile = hookLocation === 'project'
                ? path_1.default.join(process.cwd(), '.claude', 'settings.json')
                : CLAUDE_SETTINGS_FILE;
            await updateClaudeHookSettings(hookDest, settingsFile);
        }
        // Done!
        console.log('');
        console.log(chalk_1.default.green('=========================================='));
        console.log(chalk_1.default.green('  Setup Complete!'));
        console.log(chalk_1.default.green('=========================================='));
        console.log('');
        console.log('Next steps:');
        console.log(`  1. Start the monitor: ${chalk_1.default.cyan('contextuate monitor')}`);
        console.log(`  2. Open your browser to: ${chalk_1.default.cyan(`http://localhost:${config.server.port}`)}`);
        console.log(`  3. Start a Claude Code session - events will appear in the dashboard`);
        console.log('');
    }
    catch (error) {
        if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
            console.log('');
            console.log(chalk_1.default.yellow('Setup cancelled.'));
            return;
        }
        throw error;
    }
}
/**
 * Check if a hook command path refers to a contextuate emit-event hook
 */
function isContextuateHook(command) {
    // Normalize the path and check for contextuate emit-event patterns
    const normalized = command.replace(/^~/, os_1.default.homedir());
    return normalized.includes('contextuate') && normalized.includes('emit-event');
}
/**
 * Update Claude settings with hook registrations
 * - Detects existing contextuate hooks (any path format)
 * - Updates them to use the canonical path
 * - Removes duplicates
 * - Adds hooks for any missing hook types
 */
async function updateClaudeHookSettings(hookPath, settingsFile) {
    try {
        const claudeDir = path_1.default.dirname(settingsFile);
        await fs_extra_1.default.ensureDir(claudeDir);
        let settings = {};
        if (await fs_extra_1.default.pathExists(settingsFile)) {
            try {
                const content = await fs_extra_1.default.readFile(settingsFile, 'utf-8');
                settings = JSON.parse(content);
            }
            catch {
                // Start fresh if parsing fails
            }
        }
        // All hook types we want to register
        const hookTypes = [
            'SessionStart',
            'SessionEnd',
            'PreToolUse',
            'PostToolUse',
            'Notification',
            'Stop',
            'SubagentStart',
            'SubagentStop',
            'UserPromptSubmit'
        ];
        // Initialize hooks object if needed
        if (!settings.hooks || typeof settings.hooks !== 'object') {
            settings.hooks = {};
        }
        const hooks = settings.hooks;
        // Process each hook type
        for (const hookType of hookTypes) {
            if (!Array.isArray(hooks[hookType])) {
                hooks[hookType] = [];
            }
            // Filter out any existing contextuate hooks and other duplicates
            const filteredEntries = [];
            let hasContextuateHook = false;
            for (const entry of hooks[hookType]) {
                if (!entry.hooks || !Array.isArray(entry.hooks)) {
                    filteredEntries.push(entry);
                    continue;
                }
                // Filter hooks within this entry
                const nonContextuateHooks = entry.hooks.filter((h) => {
                    if (h.type === 'command' && isContextuateHook(h.command)) {
                        hasContextuateHook = true;
                        return false; // Remove old contextuate hooks
                    }
                    return true;
                });
                // Keep entry if it has other hooks
                if (nonContextuateHooks.length > 0) {
                    filteredEntries.push({ ...entry, hooks: nonContextuateHooks });
                }
            }
            // Add our canonical hook entry
            filteredEntries.push({
                matcher: '',
                hooks: [{ type: 'command', command: hookPath }]
            });
            hooks[hookType] = filteredEntries;
            if (hasContextuateHook) {
                console.log(chalk_1.default.blue(`[INFO] Updated ${hookType} hook to canonical path`));
            }
        }
        // Save settings
        await fs_extra_1.default.writeFile(settingsFile, JSON.stringify(settings, null, 2));
        console.log(chalk_1.default.green(`[OK] Hooks registered in ${settingsFile}`));
    }
    catch (err) {
        console.log(chalk_1.default.yellow(`[WARN] Could not update Claude settings: ${err}`));
    }
}
/**
 * Start monitor server command
 */
async function monitorStartCommand(options) {
    // Attempt migration from old structure
    await migrateToNewStructure();
    // Load configuration
    let config = await loadConfig();
    if (!config) {
        console.log(chalk_1.default.yellow('[WARN] No configuration found. Running init...'));
        console.log('');
        await monitorInitCommand();
        config = await loadConfig();
        if (!config) {
            console.log(chalk_1.default.red('[ERROR] Setup failed or cancelled.'));
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
    await ensureDaemonRunning(config);
    // Check if server is already running
    const serverPid = await getServerPid();
    if (serverPid && isProcessRunning(serverPid)) {
        console.log(chalk_1.default.blue(`[Info] Server already running (PID: ${serverPid})`));
        const url = `http://localhost:${config.server.port}`;
        if (!options.noOpen) {
            openBrowser(url);
        }
        console.log(chalk_1.default.green(`[OK] Monitor: ${url}`));
        process.exit(0);
    }
    // Clean up stale PID file if server not running
    if (serverPid) {
        await fs_extra_1.default.remove(PATHS.serverPidFile);
    }
    // Run in foreground mode if requested
    if (options.foreground) {
        await runServerForeground(config, options);
        return;
    }
    // Start server in background
    await startServerBackground(config, options);
}
/**
 * Run the server in foreground mode (blocking)
 */
async function runServerForeground(config, options) {
    console.log(chalk_1.default.blue('[INFO] Starting Contextuate Monitor in foreground...'));
    console.log('');
    try {
        const { createMonitorServer } = await Promise.resolve().then(() => __importStar(require('../monitor/server')));
        const server = await createMonitorServer({
            config,
            dataDir: PATHS.baseDir
        });
        await server.start();
        const url = `http://localhost:${config.server.port}`;
        if (!options.noOpen) {
            openBrowser(url);
        }
        // Handle shutdown signals
        const shutdown = async () => {
            console.log('');
            console.log(chalk_1.default.blue('[INFO] Shutting down...'));
            await server.stop();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        console.log(chalk_1.default.green('[OK] Monitor is running. Press Ctrl+C to stop.'));
    }
    catch (err) {
        console.error(chalk_1.default.red(`[ERROR] Failed to start server: ${err.message}`));
        process.exit(1);
    }
}
/**
 * Start the server in background mode (non-blocking)
 */
async function startServerBackground(config, options) {
    console.log(chalk_1.default.blue('[INFO] Starting Contextuate Monitor...'));
    // Find the server CLI entry point
    let serverPath = path_1.default.join(__dirname, '..', 'monitor', 'server', 'cli.js');
    if (!await fs_extra_1.default.pathExists(serverPath)) {
        const alternatives = [
            path_1.default.join(__dirname, '..', '..', 'dist', 'monitor', 'server', 'cli.js'),
            path_1.default.join(__dirname, 'monitor', 'server', 'cli.js'),
        ];
        for (const altPath of alternatives) {
            if (await fs_extra_1.default.pathExists(altPath)) {
                serverPath = altPath;
                break;
            }
        }
    }
    if (!await fs_extra_1.default.pathExists(serverPath)) {
        console.log(chalk_1.default.red(`[Error] Server CLI not found at ${serverPath}`));
        console.log(chalk_1.default.yellow('[Info] Try running: npm run build'));
        return;
    }
    // Build command arguments
    const args = [
        serverPath,
        '--config', PATHS.configFile,
    ];
    if (options.port) {
        args.push('--port', options.port.toString());
    }
    if (options.wsPort) {
        args.push('--ws-port', options.wsPort.toString());
    }
    // Ensure log directory exists and open log file
    await fs_extra_1.default.ensureDir(path_1.default.dirname(PATHS.serverLogFile));
    const logFd = fs_extra_1.default.openSync(PATHS.serverLogFile, 'a');
    const child = (0, child_process_1.spawn)(process.execPath, args, {
        detached: true,
        stdio: ['ignore', logFd, logFd],
    });
    // Close file descriptor in parent
    fs_extra_1.default.closeSync(logFd);
    // Write PID file
    await fs_extra_1.default.writeFile(PATHS.serverPidFile, child.pid.toString());
    child.unref();
    // Wait briefly for server to start
    await new Promise(r => setTimeout(r, 1500));
    // Verify server started successfully
    const url = `http://localhost:${config.server.port}`;
    try {
        const response = await fetch(`${url}/api/status`);
        if (response.ok) {
            console.log(chalk_1.default.green(`[OK] Server started (PID: ${child.pid})`));
        }
        else {
            console.log(chalk_1.default.yellow(`[WARN] Server may not have started properly. Check logs: ${PATHS.serverLogFile}`));
        }
    }
    catch {
        console.log(chalk_1.default.yellow(`[WARN] Could not verify server. Check logs: ${PATHS.serverLogFile}`));
    }
    // Open browser
    if (!options.noOpen) {
        openBrowser(url);
    }
    console.log('');
    console.log(chalk_1.default.green(`Monitor: ${url}`));
    console.log(chalk_1.default.blue(`Logs:    ${PATHS.serverLogFile}`));
    console.log('');
    console.log(`To stop: ${chalk_1.default.cyan('contextuate monitor stop')}`);
    // Exit cleanly - background processes are now running independently
    process.exit(0);
}
/**
 * Open browser to URL (fire-and-forget, doesn't block)
 */
function openBrowser(url) {
    const platform = process.platform;
    const command = platform === 'darwin' ? 'open' :
        platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
    try {
        const child = (0, child_process_1.spawn)(command, args, {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();
    }
    catch (err) {
        console.log(chalk_1.default.yellow(`[WARN] Could not open browser. Please open ${url} manually.`));
    }
}
/**
 * Get server PID from PID file
 */
async function getServerPid() {
    try {
        const pidStr = await fs_extra_1.default.readFile(PATHS.serverPidFile, 'utf-8');
        return parseInt(pidStr.trim(), 10);
    }
    catch {
        return null;
    }
}
/**
 * Stop monitor server command
 */
async function monitorStopCommand(options) {
    let stoppedServer = false;
    let stoppedDaemon = false;
    // Stop UI server
    const serverPid = await getServerPid();
    if (serverPid && isProcessRunning(serverPid)) {
        console.log(chalk_1.default.blue(`[INFO] Stopping UI server (PID: ${serverPid})...`));
        try {
            process.kill(serverPid, 'SIGTERM');
            // Wait for process to exit
            let attempts = 0;
            while (isProcessRunning(serverPid) && attempts < 10) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            if (isProcessRunning(serverPid)) {
                console.log(chalk_1.default.yellow('[WARN] Server still running, sending SIGKILL'));
                process.kill(serverPid, 'SIGKILL');
            }
            await fs_extra_1.default.remove(PATHS.serverPidFile);
            console.log(chalk_1.default.green('[OK] UI server stopped'));
            stoppedServer = true;
        }
        catch (err) {
            console.error(chalk_1.default.red(`[ERROR] Failed to stop server: ${err.message}`));
        }
    }
    else {
        if (serverPid) {
            // Clean up stale PID file
            await fs_extra_1.default.remove(PATHS.serverPidFile);
        }
        console.log(chalk_1.default.blue('[INFO] UI server not running'));
    }
    // Stop daemon if --all flag is specified
    if (options.all) {
        const daemonPid = await getDaemonPid();
        if (daemonPid && isProcessRunning(daemonPid)) {
            console.log(chalk_1.default.blue(`[INFO] Stopping daemon (PID: ${daemonPid})...`));
            await monitorDaemonStopCommand();
            stoppedDaemon = true;
        }
        else {
            console.log(chalk_1.default.blue('[INFO] Daemon not running'));
        }
    }
    if (!stoppedServer && !stoppedDaemon) {
        console.log('');
        console.log(chalk_1.default.blue('[INFO] Nothing to stop'));
        if (!options.all) {
            console.log(chalk_1.default.blue('[INFO] Use --all to also stop the daemon'));
        }
    }
}
/**
 * Show monitor status command
 */
async function monitorStatusCommand() {
    const config = await loadConfig();
    console.log(chalk_1.default.blue(''));
    console.log(chalk_1.default.blue('=========================================='));
    console.log(chalk_1.default.blue('  Contextuate Monitor Status'));
    console.log(chalk_1.default.blue('=========================================='));
    console.log('');
    if (!config) {
        console.log(chalk_1.default.yellow('Status: Not configured'));
        console.log('');
        console.log(`Run ${chalk_1.default.cyan('contextuate monitor init')} to set up the monitor.`);
        return;
    }
    // Configuration info
    console.log(chalk_1.default.white('Configuration:'));
    console.log(`  Mode:        ${chalk_1.default.cyan(config.mode)}`);
    console.log(`  HTTP Port:   ${chalk_1.default.cyan(config.server.port)}`);
    console.log(`  WS Port:     ${chalk_1.default.cyan(config.server.wsPort)}`);
    if (config.mode === 'redis') {
        console.log(`  Redis:       ${chalk_1.default.cyan(`${config.redis.host}:${config.redis.port}`)}`);
    }
    else {
        console.log(`  Socket:      ${chalk_1.default.cyan(config.socketPath)}`);
    }
    console.log(`  Persistence: ${chalk_1.default.cyan(config.persistence.type)}`);
    console.log('');
    // Check daemon status
    console.log(chalk_1.default.white('Daemon Status:'));
    const pid = await getDaemonPid();
    if (pid && isProcessRunning(pid)) {
        console.log(`  Status:      ${chalk_1.default.green('Running')} (PID: ${pid})`);
    }
    else {
        console.log(`  Status:      ${chalk_1.default.yellow('Not running')}`);
    }
    console.log('');
    // Check if server is running
    console.log(chalk_1.default.white('UI Server Status:'));
    const serverPid = await getServerPid();
    try {
        const response = await fetch(`http://localhost:${config.server.port}/api/status`);
        if (response.ok) {
            const status = await response.json();
            console.log(`  Status:      ${chalk_1.default.green('Running')}${serverPid ? ` (PID: ${serverPid})` : ''}`);
            console.log(`  Sessions:    ${chalk_1.default.cyan(status.sessions)} total, ${chalk_1.default.cyan(status.activeSessions)} active`);
            console.log(`  Uptime:      ${chalk_1.default.cyan(formatUptime(status.uptime))}`);
            console.log('');
            console.log(`Dashboard: ${chalk_1.default.cyan(`http://localhost:${config.server.port}`)}`);
        }
        else {
            console.log(`  Status:      ${chalk_1.default.red('Error (HTTP ' + response.status + ')')}`);
        }
    }
    catch (err) {
        if (serverPid && isProcessRunning(serverPid)) {
            console.log(`  Status:      ${chalk_1.default.yellow('Starting...')} (PID: ${serverPid})`);
        }
        else {
            if (serverPid) {
                // Clean up stale PID file
                await fs_extra_1.default.remove(PATHS.serverPidFile);
            }
            console.log(`  Status:      ${chalk_1.default.yellow('Not running')}`);
            console.log('');
            console.log(`Start with: ${chalk_1.default.cyan('contextuate monitor')}`);
        }
    }
    console.log('');
}
/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
}
// =============================================================================
// Daemon Management Helper Functions
// =============================================================================
/**
 * Get daemon PID from PID file
 */
async function getDaemonPid() {
    try {
        const pidStr = await fs_extra_1.default.readFile(PATHS.daemonPidFile, 'utf-8');
        return parseInt(pidStr.trim(), 10);
    }
    catch {
        return null;
    }
}
/**
 * Check if a process is running
 */
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0); // Signal 0 just checks if process exists
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Ensure daemon is running
 * - If not running, start it
 * - Clean up stale PID files if process not running
 */
async function ensureDaemonRunning(config) {
    const pid = await getDaemonPid();
    const socketPath = '/tmp/contextuate-daemon.sock';
    if (pid && isProcessRunning(pid)) {
        // Daemon is already running
        console.log(chalk_1.default.green(`[OK] Daemon is running (PID: ${pid})`));
        return;
    }
    if (pid) {
        // PID file exists but process not running - clean up stale files
        console.log(chalk_1.default.blue('[INFO] Cleaning up stale daemon files...'));
        await fs_extra_1.default.remove(PATHS.daemonPidFile);
        try {
            await fs_extra_1.default.remove(socketPath);
        }
        catch {
            // Ignore
        }
    }
    // Start the daemon
    console.log(chalk_1.default.blue('[INFO] Starting daemon...'));
    await monitorDaemonStartCommand({ detach: true });
    // Brief wait for daemon to initialize socket
    await new Promise(r => setTimeout(r, 1000));
    console.log('');
}
// =============================================================================
// Daemon Management Commands
// =============================================================================
/**
 * Start daemon command
 */
async function monitorDaemonStartCommand(options) {
    const config = await loadConfig();
    if (!config) {
        console.log(chalk_1.default.red('[Error] Monitor not initialized. Run: contextuate monitor init'));
        return;
    }
    // Check if already running
    const pid = await getDaemonPid();
    if (pid && isProcessRunning(pid)) {
        console.log(chalk_1.default.blue(`[Info] Daemon already running (PID: ${pid})`));
        return;
    }
    if (options.detach) {
        // Start as background process
        // Find the daemon CLI entry point
        let daemonPath = path_1.default.join(__dirname, '..', 'monitor', 'daemon', 'cli.js');
        if (!await fs_extra_1.default.pathExists(daemonPath)) {
            // Try alternative paths
            const alternatives = [
                path_1.default.join(__dirname, '..', '..', 'dist', 'monitor', 'daemon', 'cli.js'),
                path_1.default.join(__dirname, 'monitor', 'daemon', 'cli.js'),
            ];
            for (const altPath of alternatives) {
                if (await fs_extra_1.default.pathExists(altPath)) {
                    daemonPath = altPath;
                    break;
                }
            }
        }
        if (!await fs_extra_1.default.pathExists(daemonPath)) {
            console.log(chalk_1.default.red(`[Error] Daemon CLI not found at ${daemonPath}`));
            console.log(chalk_1.default.yellow('[Info] Try running: npm run build'));
            return;
        }
        // Ensure log directory exists and open log file for daemon output
        await fs_extra_1.default.ensureDir(path_1.default.dirname(PATHS.daemonLogFile));
        const logFd = fs_extra_1.default.openSync(PATHS.daemonLogFile, 'a');
        const child = (0, child_process_1.spawn)(process.execPath, [
            daemonPath,
            '--config', PATHS.configFile,
        ], {
            detached: true,
            // Use file descriptor directly so daemon doesn't depend on parent's pipes
            stdio: ['ignore', logFd, logFd],
        });
        // Close the file descriptor in the parent - the child has its own copy
        fs_extra_1.default.closeSync(logFd);
        // Write PID file
        await fs_extra_1.default.writeFile(PATHS.daemonPidFile, child.pid.toString());
        child.unref();
        console.log(chalk_1.default.green(`[OK] Daemon started in background (PID: ${child.pid})`));
        console.log(chalk_1.default.blue(`[Info] Logs: ${PATHS.daemonLogFile}`));
    }
    else {
        // Run in foreground
        console.log(chalk_1.default.blue('[Info] Starting daemon in foreground (Ctrl+C to stop)'));
        const { startDaemon } = await Promise.resolve().then(() => __importStar(require('../monitor/daemon/index.js')));
        const daemon = await startDaemon(config);
        // Handle shutdown
        const shutdown = async () => {
            console.log('');
            console.log(chalk_1.default.blue('[Info] Shutting down daemon...'));
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
async function monitorDaemonStopCommand() {
    const pid = await getDaemonPid();
    if (!pid) {
        console.log(chalk_1.default.blue('[Info] Daemon not running (no PID file)'));
        return;
    }
    if (!isProcessRunning(pid)) {
        console.log(chalk_1.default.blue('[Info] Daemon not running (stale PID file)'));
        await fs_extra_1.default.remove(PATHS.daemonPidFile);
        return;
    }
    try {
        process.kill(pid, 'SIGTERM');
        console.log(chalk_1.default.green(`[OK] Sent shutdown signal to daemon (PID: ${pid})`));
        // Wait for process to exit
        let attempts = 0;
        while (isProcessRunning(pid) && attempts < 10) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }
        if (isProcessRunning(pid)) {
            console.log(chalk_1.default.yellow('[Warning] Daemon still running, sending SIGKILL'));
            process.kill(pid, 'SIGKILL');
        }
        await fs_extra_1.default.remove(PATHS.daemonPidFile);
        console.log(chalk_1.default.green('[OK] Daemon stopped'));
    }
    catch (err) {
        console.error(chalk_1.default.red(`[Error] Failed to stop daemon: ${err.message}`));
    }
}
/**
 * Show daemon status command
 */
async function monitorDaemonStatusCommand() {
    const pid = await getDaemonPid();
    if (!pid) {
        console.log('Daemon: not running (no PID file)');
        return;
    }
    if (isProcessRunning(pid)) {
        console.log(`Daemon: ${chalk_1.default.green('running')} (PID: ${pid})`);
        console.log(`Logs:   ${PATHS.daemonLogFile}`);
    }
    else {
        console.log('Daemon: not running (stale PID file)');
        await fs_extra_1.default.remove(PATHS.daemonPidFile);
    }
}
/**
 * View daemon logs command
 */
async function monitorDaemonLogsCommand(options) {
    const lines = options.lines || 50;
    try {
        await fs_extra_1.default.access(PATHS.daemonLogFile);
    }
    catch {
        console.log(chalk_1.default.blue('[Info] No daemon log file found'));
        return;
    }
    if (options.follow) {
        // Use tail -f
        const tail = (0, child_process_1.spawn)('tail', ['-f', '-n', lines.toString(), PATHS.daemonLogFile], {
            stdio: 'inherit',
        });
        process.on('SIGINT', () => {
            tail.kill();
            process.exit(0);
        });
    }
    else {
        // Read last N lines
        const content = await fs_extra_1.default.readFile(PATHS.daemonLogFile, 'utf-8');
        const allLines = content.split('\n');
        const lastLines = allLines.slice(-lines).join('\n');
        console.log(lastLines);
    }
}
