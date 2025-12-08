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
// Platform definitions with metadata
const PLATFORMS = [
    { id: 'claude', name: 'Claude Code', src: 'templates/platforms/CLAUDE.md', dest: 'CLAUDE.md', symlinks: true },
    { id: 'agents', name: 'Agents.ai', src: 'templates/platforms/AGENTS.md', dest: 'AGENTS.md' },
    { id: 'gemini', name: 'Google Gemini', src: 'templates/platforms/GEMINI.md', dest: 'GEMINI.md' },
    { id: 'cline', name: 'Cline', src: 'templates/platforms/clinerules.md', dest: '.clinerules/cline-memory-bank.md', ensureDir: '.clinerules' },
    { id: 'copilot', name: 'GitHub Copilot', src: 'templates/platforms/copilot.md', dest: '.github/copilot-instructions.md', ensureDir: '.github' },
    { id: 'cursor', name: 'Cursor IDE', src: 'templates/platforms/cursor.mdc', dest: '.cursor/rules/project.mdc', ensureDir: '.cursor/rules' },
    { id: 'windsurf', name: 'Windsurf IDE', src: 'templates/platforms/windsurf.md', dest: '.windsurf/rules/project.md', ensureDir: '.windsurf/rules' },
    { id: 'antigravity', name: 'Antigravity', src: 'templates/platforms/antigravity.md', dest: '.antigravity/rules.md', ensureDir: '.antigravity' },
];
async function initCommand(options) {
    console.log(chalk_1.default.blue('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.blue('║     Contextuate Installer              ║'));
    console.log(chalk_1.default.blue('║     AI Context Framework               ║'));
    console.log(chalk_1.default.blue('║     Powered by Esotech                 ║'));
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
    // Ask about platform selection
    // Ask about platform selection
    const { platformChoice } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'platformChoice',
            message: 'Which platforms would you like to install jump files for?',
            choices: [
                { name: 'All platforms', value: 'all' },
                { name: 'Search platform by name', value: 'search' },
                { name: 'Select specific platform(s)', value: 'select' },
            ],
        },
    ]);
    let selectedPlatforms = [];
    if (platformChoice === 'all') {
        selectedPlatforms = PLATFORMS;
    }
    else if (platformChoice === 'search') {
        const { searchTerm } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'searchTerm',
                message: 'Enter platform name to search (e.g. "gemini"):',
                validate: (input) => input.length > 0 || 'Please enter a search term',
            },
        ]);
        const term = searchTerm.toLowerCase();
        const matches = PLATFORMS.filter(p => p.name.toLowerCase().includes(term) ||
            p.id.toLowerCase().includes(term));
        if (matches.length === 0) {
            console.log(chalk_1.default.yellow(`No platforms found matching "${searchTerm}"`));
            return;
        }
        const { platforms } = await inquirer_1.default.prompt([
            {
                type: 'checkbox',
                name: 'platforms',
                message: 'Select the platforms to install:',
                choices: matches.map(p => ({
                    name: p.name,
                    value: p.id,
                    checked: true,
                })),
                validate: (answer) => {
                    if (answer.length < 1) {
                        return 'You must select at least one platform.';
                    }
                    return true;
                },
            },
        ]);
        selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id));
    }
    else {
        const { platforms } = await inquirer_1.default.prompt([
            {
                type: 'checkbox',
                name: 'platforms',
                message: 'Select the platforms to install:',
                choices: PLATFORMS.map(p => ({
                    name: p.name,
                    value: p.id,
                    checked: false,
                })),
                validate: (answer) => {
                    if (answer.length < 1) {
                        return 'You must select at least one platform.';
                    }
                    return true;
                },
            },
        ]);
        selectedPlatforms = PLATFORMS.filter(p => platforms.includes(p.id));
    }
    console.log('');
    console.log(chalk_1.default.blue('[INFO] Installing Contextuate framework...'));
    console.log('');
    // 1. Create directory structure
    console.log(chalk_1.default.blue('[INFO] Creating directory structure...'));
    const dirs = [
        'docs/ai/.contextuate/templates/platforms',
        'docs/ai/.contextuate/templates/standards',
        'docs/ai/.contextuate/agents',
        'docs/ai/.contextuate/standards',
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
            return;
        }
        if (!fs_extra_1.default.existsSync(src)) {
            console.log(chalk_1.default.red(`[ERROR] Source file missing: ${src}`));
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
    await copyDirContents('tools');
    console.log(chalk_1.default.green('[OK] Copied framework files'));
    console.log('');
    // 3. Setup project context files
    console.log(chalk_1.default.blue('[INFO] Setting up project context...'));
    // Copy contextuate.md (main entry point) to docs/ai/.contextuate/ (protected)
    await copyFile(path_1.default.join(installDir, 'templates/contextuate.md'), 'docs/ai/.contextuate/contextuate.md');
    // Copy context.md (user customizable) to docs/ai/
    await copyFile(path_1.default.join(installDir, 'templates/context.md'), 'docs/ai/context.md');
    console.log('');
    // 4. Generate jump files for selected platforms
    console.log(chalk_1.default.blue('[INFO] Generating platform jump files...'));
    for (const platform of selectedPlatforms) {
        if (platform.ensureDir) {
            await fs_extra_1.default.ensureDir(platform.ensureDir);
        }
        await copyFile(path_1.default.join(installDir, platform.src), platform.dest);
    }
    console.log('');
    // 5. Create platform-specific symlinks (only for platforms that need them)
    const platformsWithSymlinks = selectedPlatforms.filter(p => p.symlinks);
    if (platformsWithSymlinks.length > 0) {
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
        // Create symlinks for Claude Code
        if (selectedPlatforms.some(p => p.id === 'claude')) {
            const symlinks = [
                { target: 'docs/ai/commands', link: '.claude/commands' },
                { target: 'docs/ai/agents', link: '.claude/agents' },
            ];
            for (const symlink of symlinks) {
                await createSymlink(symlink.target, symlink.link);
            }
        }
        console.log('');
    }
    // 6. Update .gitignore
    console.log(chalk_1.default.blue('[INFO] Updating .gitignore...'));
    const { addToGitignore } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'addToGitignore',
            message: 'Do you want to add Contextuate framework files to .gitignore? (Select No to commit them to git)',
            default: true,
        },
    ]);
    // Build gitignore entries based on selected platforms
    const gitignoreEntries = [];
    if (addToGitignore) {
        gitignoreEntries.push('');
        gitignoreEntries.push('# Contextuate - AI task tracking (user-specific)');
        gitignoreEntries.push('docs/ai/tasks/');
        gitignoreEntries.push('');
        gitignoreEntries.push('# Contextuate - Framework files');
        gitignoreEntries.push('docs/ai/.contextuate/');
        // contextuate.md is now inside .contextuate, so it's covered by the line above
        gitignoreEntries.push('');
        gitignoreEntries.push('# Contextuate - Generated Artifacts (DO NOT EDIT)');
        // Add entries for selected platforms
        for (const platform of selectedPlatforms) {
            if (platform.ensureDir) {
                gitignoreEntries.push(`${platform.ensureDir}/`);
            }
            else {
                gitignoreEntries.push(platform.dest);
            }
        }
        // Add symlink entries if Claude is selected
        if (selectedPlatforms.some(p => p.id === 'claude')) {
            gitignoreEntries.push('');
            gitignoreEntries.push('# Contextuate - Platform symlinks (symlinks to docs/ai/)');
            gitignoreEntries.push('.claude/');
        }
    }
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
    console.log('Installed platforms:');
    for (const platform of selectedPlatforms) {
        console.log(`  - ${chalk_1.default.cyan(platform.name)} (${platform.dest})`);
    }
    console.log('');
    console.log('Next steps:');
    console.log('');
    console.log(`  1. Edit ${chalk_1.default.blue('docs/ai/context.md')} with your project details`);
    console.log(`  2. Create custom agents in ${chalk_1.default.blue('docs/ai/agents/')}`);
    console.log(`  3. Add quickrefs in ${chalk_1.default.blue('docs/ai/quickrefs/')}`);
    console.log('');
    console.log('');
    console.log('Documentation: https://contextuate.md');
    console.log('');
    console.log(chalk_1.default.gray('Powered by Esotech.'));
    console.log(chalk_1.default.gray('Created by Alexander Conroy (@geilt)'));
    console.log('');
}
