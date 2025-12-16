"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const git_1 = require("../utils/git");
const tokens_1 = require("../utils/tokens");
// ... imports
const driver_1 = require("../runtime/driver");
async function runCommand(agentName, options) {
    console.log(chalk_1.default.blue(`[INFO] Launching Agent: ${agentName}`));
    if (options.goal) {
        console.log(chalk_1.default.bold('Goal: ') + options.goal);
    }
    // 1. Locate the agent file
    const agentPath = path_1.default.join(process.cwd(), 'docs/ai/agents', `${agentName}.md`);
    if (!fs_extra_1.default.existsSync(agentPath)) {
        console.error(chalk_1.default.red(`[ERROR] Agent definition not found at: ${agentPath}`));
        console.log(chalk_1.default.yellow(`Available agents:`));
        try {
            const files = await fs_extra_1.default.readdir(path_1.default.join(process.cwd(), 'docs/ai/agents'));
            files.forEach(f => {
                if (f.endsWith('.md')) {
                    console.log(`- ${f.replace('.md', '')}`);
                }
            });
        }
        catch (e) {
            console.log(chalk_1.default.red('Could not list agents directory.'));
        }
        process.exit(1);
    }
    // 2. Parse the definition
    let config;
    try {
        const fileContent = await fs_extra_1.default.readFile(agentPath, 'utf-8');
        const parsed = (0, gray_matter_1.default)(fileContent);
        config = parsed.data;
        // Add default provider config if missing
        if (!config.provider) {
            config.provider = { type: 'mock', model: 'test' };
        }
        console.log(chalk_1.default.green(`[OK] Loaded agent definition`));
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Failed to parse agent definition:'), error);
        process.exit(1);
    }
    // 3. Prepare Runtime
    const git = new git_1.GitManager(process.cwd());
    const isGit = await git.isGitRepo();
    let runtimeCwd = process.cwd();
    let sessionId = Date.now().toString();
    if (options.isolation === 'worktree') {
        if (!isGit) {
            console.error(chalk_1.default.red('[ERROR] --isolation=worktree require a git repository.'));
            process.exit(1);
        }
        console.log(chalk_1.default.blue('[INFO] Setting up Git Worktree...'));
        try {
            runtimeCwd = await git.createWorktree(config.name || agentName, sessionId);
            console.log(chalk_1.default.green(`[OK] Worktree created at: ${runtimeCwd}`));
        }
        catch (e) {
            console.error(chalk_1.default.red(`[ERROR] Failed to create worktree: ${e.message}`));
            process.exit(1);
        }
    }
    // 4. Simulate Execution (or Dry Run)
    console.log(chalk_1.default.bold('\nAgent Runtime Environment:'));
    console.log(`Working Directory: ${chalk_1.default.yellow(runtimeCwd)}`);
    console.log(`Agent: ${config.name || agentName}`);
    // Validate Configuration involves checking if requires fields exist
    if (config.name && config.name !== agentName) {
        console.warn(chalk_1.default.yellow(`[WARN] filename '${agentName}' does not match agent name '${config.name}'`));
    }
    console.log(chalk_1.default.bold('\nAgent Configuration:'));
    console.log(`Name: ${config.name || agentName}`);
    console.log(`Description: ${config.description || 'No description provided'}`);
    if (config.capabilities && config.capabilities.length > 0) {
        console.log(chalk_1.default.bold('\nCapabilities:'));
        config.capabilities.forEach(cap => console.log(`- ${cap}`));
    }
    if (config.env && config.env.length > 0) {
        console.log(chalk_1.default.bold('\nRequired Environment:'));
        const missingEnv = [];
        config.env.forEach(envVar => {
            const exists = process.env[envVar] !== undefined;
            const status = exists ? chalk_1.default.green('OK') : chalk_1.default.red('MISSING');
            console.log(`- ${envVar}: ${status}`);
            if (!exists)
                missingEnv.push(envVar);
        });
        if (missingEnv.length > 0) {
            console.warn(chalk_1.default.yellow(`[WARN] Missing ${missingEnv.length} environment variables.`));
        }
    }
    const extraContext = [];
    if (options.task) {
        console.log(chalk_1.default.bold('\nTask Context:'));
        const taskPath = path_1.default.join(process.cwd(), 'docs/ai/tasks', options.task);
        if (!fs_extra_1.default.existsSync(taskPath)) {
            console.error(chalk_1.default.red(`[ERROR] Task not found at: ${taskPath}`));
            process.exit(1);
        }
        const scopeFile = path_1.default.join(taskPath, '00-project-scope.md');
        if (fs_extra_1.default.existsSync(scopeFile)) {
            console.log(`- Scope: ${chalk_1.default.green('FOUND')} (${scopeFile})`);
            config.context = config.context || {};
            config.context.files = config.context.files || [];
            config.context.files.push(scopeFile);
            extraContext.push(scopeFile);
        }
        else {
            console.warn(chalk_1.default.yellow(`[WARN] Task scope not found: ${scopeFile}`));
        }
        // Find latest log
        const logsDir = path_1.default.join(taskPath, 'logs');
        if (fs_extra_1.default.existsSync(logsDir)) {
            const logFiles = await fs_extra_1.default.readdir(logsDir);
            const latestLog = logFiles.sort().reverse()[0];
            if (latestLog) {
                const logPath = path_1.default.join(logsDir, latestLog);
                console.log(`- Latest Log: ${chalk_1.default.green('FOUND')} (${logPath})`);
                config.context = config.context || {};
                config.context.files = config.context.files || [];
                config.context.files.push(logPath);
                extraContext.push(logPath);
            }
        }
    }
    // Inject Project Structure Index if available
    const indexFile = path_1.default.join(process.cwd(), 'docs/ai/project-structure.md');
    if (await fs_extra_1.default.pathExists(indexFile)) {
        console.log(`- Project Index: ${chalk_1.default.green('FOUND')} (${indexFile})`);
        config.context = config.context || {};
        config.context.files = config.context.files || [];
        // Avoid duplicates
        if (!config.context.files.includes(indexFile)) {
            config.context.files.unshift(indexFile); // Add to beginning
        }
    }
    if (config.context) {
        console.log('\nLoading Context:');
        // In a real implementation we would copy these files or process them
        // For now we just verify they exist from the perspective of the runtimeCwd
        const files = config.context.files || [];
        let totalTokens = 0;
        for (const file of files) {
            // Check if absolute path (from task loading) or relative
            const checkPath = path_1.default.isAbsolute(file) ? file : path_1.default.join(runtimeCwd, file);
            const exists = await fs_extra_1.default.pathExists(checkPath);
            const status = exists ? chalk_1.default.green('FOUND') : chalk_1.default.red('MISSING');
            let fileTokens = 0;
            if (exists) {
                const content = await fs_extra_1.default.readFile(checkPath, 'utf-8');
                fileTokens = (0, tokens_1.estimateTokens)(content);
                totalTokens += fileTokens;
            }
            console.log(`- ${file}: ${status} (${fileTokens} tokens)`);
        }
        console.log(chalk_1.default.cyan(`\nTotal Context Size: ~${totalTokens} tokens`));
        if (totalTokens > 32000) {
            console.log(chalk_1.default.yellow(`[WARN] Context size is quite large (>32k). Consider removing files.`));
        }
        if (config.context.directories) {
            config.context.directories.forEach(d => console.log(`- [DIR]  ${d}`));
        }
    }
    if (!options.dryRun) {
        // Here we would spawn the actual agent process or loop
        console.log(chalk_1.default.magenta('\n*** AGENT EXECUTION STARTED ***'));
        try {
            const driver = new driver_1.LLMDriver({
                provider: config.provider?.type || 'mock',
                model: config.provider?.model || 'test',
                capabilities: config.capabilities || []
            }, options.goal || 'No explicit goal provided.', runtimeCwd, (config.context?.files || []).map(f => path_1.default.isAbsolute(f) ? f : path_1.default.join(runtimeCwd, f)));
            await driver.run();
        }
        catch (e) {
            console.error(chalk_1.default.red(`[ERROR] Execution failed: ${e.message}`));
        }
        console.log(chalk_1.default.magenta('*** AGENT EXECUTION FINISHED ***'));
        // If worktree, ask to commit or verify
        if (options.isolation === 'worktree') {
            // For prototype, we just mention it
            console.log(chalk_1.default.yellow(`\n[INFO] Worktree is preserved at: ${runtimeCwd}`));
            console.log(`Inspect changes there, then delete with: git worktree remove "${runtimeCwd}"`);
        }
    }
    else {
        // Cleanup worktree immediately in dry-run to avoid litter
        if (options.isolation === 'worktree') {
            console.log(chalk_1.default.blue('\n[INFO] Cleaning up dry-run worktree...'));
            await git.removeWorktree(runtimeCwd);
            console.log(chalk_1.default.green('[OK] Worktree removed.'));
        }
    }
}
