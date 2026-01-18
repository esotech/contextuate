import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

// Platform definitions with metadata
const PLATFORMS = [
    { id: 'agents', name: 'Agents.ai', src: 'templates/platforms/AGENTS.md', dest: 'AGENTS.md' },
    { id: 'antigravity', name: 'Antigravity', src: 'templates/platforms/GEMINI.md', dest: '.gemini/rules.md', ensureDir: '.gemini' },
    { id: 'claude', name: 'Claude Code', src: 'templates/platforms/CLAUDE.md', dest: 'CLAUDE.md', symlinks: true },
    { id: 'cline', name: 'Cline', src: 'templates/platforms/clinerules.md', dest: '.clinerules/cline-memory-bank.md', ensureDir: '.clinerules' },
    { id: 'cursor', name: 'Cursor IDE', src: 'templates/platforms/cursor.mdc', dest: '.cursor/rules/project.mdc', ensureDir: '.cursor/rules' },
    { id: 'gemini', name: 'Google Gemini', src: 'templates/platforms/GEMINI.md', dest: 'GEMINI.md' },
    { id: 'copilot', name: 'GitHub Copilot', src: 'templates/platforms/copilot.md', dest: '.github/copilot-instructions.md', ensureDir: '.github' },
    { id: 'windsurf', name: 'Windsurf IDE', src: 'templates/platforms/windsurf.md', dest: '.windsurf/rules/project.md', ensureDir: '.windsurf/rules' },
];

// Fuzzy match platform names
function fuzzyMatchPlatform(input: string): string | null {
    const normalized = input.toLowerCase().trim();

    // Direct ID match
    const directMatch = PLATFORMS.find(p => p.id === normalized);
    if (directMatch) {
        return directMatch.id;
    }

    // Partial match - starts with or includes
    const partialMatch = PLATFORMS.find(p =>
        p.id.startsWith(normalized) ||
        p.name.toLowerCase().includes(normalized)
    );
    if (partialMatch) {
        return partialMatch.id;
    }

    // Special case for common variations
    if (normalized === 'github' || normalized === 'copilot') {
        return 'copilot';
    }

    return null;
}

export async function initCommand(platformArgs: string[] | { force?: boolean, agents?: string[] }, options?: { force?: boolean, agents?: string[] }) {
    // Handle both old signature (no args) and new signature (with variadic args)
    // When called with no args: first param is options object
    // When called with args: first param is array, second param is options
    let platforms: string[] = [];
    let opts: { force?: boolean, agents?: string[] } = {};

    if (Array.isArray(platformArgs)) {
        platforms = platformArgs;
        opts = options || {};
    } else {
        // Old signature - first param is actually options
        opts = platformArgs || {};
        platforms = [];
    }
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Installer              ║'));
    console.log(chalk.blue('║     AI Context Framework               ║'));
    console.log(chalk.blue('║                                        ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    try {
        // Determine if running in non-interactive mode
        const nonInteractive = platforms.length > 0;

        // Check for project markers
        const projectMarkers = ['.git', 'package.json', 'composer.json', 'Cargo.toml', 'go.mod'];
        const hasMarker = projectMarkers.some(marker => fs.existsSync(marker));

        if (!hasMarker && !nonInteractive) {
            console.log(chalk.yellow('[WARN] No project markers found (.git, package.json, etc.)'));
            const { continueAnyway } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'continueAnyway',
                    message: 'Continue anyway?',
                    default: true,
                },
            ]);

            if (!continueAnyway) {
                console.log(chalk.blue('[INFO] Installation cancelled.'));
                return;
            }
        } else if (!hasMarker && nonInteractive) {
            console.log(chalk.yellow('[WARN] No project markers found (.git, package.json, etc.) - continuing anyway in non-interactive mode'));
        }

        let selectedPlatforms: typeof PLATFORMS = [];

        // Non-interactive mode - process CLI arguments
        if (nonInteractive) {
            // Check for "all" argument
            if (platforms.some(arg => arg.toLowerCase() === 'all')) {
                selectedPlatforms = PLATFORMS;
                console.log(chalk.blue('[INFO] Installing all platforms'));
            } else {
                // Fuzzy match each platform argument
                for (const arg of platforms) {
                    const matchedId = fuzzyMatchPlatform(arg);
                    if (matchedId) {
                        const platform = PLATFORMS.find(p => p.id === matchedId);
                        if (platform && !selectedPlatforms.includes(platform)) {
                            selectedPlatforms.push(platform);
                            console.log(chalk.green(`[OK] Matched "${arg}" to ${platform.name}`));
                        }
                    } else {
                        console.log(chalk.yellow(`[WARN] Could not match platform "${arg}" - skipping`));
                    }
                }

                if (selectedPlatforms.length === 0) {
                    console.log(chalk.red('[ERROR] No valid platforms matched. Available platforms:'));
                    PLATFORMS.forEach(p => console.log(`  - ${p.id} (${p.name})`));
                    return;
                }
            }
        } else {
            // Interactive mode - ask about platform selection
            const { platforms } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'platforms',
                    message: 'Select the platforms to install:',
                    choices: [
                        { name: 'Select All', value: 'all' },
                        new inquirer.Separator(),
                        ...PLATFORMS.map(p => ({
                            name: p.name,
                            value: p.id,
                            checked: false,
                        }))
                    ],
                    validate: (answer) => {
                        if (answer.length < 1) {
                            return 'You must select at least one platform.';
                        }
                        return true;
                    },
                },
            ]);

            if (platforms.includes('all')) {
                selectedPlatforms = PLATFORMS;
            } else {
                selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id));
            }
        }

        // Handle agent installation
        let selectedAgents: string[] = [];

        // Dynamically discover available agents from template source
        let agentTemplateDir = path.join(__dirname, '../templates/agents');

        // Handle ts-node vs compiled paths
        if (path.basename(path.join(__dirname, '..')) === 'src') {
            agentTemplateDir = path.join(__dirname, '../../src/templates/agents');
        } else if (path.basename(__dirname) === 'commands') {
            agentTemplateDir = path.join(__dirname, '../templates/agents');
        }

        if (!fs.existsSync(agentTemplateDir)) {
            agentTemplateDir = path.join(__dirname, '../../templates/agents');
        }

        let availableAgents: string[] = [];
        if (fs.existsSync(agentTemplateDir)) {
            const agentFiles = await fs.readdir(agentTemplateDir);
            availableAgents = agentFiles
                .filter(f => f.endsWith('.md'))
                .map(f => f.replace('.md', ''));
        }

        if (opts.agents && opts.agents.length > 0) {
            // Non-interactive agent selection via --agents flag
            if (opts.agents.includes('none')) {
                // Explicitly skip agent installation
                console.log(chalk.blue('[INFO] Skipping agent installation (--agents none)'));
            } else if (opts.agents.includes('all')) {
                selectedAgents = availableAgents;
                console.log(chalk.blue('[INFO] Installing all agents'));
            } else {
                // Match specific agents
                for (const agentArg of opts.agents) {
                    const normalized = agentArg.toLowerCase().trim();
                    const matched = availableAgents.find(a => a.toLowerCase() === normalized);
                    if (matched) {
                        selectedAgents.push(matched);
                        console.log(chalk.green(`[OK] Matched agent "${agentArg}" to ${matched}`));
                    } else {
                        console.log(chalk.yellow(`[WARN] Could not match agent "${agentArg}" - skipping`));
                    }
                }

                if (selectedAgents.length === 0 && opts.agents.length > 0) {
                    console.log(chalk.yellow('[WARN] No valid agents matched. Available agents:'));
                    availableAgents.forEach(a => console.log(`  - ${a}`));
                }
            }
        } else if (!nonInteractive) {
            // Interactive mode - ask about agent installation
            const { installAgents } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'installAgents',
                    message: 'Would you like to install pre-built AI agents?',
                    default: true,
                },
            ]);

            if (installAgents && availableAgents.length > 0) {
                const { agents } = await inquirer.prompt([
                    {
                        type: 'checkbox',
                        name: 'agents',
                        message: 'Select agents to install:',
                        choices: [
                            { name: 'Select All', value: 'all' },
                            new inquirer.Separator(),
                            ...availableAgents.map(agent => ({
                                name: agent.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                                value: agent,
                                checked: false,
                            }))
                        ],
                    },
                ]);

                if (agents.includes('all')) {
                    selectedAgents = availableAgents;
                } else {
                    selectedAgents = agents;
                }
            }
        } else {
            // Non-interactive mode without --agents flag: default to all agents
            selectedAgents = availableAgents;
            console.log(chalk.blue('[INFO] Installing all agents (default in non-interactive mode)'));
        }

        console.log('');
        console.log(chalk.blue('[INFO] Installing Contextuate framework...'));
        console.log('');

        // 1. Create directory structure
        console.log(chalk.blue('[INFO] Creating directory structure...'));
        const dirs = [
            'docs/ai/.contextuate/standards',
            'docs/ai/.contextuate/tools',
            'docs/ai/.contextuate/agents',
            'docs/ai/agents',
            'docs/ai/standards',
            'docs/ai/quickrefs',
            'docs/ai/tasks',
            'docs/ai/commands',
            'docs/ai/hooks',
            'docs/ai/skills',
        ];

        for (const dir of dirs) {
            await fs.ensureDir(dir);
            console.log(chalk.green(`[OK] Created directory: ${dir}`));
        }

        // Cleanup legacy template directories if they exist
        const legacyDirs = [
            'docs/ai/.contextuate/templates',
        ];

        for (const dir of legacyDirs) {
            if (fs.existsSync(dir)) {
                await fs.remove(dir);
                console.log(chalk.yellow(`[CLEANUP] Removed legacy directory: ${dir}`));
            }
        }
        console.log('');

        // 2. Copy templates
        console.log(chalk.blue('[INFO] Installing framework files...'));

        // In development (ts-node), this is ../../src/templates relative to src/commands/init.ts
        // In production (dist), this is ../templates relative to dist/commands/init.js
        let templateSource = path.join(__dirname, '../templates');

        // If running from src/commands (ts-node), we need to go up one more level if structure is src/commands/init.ts
        if (path.basename(path.join(__dirname, '..')) === 'src') {
            templateSource = path.join(__dirname, '../../src/templates');
        } else if (path.basename(__dirname) === 'commands') {
            // dist/commands/init.js -> dist/templates
            templateSource = path.join(__dirname, '../templates');
        }

        // Fallback/Verify
        if (!fs.existsSync(templateSource)) {
            // Try one level up just in case
            templateSource = path.join(__dirname, '../../templates');
        }

        if (!fs.existsSync(templateSource)) {
            console.error(chalk.red(`[ERROR] Could not find template source at ${templateSource}`));
            return;
        }

        const installDir = 'docs/ai/.contextuate';

        // Helper to copy files
        const copyFile = async (src: string, dest: string) => {
            // Resolve absolute paths to check for equality
            const absSrc = path.resolve(src);
            const absDest = path.resolve(dest);

            if (absSrc === absDest) {
                return;
            }

            if (!fs.existsSync(src)) {
                console.log(chalk.red(`[ERROR] Source file missing: ${src}`));
                return;
            }

            if (fs.existsSync(dest) && !opts.force) {
                console.log(chalk.yellow(`[WARN] Skipped (exists): ${dest}`));
                return;
            }
            await fs.copy(src, dest);
            console.log(chalk.green(`[OK] Created: ${dest}`));
        };

        // Copy core engine files only to .contextuate
        await copyFile(path.join(templateSource, 'version.json'), path.join(installDir, 'version.json'));
        await copyFile(path.join(templateSource, 'README.md'), path.join(installDir, 'README.md'));

        // Copy directories - only core framework files
        const copyDirContents = async (srcSubDir: string, destDir: string) => {
            const srcDir = path.join(templateSource, srcSubDir);
            if (fs.existsSync(srcDir)) {
                await fs.ensureDir(destDir);
                const files = await fs.readdir(srcDir);
                for (const file of files) {
                    await copyFile(path.join(srcDir, file), path.join(destDir, file));
                }
            }
        };

        // Copy core standards, tools, and framework agents to .contextuate (engine files)
        await copyDirContents('standards', path.join(installDir, 'standards'));
        await copyDirContents('tools', path.join(installDir, 'tools'));
        await copyDirContents('framework-agents', path.join(installDir, 'agents'));

        console.log(chalk.green('[OK] Copied framework files'));
        console.log('');

        // 3. Install selected agents to docs/ai/agents/
        if (selectedAgents.length > 0) {
            console.log(chalk.blue('[INFO] Installing selected agents...'));

            for (const agent of selectedAgents) {
                const agentFile = `${agent}.md`;
                const srcPath = path.join(templateSource, 'agents', agentFile);
                const destPath = path.join('docs/ai/agents', agentFile);

                await copyFile(srcPath, destPath);
            }

            console.log(chalk.green(`[OK] Installed ${selectedAgents.length} agent(s) to docs/ai/agents/`));
            console.log('');
        }

        // 4. Setup project context files
        console.log(chalk.blue('[INFO] Setting up project context...'));
        // Copy contextuate.md (main entry point) directly from templates to docs/ai/.contextuate/ (protected)
        await copyFile(path.join(templateSource, 'templates/contextuate.md'), 'docs/ai/.contextuate/contextuate.md');
        // Copy context.md (user customizable) directly from templates to docs/ai/
        await copyFile(path.join(templateSource, 'templates/context.md'), 'docs/ai/context.md');
        console.log('');

        // 5. Generate jump files for selected platforms
        console.log(chalk.blue('[INFO] Generating platform jump files...'));

        for (const platform of selectedPlatforms) {
            if (platform.ensureDir) {
                await fs.ensureDir(platform.ensureDir);
            }
            // Copy directly from template source, not from .contextuate
            await copyFile(path.join(templateSource, platform.src), platform.dest);
        }
        console.log('');

        // 6. Create platform-specific symlinks (only for platforms that need them)
        const platformsWithSymlinks = selectedPlatforms.filter(p => p.symlinks);

        if (platformsWithSymlinks.length > 0) {
            console.log(chalk.blue('[INFO] Creating platform symlinks...'));

            // Helper to create symlinks
            const createSymlink = async (target: string, linkPath: string) => {
                const linkDir = path.dirname(linkPath);
                await fs.ensureDir(linkDir);

                // Calculate relative path from link location to target
                const relativeTarget = path.relative(linkDir, target);

                // Check if symlink already exists
                try {
                    const existingLink = await fs.readlink(linkPath);
                    if (existingLink === relativeTarget) {
                        console.log(chalk.yellow(`[WARN] Symlink exists: ${linkPath} -> ${relativeTarget}`));
                        return;
                    }
                    // Remove existing symlink if it points elsewhere
                    await fs.remove(linkPath);
                } catch {
                    // Not a symlink or doesn't exist
                    if (fs.existsSync(linkPath)) {
                        if (opts.force) {
                            await fs.remove(linkPath);
                        } else {
                            console.log(chalk.yellow(`[WARN] Skipped (path exists): ${linkPath}`));
                            return;
                        }
                    }
                }

                await fs.ensureSymlink(relativeTarget, linkPath);
                console.log(chalk.green(`[OK] Symlink: ${linkPath} -> ${relativeTarget}`));
            };

            // Create symlinks for Claude Code
            if (selectedPlatforms.some(p => p.id === 'claude')) {
                const symlinks = [
                    { target: 'docs/ai/commands', link: '.claude/commands' },
                    { target: 'docs/ai/agents', link: '.claude/agents' },
                    { target: 'docs/ai/hooks', link: '.claude/hooks' },
                    { target: 'docs/ai/skills', link: '.claude/skills' },
                    // Link .contextuate so relative paths from agents work correctly
                    // (e.g., ../.contextuate/agents/base.md resolves properly)
                    { target: 'docs/ai/.contextuate', link: '.claude/.contextuate' },
                ];

                for (const symlink of symlinks) {
                    await createSymlink(symlink.target, symlink.link);
                }
            }
            console.log('');
        }


        console.log(chalk.green('╔════════════════════════════════════════╗'));
        console.log(chalk.green('║     Installation Complete!             ║'));
        console.log(chalk.green('╚════════════════════════════════════════╝'));
        console.log('');
        console.log('Installed platforms:');
        for (const platform of selectedPlatforms) {
            console.log(`  - ${chalk.cyan(platform.name)} (${platform.dest})`);
        }
        console.log('');
        if (selectedAgents.length > 0) {
            console.log('Installed agents:');
            for (const agent of selectedAgents) {
                console.log(`  - ${chalk.cyan(agent)} (docs/ai/agents/${agent}.md)`);
            }
            console.log('');
        }
        console.log('Next steps:');
        console.log('');
        console.log(`  1. Edit ${chalk.blue('docs/ai/context.md')} with your project details`);
        if (selectedAgents.length > 0) {
            console.log(`  2. Review installed agents in ${chalk.blue('docs/ai/agents/')}`);
            console.log(`  3. Add custom agents or quickrefs as needed`);
        } else {
            console.log(`  2. Create custom agents in ${chalk.blue('docs/ai/agents/')}`);
            console.log(`  3. Add quickrefs in ${chalk.blue('docs/ai/quickrefs/')}`);
        }
        console.log('');
        console.log('');
        console.log('Documentation: https://contextuate.md');
        console.log('');
        console.log(chalk.gray('Contextuate Framework'));
        console.log(chalk.gray('Created by Alexander Conroy (@geilt)'));
        console.log('');
    } catch (error: any) {
        if (error.isTtyError) {
            // Prompt couldn't be rendered in the current environment
            console.error(chalk.red('[ERROR] Prompt could not be rendered in the current environment'));
        } else if (error.name === 'ExitPromptError' || error.message.includes('User force closed the prompt')) {
            console.log('');
            console.log(chalk.yellow('👋 Installation cancelled by user.'));
            process.exit(0);
        } else {
            // Something else went wrong
            console.error(chalk.red('[ERROR] An unexpected error occurred:'), error);
            process.exit(1);
        }
    }
}
