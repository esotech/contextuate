import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';

interface AgentConfig {
    name?: string;
    description?: string;
    version?: string;
    capabilities?: string[];
    context?: {
        files?: string[];
        directories?: string[];
    };
    env?: string[];
    provider?: { type: string; model: string; };
}

import { GitManager } from '../utils/git';
import { estimateTokens } from '../utils/tokens';

// ... imports
import { LLMDriver } from '../runtime/driver';

export async function runCommand(agentName: string, options: { dryRun?: boolean, isolation?: string, goal?: string, task?: string }) {
    console.log(chalk.blue(`[INFO] Launching Agent: ${agentName}`));

    if (options.goal) {
        console.log(chalk.bold('Goal: ') + options.goal);
    }

    // 1. Locate the agent file
    const agentPath = path.join(process.cwd(), 'docs/ai/agents', `${agentName}.agent.md`);

    if (!fs.existsSync(agentPath)) {
        console.error(chalk.red(`[ERROR] Agent definition not found at: ${agentPath}`));
        console.log(chalk.yellow(`Available agents:`));
        try {
            const files = await fs.readdir(path.join(process.cwd(), 'docs/ai/agents'));
            files.forEach(f => {
                if (f.endsWith('.agent.md')) {
                    console.log(`- ${f.replace('.agent.md', '')}`);
                }
            });
        } catch (e) {
            console.log(chalk.red('Could not list agents directory.'));
        }
        process.exit(1);
    }

    // 2. Parse the definition
    let config: AgentConfig;
    try {
        const fileContent = await fs.readFile(agentPath, 'utf-8');
        const parsed = matter(fileContent);
        config = parsed.data as AgentConfig;

        // Add default provider config if missing
        if (!config.provider) {
            config.provider = { type: 'mock', model: 'test' };
        }

        console.log(chalk.green(`[OK] Loaded agent definition`));
    } catch (error) {
        console.error(chalk.red('[ERROR] Failed to parse agent definition:'), error);
        process.exit(1);
    }

    // 3. Prepare Runtime
    const git = new GitManager(process.cwd());
    const isGit = await git.isGitRepo();

    let runtimeCwd = process.cwd();
    let sessionId = Date.now().toString();

    if (options.isolation === 'worktree') {
        if (!isGit) {
            console.error(chalk.red('[ERROR] --isolation=worktree require a git repository.'));
            process.exit(1);
        }

        console.log(chalk.blue('[INFO] Setting up Git Worktree...'));
        try {
            runtimeCwd = await git.createWorktree(config.name || agentName, sessionId);
            console.log(chalk.green(`[OK] Worktree created at: ${runtimeCwd}`));
        } catch (e: any) {
            console.error(chalk.red(`[ERROR] Failed to create worktree: ${e.message}`));
            process.exit(1);
        }
    }

    // 4. Simulate Execution (or Dry Run)
    console.log(chalk.bold('\nAgent Runtime Environment:'));
    console.log(`Working Directory: ${chalk.yellow(runtimeCwd)}`);
    console.log(`Agent: ${config.name || agentName}`);

    // Validate Configuration involves checking if requires fields exist
    if (config.name && config.name !== agentName) {
        console.warn(chalk.yellow(`[WARN] filename '${agentName}' does not match agent name '${config.name}'`));
    }

    console.log(chalk.bold('\nAgent Configuration:'));
    console.log(`Name: ${config.name || agentName}`);
    console.log(`Description: ${config.description || 'No description provided'}`);

    if (config.capabilities && config.capabilities.length > 0) {
        console.log(chalk.bold('\nCapabilities:'));
        config.capabilities.forEach(cap => console.log(`- ${cap}`));
    }

    if (config.env && config.env.length > 0) {
        console.log(chalk.bold('\nRequired Environment:'));
        const missingEnv: string[] = [];
        config.env.forEach(envVar => {
            const exists = process.env[envVar] !== undefined;
            const status = exists ? chalk.green('OK') : chalk.red('MISSING');
            console.log(`- ${envVar}: ${status}`);
            if (!exists) missingEnv.push(envVar);
        });

        if (missingEnv.length > 0) {
            console.warn(chalk.yellow(`[WARN] Missing ${missingEnv.length} environment variables.`));
        }
    }

    const extraContext: string[] = [];

    if (options.task) {
        console.log(chalk.bold('\nTask Context:'));
        const taskPath = path.join(process.cwd(), 'docs/ai/tasks', options.task);
        if (!fs.existsSync(taskPath)) {
            console.error(chalk.red(`[ERROR] Task not found at: ${taskPath}`));
            process.exit(1);
        }

        const scopeFile = path.join(taskPath, '00-project-scope.md');
        if (fs.existsSync(scopeFile)) {
            console.log(`- Scope: ${chalk.green('FOUND')} (${scopeFile})`);
            config.context = config.context || {};
            config.context.files = config.context.files || [];
            config.context.files.push(scopeFile);
            extraContext.push(scopeFile);
        } else {
            console.warn(chalk.yellow(`[WARN] Task scope not found: ${scopeFile}`));
        }

        // Find latest log
        const logsDir = path.join(taskPath, 'logs');
        if (fs.existsSync(logsDir)) {
            const logFiles = await fs.readdir(logsDir);
            const latestLog = logFiles.sort().reverse()[0];
            if (latestLog) {
                const logPath = path.join(logsDir, latestLog);
                console.log(`- Latest Log: ${chalk.green('FOUND')} (${logPath})`);
                config.context = config.context || {};
                config.context.files = config.context.files || [];
                config.context.files.push(logPath);
                extraContext.push(logPath);
            }
        }
    }

    // Inject Project Structure Index if available
    const indexFile = path.join(process.cwd(), 'docs/ai/project-structure.md');
    if (await fs.pathExists(indexFile)) {
        console.log(`- Project Index: ${chalk.green('FOUND')} (${indexFile})`);
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
            const checkPath = path.isAbsolute(file) ? file : path.join(runtimeCwd, file);
            const exists = await fs.pathExists(checkPath);
            const status = exists ? chalk.green('FOUND') : chalk.red('MISSING');

            let fileTokens = 0;
            if (exists) {
                const content = await fs.readFile(checkPath, 'utf-8');
                fileTokens = estimateTokens(content);
                totalTokens += fileTokens;
            }

            console.log(`- ${file}: ${status} (${fileTokens} tokens)`);
        }

        console.log(chalk.cyan(`\nTotal Context Size: ~${totalTokens} tokens`));
        if (totalTokens > 32000) {
            console.log(chalk.yellow(`[WARN] Context size is quite large (>32k). Consider removing files.`));
        }

        if (config.context.directories) {
            config.context.directories.forEach(d => console.log(`- [DIR]  ${d}`));
        }
    }

    if (!options.dryRun) {
        // Here we would spawn the actual agent process or loop
        console.log(chalk.magenta('\n*** AGENT EXECUTION STARTED ***'));

        try {
            const driver = new LLMDriver(
                {
                    provider: (config as any).provider?.type || 'mock',
                    model: (config as any).provider?.model || 'test',
                    capabilities: config.capabilities || []
                },
                options.goal || 'No explicit goal provided.',
                runtimeCwd,
                (config.context?.files || []).map(f => path.isAbsolute(f) ? f : path.join(runtimeCwd, f))
            );
            await driver.run();
        } catch (e: any) {
            console.error(chalk.red(`[ERROR] Execution failed: ${e.message}`));
        }

        console.log(chalk.magenta('*** AGENT EXECUTION FINISHED ***'));

        // If worktree, ask to commit or verify
        if (options.isolation === 'worktree') {
            // For prototype, we just mention it
            console.log(chalk.yellow(`\n[INFO] Worktree is preserved at: ${runtimeCwd}`));
            console.log(`Inspect changes there, then delete with: git worktree remove "${runtimeCwd}"`);
        }
    } else {
        // Cleanup worktree immediately in dry-run to avoid litter
        if (options.isolation === 'worktree') {
            console.log(chalk.blue('\n[INFO] Cleaning up dry-run worktree...'));
            await git.removeWorktree(runtimeCwd);
            console.log(chalk.green('[OK] Worktree removed.'));
        }
    }
}
