import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function initCommand(options: { force?: boolean }) {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Installer              ║'));
    console.log(chalk.blue('║     AI Context Framework               ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    // Check for project markers
    const projectMarkers = ['.git', 'package.json', 'composer.json', 'Cargo.toml', 'go.mod'];
    const hasMarker = projectMarkers.some(marker => fs.existsSync(marker));

    if (!hasMarker) {
        console.log(chalk.yellow('[WARN] No project markers found (.git, package.json, etc.)'));
        const { continueAnyway } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'continueAnyway',
                message: 'Continue anyway?',
                default: false,
            },
        ]);

        if (!continueAnyway) {
            console.log(chalk.blue('[INFO] Installation cancelled.'));
            return;
        }
    }

    console.log(chalk.blue('[INFO] Installing Contextuate framework...'));
    console.log('');

    // 1. Create directory structure
    console.log(chalk.blue('[INFO] Creating directory structure...'));
    const dirs = [
        'docs/ai/.context/templates/platforms',
        'docs/ai/.context/templates/standards',
        'docs/ai/.context/agents',
        'docs/ai/.context/standards',
        'docs/ai/.context/bin',
        'docs/ai/.context/tools',
        'docs/ai/agents',
        'docs/ai/standards',
        'docs/ai/quickrefs',
        'docs/ai/tasks',
        'docs/ai/commands',
    ];

    for (const dir of dirs) {
        await fs.ensureDir(dir);
        console.log(chalk.green(`[OK] Created directory: ${dir}`));
    }
    console.log('');

    // 2. Copy templates
    console.log(chalk.blue('[INFO] Installing framework files...'));

    // Define source directory (where the package is installed)
    // In development, this is likely ../../docs/ai/.context relative to this file
    // In production (dist), it might be different. We need to handle both.
    let templateSource = path.join(__dirname, '../../docs/ai/.context');
    if (!fs.existsSync(templateSource)) {
        // Try resolving from package root if running from dist
        templateSource = path.join(__dirname, '../../../docs/ai/.context');
    }

    if (!fs.existsSync(templateSource)) {
        console.error(chalk.red(`[ERROR] Could not find template source at ${templateSource}`));
        return;
    }

    const installDir = 'docs/ai/.context';

    // Helper to copy files
    const copyFile = async (src: string, dest: string) => {
        // Resolve absolute paths to check for equality
        const absSrc = path.resolve(src);
        const absDest = path.resolve(dest);

        if (absSrc === absDest) {
            // console.log(chalk.gray(`[DEBUG] Skipped (same file): ${dest}`));
            return;
        }

        if (fs.existsSync(dest) && !options.force) {
            console.log(chalk.yellow(`[WARN] Skipped (exists): ${dest}`));
            return;
        }
        await fs.copy(src, dest);
        console.log(chalk.green(`[OK] Created: ${dest}`));
    };

    // Copy version.json and README.md
    await copyFile(path.join(templateSource, 'version.json'), path.join(installDir, 'version.json'));
    await copyFile(path.join(templateSource, 'README.md'), path.join(installDir, 'README.md'));

    // Copy directories
    const copyDirContents = async (subDir: string) => {
        const srcDir = path.join(templateSource, subDir);
        const destDir = path.join(installDir, subDir);
        if (fs.existsSync(srcDir)) {
            const files = await fs.readdir(srcDir);
            for (const file of files) {
                await copyFile(path.join(srcDir, file), path.join(destDir, file));
            }
        }
    };

    await copyDirContents('templates/platforms');
    await copyDirContents('templates/standards');
    await copyFile(path.join(templateSource, 'templates/context.md'), path.join(installDir, 'templates/context.md'));

    await copyDirContents('agents');
    await copyDirContents('standards');
    await copyDirContents('bin');
    await copyDirContents('tools');

    console.log(chalk.green('[OK] Copied framework files'));
    console.log('');

    // 3. Setup project context
    console.log(chalk.blue('[INFO] Setting up project context...'));
    await copyFile(path.join(installDir, 'templates/context.md'), 'docs/ai/context.md');
    console.log('');

    // 4. Generate jump files
    console.log(chalk.blue('[INFO] Generating platform jump files...'));

    const jumpFiles = [
        { src: 'templates/platforms/CLAUDE.md', dest: 'CLAUDE.md' },
        { src: 'templates/platforms/AGENTS.md', dest: 'AGENTS.md' },
        { src: 'templates/platforms/GEMINI.md', dest: 'GEMINI.md' },
        { src: 'templates/platforms/clinerules.md', dest: '.clinerules/cline-memory-bank.md', ensureDir: '.clinerules' },
        { src: 'templates/platforms/copilot.md', dest: '.github/copilot-instructions.md', ensureDir: '.github' },
        { src: 'templates/platforms/cursor.mdc', dest: '.cursor/rules/project.mdc', ensureDir: '.cursor/rules' },
        { src: 'templates/platforms/windsurf.md', dest: '.windsurf/rules/project.md', ensureDir: '.windsurf/rules' },
        { src: 'templates/platforms/antigravity.md', dest: '.antigravity/rules.md', ensureDir: '.antigravity' },
    ];

    for (const file of jumpFiles) {
        if (file.ensureDir) {
            await fs.ensureDir(file.ensureDir);
        }
        await copyFile(path.join(installDir, file.src), file.dest);
    }
    console.log('');

    // 5. Create platform-specific symlinks to centralized directories
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
                if (options.force) {
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

    // Define symlinks: platform-specific locations -> centralized docs/ai directories
    const symlinks = [
        { target: 'docs/ai/commands', link: '.claude/commands' },
        { target: 'docs/ai/agents', link: '.claude/agents' },
    ];

    for (const symlink of symlinks) {
        await createSymlink(symlink.target, symlink.link);
    }
    console.log('');

    // 6. Update .gitignore
    console.log(chalk.blue('[INFO] Updating .gitignore...'));

    const gitignoreEntries = [
        '',
        '# Contextuate - Framework files',
        'docs/ai/.context/',
        'docs/ai/tasks/',
        '',
        '# Contextuate - Generated Artifacts (DO NOT EDIT)',
        'CLAUDE.md',
        'AGENTS.md',
        'GEMINI.md',
        '.clinerules/',
        '.cursor/rules/project.mdc',
        '.windsurf/rules/project.md',
        '.antigravity/rules.md',
        '.github/copilot-instructions.md',
        '',
        '# Contextuate - Platform symlinks (symlinks to docs/ai/)',
        '.claude/',
    ];

    const gitignorePath = '.gitignore';
    if (fs.existsSync(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        if (!content.includes('# Contextuate - Framework files')) {
            await fs.appendFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
            console.log(chalk.green('[OK] Added Contextuate entries to .gitignore'));
        } else {
            console.log(chalk.yellow('[WARN] Contextuate entries already in .gitignore'));
        }
    } else {
        await fs.writeFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
        console.log(chalk.green('[OK] Created .gitignore with Contextuate entries'));
    }
    console.log('');

    console.log(chalk.green('╔════════════════════════════════════════╗'));
    console.log(chalk.green('║     Installation Complete!             ║'));
    console.log(chalk.green('╚════════════════════════════════════════╝'));
    console.log('');
    console.log('Next steps:');
    console.log('');
    console.log(`  1. Edit ${chalk.blue('docs/ai/context.md')} with your project details`);
    console.log(`  2. Create custom agents in ${chalk.blue('docs/ai/agents/')}`);
    console.log(`  3. Add quickrefs in ${chalk.blue('docs/ai/quickrefs/')}`);
    console.log('');
    console.log('Documentation: https://contextuate.md');
    console.log('');
}
