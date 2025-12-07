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
}

import { GitManager } from '../utils/git';

export async function runCommand(agentName: string, options: { dryRun?: boolean, isolation?: string }) {
    console.log(chalk.blue(`[INFO] Launching Agent: ${agentName}`));

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

    if (config.context) {
        console.log('\nLoading Context:');
        // In a real implementation we would copy these files or process them
        // For now we just verify they exist from the perspective of the runtimeCwd
        const files = config.context.files || [];
        for (const file of files) {
            const exists = await fs.pathExists(path.join(runtimeCwd, file));
            console.log(`- ${file}: ${exists ? chalk.green('FOUND') : chalk.red('MISSING')}`);
        }
        if (config.context.directories) {
            config.context.directories.forEach(d => console.log(`- [DIR]  ${d}`));
        }
    }

    if (!options.dryRun) {
        // Here we would spawn the actual agent process or loop
        console.log(chalk.magenta('\n*** AGENT EXECUTION STARTED ***'));
        console.log('(Agent would perform work here)');
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
