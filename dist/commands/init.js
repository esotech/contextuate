"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = initCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
async function initCommand(options) {
    console.log(chalk_1.default.blue('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.blue('║     Contextuate Installer              ║'));
    console.log(chalk_1.default.blue('║     AI Context Framework               ║'));
    console.log(chalk_1.default.blue('╚════════════════════════════════════════╝'));
    console.log('');
    // Check for project markers
    const projectMarkers = ['.git', 'package.json', 'composer.json', 'Cargo.toml', 'go.mod'];
    const hasMarker = projectMarkers.some(marker => fs_extra_1.default.existsSync(marker));
    if (!hasMarker) {
        console.log(chalk_1.default.yellow('[WARN] No project markers found (.git, package.json, etc.)'));
        const { continueAnyway } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'continueAnyway',
                message: 'Continue anyway?',
                default: false,
            },
        ]);
        if (!continueAnyway) {
            console.log(chalk_1.default.blue('[INFO] Installation cancelled.'));
            return;
        }
    }
    console.log(chalk_1.default.blue('[INFO] Installing Contextuate framework...'));
    console.log('');
    // 1. Create directory structure
    console.log(chalk_1.default.blue('[INFO] Creating directory structure...'));
    const dirs = [
        'docs/ai/.contextuate/templates/platforms',
        'docs/ai/.contextuate/templates/standards',
        'docs/ai/.contextuate/agents',
        'docs/ai/.contextuate/standards',
        'docs/ai/.contextuate/bin',
        'docs/ai/.contextuate/tools',
        'docs/ai/agents',
        'docs/ai/standards',
        'docs/ai/quickrefs',
        'docs/ai/tasks',
        'docs/ai/commands',
    ];
    for (const dir of dirs) {
        await fs_extra_1.default.ensureDir(dir);
        console.log(chalk_1.default.green(`[OK] Created directory: ${dir}`));
    }
    console.log('');
    // 2. Copy templates
    console.log(chalk_1.default.blue('[INFO] Installing framework files...'));
    // Define source directory (where the package is installed)
    // In development, this is likely ../../docs/ai/.contextuate relative to this file
    // In production (dist), it might be different. We need to handle both.
    let templateSource = path_1.default.join(__dirname, '../../docs/ai/.contextuate');
    if (!fs_extra_1.default.existsSync(templateSource)) {
        // Try resolving from package root if running from dist
        templateSource = path_1.default.join(__dirname, '../../../docs/ai/.contextuate');
    }
    if (!fs_extra_1.default.existsSync(templateSource)) {
        console.error(chalk_1.default.red(`[ERROR] Could not find template source at ${templateSource}`));
        return;
    }
    const installDir = 'docs/ai/.contextuate';
    // Helper to copy files
    const copyFile = async (src, dest) => {
        // Resolve absolute paths to check for equality
        const absSrc = path_1.default.resolve(src);
        const absDest = path_1.default.resolve(dest);
        if (absSrc === absDest) {
            // console.log(chalk.gray(`[DEBUG] Skipped (same file): ${dest}`));
            return;
        }
        if (fs_extra_1.default.existsSync(dest) && !options.force) {
            console.log(chalk_1.default.yellow(`[WARN] Skipped (exists): ${dest}`));
            return;
        }
        await fs_extra_1.default.copy(src, dest);
        console.log(chalk_1.default.green(`[OK] Created: ${dest}`));
    };
    // Copy version.json and README.md
    await copyFile(path_1.default.join(templateSource, 'version.json'), path_1.default.join(installDir, 'version.json'));
    await copyFile(path_1.default.join(templateSource, 'README.md'), path_1.default.join(installDir, 'README.md'));
    // Copy directories
    const copyDirContents = async (subDir) => {
        const srcDir = path_1.default.join(templateSource, subDir);
        const destDir = path_1.default.join(installDir, subDir);
        if (fs_extra_1.default.existsSync(srcDir)) {
            const files = await fs_extra_1.default.readdir(srcDir);
            for (const file of files) {
                await copyFile(path_1.default.join(srcDir, file), path_1.default.join(destDir, file));
            }
        }
    };
    await copyDirContents('templates/platforms');
    await copyDirContents('templates/standards');
    await copyFile(path_1.default.join(templateSource, 'templates/contextuate.md'), path_1.default.join(installDir, 'templates/contextuate.md'));
    await copyFile(path_1.default.join(templateSource, 'templates/context.md'), path_1.default.join(installDir, 'templates/context.md'));
    await copyDirContents('agents');
    await copyDirContents('standards');
    await copyDirContents('bin');
    await copyDirContents('tools');
    console.log(chalk_1.default.green('[OK] Copied framework files'));
    console.log('');
    // 3. Setup project context files
    console.log(chalk_1.default.blue('[INFO] Setting up project context...'));
    // Copy contextuate.md (main entry point) to docs/ai/
    await copyFile(path_1.default.join(installDir, 'templates/contextuate.md'), 'docs/ai/contextuate.md');
    // Copy context.md (user customizable) to docs/ai/
    await copyFile(path_1.default.join(installDir, 'templates/context.md'), 'docs/ai/context.md');
    console.log('');
    // 4. Generate jump files
    console.log(chalk_1.default.blue('[INFO] Generating platform jump files...'));
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
            await fs_extra_1.default.ensureDir(file.ensureDir);
        }
        await copyFile(path_1.default.join(installDir, file.src), file.dest);
    }
    console.log('');
    // 5. Create platform-specific symlinks to centralized directories
    console.log(chalk_1.default.blue('[INFO] Creating platform symlinks...'));
    // Helper to create symlinks
    const createSymlink = async (target, linkPath) => {
        const linkDir = path_1.default.dirname(linkPath);
        await fs_extra_1.default.ensureDir(linkDir);
        // Calculate relative path from link location to target
        const relativeTarget = path_1.default.relative(linkDir, target);
        // Check if symlink already exists
        try {
            const existingLink = await fs_extra_1.default.readlink(linkPath);
            if (existingLink === relativeTarget) {
                console.log(chalk_1.default.yellow(`[WARN] Symlink exists: ${linkPath} -> ${relativeTarget}`));
                return;
            }
            // Remove existing symlink if it points elsewhere
            await fs_extra_1.default.remove(linkPath);
        }
        catch {
            // Not a symlink or doesn't exist
            if (fs_extra_1.default.existsSync(linkPath)) {
                if (options.force) {
                    await fs_extra_1.default.remove(linkPath);
                }
                else {
                    console.log(chalk_1.default.yellow(`[WARN] Skipped (path exists): ${linkPath}`));
                    return;
                }
            }
        }
        await fs_extra_1.default.ensureSymlink(relativeTarget, linkPath);
        console.log(chalk_1.default.green(`[OK] Symlink: ${linkPath} -> ${relativeTarget}`));
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
    console.log(chalk_1.default.blue('[INFO] Updating .gitignore...'));
    const gitignoreEntries = [
        '',
        '# Contextuate - Framework files',
        'docs/ai/.contextuate/',
        'docs/ai/contextuate.md',
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
    if (fs_extra_1.default.existsSync(gitignorePath)) {
        const content = await fs_extra_1.default.readFile(gitignorePath, 'utf-8');
        if (!content.includes('# Contextuate - Framework files')) {
            await fs_extra_1.default.appendFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
            console.log(chalk_1.default.green('[OK] Added Contextuate entries to .gitignore'));
        }
        else {
            console.log(chalk_1.default.yellow('[WARN] Contextuate entries already in .gitignore'));
        }
    }
    else {
        await fs_extra_1.default.writeFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
        console.log(chalk_1.default.green('[OK] Created .gitignore with Contextuate entries'));
    }
    console.log('');
    console.log(chalk_1.default.green('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.green('║     Installation Complete!             ║'));
    console.log(chalk_1.default.green('╚════════════════════════════════════════╝'));
    console.log('');
    console.log('Next steps:');
    console.log('');
    console.log(`  1. Edit ${chalk_1.default.blue('docs/ai/context.md')} with your project details`);
    console.log(`  2. Create custom agents in ${chalk_1.default.blue('docs/ai/agents/')}`);
    console.log(`  3. Add quickrefs in ${chalk_1.default.blue('docs/ai/quickrefs/')}`);
    console.log('');
    console.log('Documentation: https://contextuate.md');
    console.log('');
}
