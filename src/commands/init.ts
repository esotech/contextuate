import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { readFileSync } from 'fs';
import {
    detectTools,
    promptInstallTools,
    processTemplateVariables,
    writeContextuateConfig,
    printToolStatus,
    ContextuateConfig,
    ToolsConfig
} from '../utils/tools';

// Get package version dynamically
function getPackageVersion(): string {
    try {
        const packageJson = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
        return packageJson.version;
    } catch {
        return '0.0.0';
    }
}

// Get package info for contextuate.json
function getPackageInfo(): { name: string; version: string; description: string; repository: string } {
    try {
        const packageJson = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
        return {
            name: packageJson.name || 'contextuate',
            version: packageJson.version || '0.0.0',
            description: packageJson.description || 'AI Context Framework',
            repository: packageJson.repository?.url?.replace('git+', '').replace('.git', '') || 'https://github.com/esotech/contextuate'
        };
    } catch {
        return {
            name: 'contextuate',
            version: '0.0.0',
            description: 'AI Context Framework',
            repository: 'https://github.com/esotech/contextuate'
        };
    }
}

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

// Get template source directory
function getTemplateSource(): string {
    let templateSource = path.join(__dirname, '../templates');

    // Handle ts-node vs compiled paths
    if (path.basename(path.join(__dirname, '..')) === 'src') {
        templateSource = path.join(__dirname, '../../src/templates');
    } else if (path.basename(__dirname) === 'commands') {
        templateSource = path.join(__dirname, '../templates');
    }

    if (!fs.existsSync(templateSource)) {
        templateSource = path.join(__dirname, '../../templates');
    }

    return templateSource;
}

// Discover available agents from template source
async function discoverAgents(templateSource: string): Promise<string[]> {
    const agentDir = path.join(templateSource, 'agents');
    if (!fs.existsSync(agentDir)) {
        return [];
    }

    const files = await fs.readdir(agentDir);
    return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
}

// Discover available skills from template source
async function discoverSkills(templateSource: string): Promise<string[]> {
    const commandsDir = path.join(templateSource, 'commands');
    if (!fs.existsSync(commandsDir)) {
        return [];
    }

    const files = await fs.readdir(commandsDir);
    return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
}

export async function initCommand(platformArgs: string[] | { force?: boolean }, options?: { force?: boolean }) {
    // Handle both old signature (no args) and new signature (with variadic args)
    let platforms: string[] = [];
    let opts: { force?: boolean } = {};

    if (Array.isArray(platformArgs)) {
        platforms = platformArgs;
        opts = options || {};
    } else {
        opts = platformArgs || {};
        platforms = [];
    }

    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Installer              ║'));
    console.log(chalk.blue('║     AI Context Framework               ║'));
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
            console.log(chalk.yellow('[WARN] No project markers found - continuing anyway'));
        }

        // Get template source
        const templateSource = getTemplateSource();

        if (!fs.existsSync(templateSource)) {
            console.error(chalk.red(`[ERROR] Could not find template source at ${templateSource}`));
            return;
        }

        // Determine selected platforms
        let selectedPlatforms: typeof PLATFORMS = [];

        if (nonInteractive) {
            // Non-interactive: parse CLI arguments
            if (platforms.some(arg => arg.toLowerCase() === 'all')) {
                selectedPlatforms = PLATFORMS;
                console.log(chalk.blue('[INFO] Installing all platforms'));
            } else {
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
            // Interactive: default to Claude Code (opinionated)
            const claudePlatform = PLATFORMS.find(p => p.id === 'claude');
            if (claudePlatform) {
                selectedPlatforms = [claudePlatform];
                console.log(chalk.blue(`[INFO] Installing for ${claudePlatform.name} (default)`));
            }

            // Ask if they want additional platforms
            const { addMorePlatforms } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'addMorePlatforms',
                    message: 'Would you like to add other platforms?',
                    default: false,
                },
            ]);

            if (addMorePlatforms) {
                const otherPlatforms = PLATFORMS.filter(p => p.id !== 'claude');
                const { additionalPlatforms } = await inquirer.prompt([
                    {
                        type: 'checkbox',
                        name: 'additionalPlatforms',
                        message: 'Select additional platforms:',
                        choices: otherPlatforms.map(p => ({
                            name: p.name,
                            value: p.id,
                            checked: false,
                        })),
                    },
                ]);

                for (const platformId of additionalPlatforms) {
                    const platform = PLATFORMS.find(p => p.id === platformId);
                    if (platform) {
                        selectedPlatforms.push(platform);
                    }
                }
            }
        }

        // Discover all agents and skills
        const availableAgents = await discoverAgents(templateSource);
        const availableSkills = await discoverSkills(templateSource);

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

        // Cleanup legacy directories
        const legacyDirs = ['docs/ai/.contextuate/templates'];
        for (const dir of legacyDirs) {
            if (fs.existsSync(dir)) {
                await fs.remove(dir);
                console.log(chalk.yellow(`[CLEANUP] Removed legacy directory: ${dir}`));
            }
        }

        // Cleanup legacy version.json (replaced by contextuate.json)
        const legacyVersionJson = 'docs/ai/.contextuate/version.json';
        if (fs.existsSync(legacyVersionJson)) {
            await fs.remove(legacyVersionJson);
            console.log(chalk.yellow(`[CLEANUP] Removed legacy version.json (migrated to contextuate.json)`));
        }

        console.log('');

        // 2. Detect tools
        console.log(chalk.blue('[INFO] Checking for optional tools...'));
        let tools = detectTools();
        printToolStatus(tools);

        // Offer to install missing tools
        tools = await promptInstallTools(tools, nonInteractive);

        console.log('');

        // 3. Copy framework files
        console.log(chalk.blue('[INFO] Installing framework files...'));

        const installDir = 'docs/ai/.contextuate';

        // Helper to copy and process files
        const copyFile = async (src: string, dest: string, processTemplates: boolean = false) => {
            const absSrc = path.resolve(src);
            const absDest = path.resolve(dest);

            if (absSrc === absDest) return;

            if (!fs.existsSync(src)) {
                console.log(chalk.red(`[ERROR] Source file missing: ${src}`));
                return;
            }

            // Only context.md is protected from overwrites
            const isContextMd = path.basename(dest) === 'context.md';
            if (isContextMd && fs.existsSync(dest)) {
                console.log(chalk.yellow(`[PRESERVE] Kept existing: ${dest}`));
                return;
            }

            let content = await fs.readFile(src, 'utf-8');

            // Process template variables if needed
            if (processTemplates && dest.endsWith('.md')) {
                content = processTemplateVariables(content, tools);
            }

            await fs.ensureDir(path.dirname(dest));
            await fs.writeFile(dest, content);
            console.log(chalk.green(`[OK] Created: ${dest}`));
        };

        // Copy directories with template processing
        const copyDirContents = async (srcSubDir: string, destDir: string, processTemplates: boolean = false) => {
            const srcDir = path.join(templateSource, srcSubDir);
            if (fs.existsSync(srcDir)) {
                await fs.ensureDir(destDir);
                const files = await fs.readdir(srcDir);
                for (const file of files) {
                    await copyFile(path.join(srcDir, file), path.join(destDir, file), processTemplates);
                }
            }
        };

        // Copy README
        await copyFile(path.join(templateSource, 'README.md'), path.join(installDir, 'README.md'));

        // Copy core standards, tools, and framework agents
        await copyDirContents('standards', path.join(installDir, 'standards'));
        await copyDirContents('tools', path.join(installDir, 'tools'));
        await copyDirContents('framework-agents', path.join(installDir, 'agents'));

        console.log(chalk.green('[OK] Copied framework files'));
        console.log('');

        // 4. Install ALL agents (opinionated - no prompt)
        if (availableAgents.length > 0) {
            console.log(chalk.blue(`[INFO] Installing agents (${availableAgents.length} agents)...`));

            for (const agent of availableAgents) {
                const srcPath = path.join(templateSource, 'agents', `${agent}.md`);
                const destPath = path.join('docs/ai/agents', `${agent}.md`);
                await copyFile(srcPath, destPath, true); // Process templates
            }

            console.log(chalk.green(`[OK] Installed ${availableAgents.length} agent(s)`));
            console.log('');
        }

        // 5. Install ALL skills (opinionated - no prompt)
        if (availableSkills.length > 0) {
            console.log(chalk.blue(`[INFO] Installing skills (${availableSkills.length} skills)...`));

            for (const skill of availableSkills) {
                const srcPath = path.join(templateSource, 'commands', `${skill}.md`);
                const destPath = path.join('docs/ai/commands', `${skill}.md`);
                await copyFile(srcPath, destPath, true); // Process templates
            }

            console.log(chalk.green(`[OK] Installed ${availableSkills.length} skill(s)`));
            console.log('');
        }

        // 6. Setup project context files
        console.log(chalk.blue('[INFO] Setting up project context...'));
        await copyFile(path.join(templateSource, 'templates/contextuate.md'), 'docs/ai/.contextuate/contextuate.md');
        await copyFile(path.join(templateSource, 'templates/context.md'), 'docs/ai/context.md');
        console.log('');

        // 7. Generate platform files
        console.log(chalk.blue('[INFO] Generating platform files...'));

        for (const platform of selectedPlatforms) {
            if (platform.ensureDir) {
                await fs.ensureDir(platform.ensureDir);
            }
            await copyFile(path.join(templateSource, platform.src), platform.dest);
        }
        console.log('');

        // 8. Create symlinks for platforms that need them
        const platformsWithSymlinks = selectedPlatforms.filter(p => p.symlinks);

        if (platformsWithSymlinks.length > 0) {
            console.log(chalk.blue('[INFO] Creating platform symlinks...'));

            const createSymlink = async (target: string, linkPath: string) => {
                const linkDir = path.dirname(linkPath);
                await fs.ensureDir(linkDir);

                const relativeTarget = path.relative(linkDir, target);

                try {
                    const existingLink = await fs.readlink(linkPath);
                    if (existingLink === relativeTarget) {
                        console.log(chalk.yellow(`[SKIP] Symlink exists: ${linkPath}`));
                        return;
                    }
                    await fs.remove(linkPath);
                } catch {
                    if (fs.existsSync(linkPath)) {
                        await fs.remove(linkPath);
                    }
                }

                await fs.ensureSymlink(relativeTarget, linkPath);
                console.log(chalk.green(`[OK] Symlink: ${linkPath} -> ${relativeTarget}`));
            };

            // Claude Code symlinks
            if (selectedPlatforms.some(p => p.id === 'claude')) {
                const symlinks = [
                    { target: 'docs/ai/commands', link: '.claude/commands' },
                    { target: 'docs/ai/agents', link: '.claude/agents' },
                    { target: 'docs/ai/hooks', link: '.claude/hooks' },
                    { target: 'docs/ai/skills', link: '.claude/skills' },
                    { target: 'docs/ai/.contextuate', link: '.claude/.contextuate' },
                ];

                for (const symlink of symlinks) {
                    await createSymlink(symlink.target, symlink.link);
                }
            }
            console.log('');
        }

        // 9. Create contextuate.json
        console.log(chalk.blue('[INFO] Creating contextuate.json...'));

        const pkgInfo = getPackageInfo();
        const now = new Date().toISOString();

        const config: ContextuateConfig = {
            ...pkgInfo,
            initialized: now,
            updated: now,
            tools
        };

        await writeContextuateConfig(installDir, config);
        console.log(chalk.green('[OK] Created contextuate.json'));
        console.log('');

        // Summary
        console.log(chalk.green('╔════════════════════════════════════════╗'));
        console.log(chalk.green('║     Installation Complete!             ║'));
        console.log(chalk.green('╚════════════════════════════════════════╝'));
        console.log('');
        console.log('Installed platforms:');
        for (const platform of selectedPlatforms) {
            console.log(`  - ${chalk.cyan(platform.name)} (${platform.dest})`);
        }
        console.log('');
        console.log(`Installed: ${chalk.cyan(availableAgents.length)} agents, ${chalk.cyan(availableSkills.length)} skills`);
        console.log('');

        // Tool status summary
        if (tools.ripgrep.installed) {
            console.log(`Search tool: ${chalk.green('ripgrep')} (fast)`);
        } else {
            console.log(`Search tool: ${chalk.yellow('grep')} (fallback - consider installing ripgrep)`);
        }
        console.log('');

        console.log('Next steps:');
        console.log('');
        console.log(`  1. Edit ${chalk.blue('docs/ai/context.md')} with your project details`);
        console.log(`  2. Review agents in ${chalk.blue('docs/ai/agents/')}`);
        console.log(`  3. Run ${chalk.blue('contextuate doctor')} to check configuration`);
        console.log('');
        console.log('Documentation: https://contextuate.md');
        console.log('');

    } catch (error: any) {
        if (error.isTtyError) {
            console.error(chalk.red('[ERROR] Prompt could not be rendered in the current environment'));
        } else if (error.name === 'ExitPromptError' || error.message.includes('User force closed the prompt')) {
            console.log('');
            console.log(chalk.yellow('Installation cancelled by user.'));
            process.exit(0);
        } else {
            console.error(chalk.red('[ERROR] An unexpected error occurred:'), error);
            process.exit(1);
        }
    }
}
