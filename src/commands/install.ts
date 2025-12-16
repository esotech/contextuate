import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

interface InstallOptions {
    agents?: string[];
    standards?: string[];
    tools?: string[];
    all?: boolean;
    list?: boolean;
    force?: boolean;
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

// Discover available templates
async function discoverTemplates(): Promise<{
    agents: string[];
    standards: string[];
    tools: string[];
}> {
    const templateSource = getTemplateSource();

    const result = {
        agents: [] as string[],
        standards: [] as string[],
        tools: [] as string[],
    };

    // Discover agents
    const agentDir = path.join(templateSource, 'agents');
    if (fs.existsSync(agentDir)) {
        const files = await fs.readdir(agentDir);
        result.agents = files
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace('.md', ''));
    }

    // Discover language standards
    const standardsDir = path.join(templateSource, 'templates/standards');
    if (fs.existsSync(standardsDir)) {
        const files = await fs.readdir(standardsDir);
        result.standards = files
            .filter(f => f.endsWith('.standards.md'))
            .map(f => f.replace('.standards.md', ''));
    }

    // Discover tools
    const toolsDir = path.join(templateSource, 'tools');
    if (fs.existsSync(toolsDir)) {
        const files = await fs.readdir(toolsDir);
        result.tools = files
            .filter(f => f.endsWith('.tool.md'))
            .map(f => f.replace('.tool.md', ''));
    }

    return result;
}

// List available templates
async function listTemplates(): Promise<void> {
    const templates = await discoverTemplates();

    console.log(chalk.blue('\nAvailable Templates:\n'));

    console.log(chalk.cyan('Agents:'));
    if (templates.agents.length > 0) {
        templates.agents.forEach(a => console.log(`  - ${a}`));
    } else {
        console.log('  (none found)');
    }

    console.log(chalk.cyan('\nLanguage Standards:'));
    if (templates.standards.length > 0) {
        templates.standards.forEach(s => console.log(`  - ${s}`));
    } else {
        console.log('  (none found)');
    }

    console.log(chalk.cyan('\nTools:'));
    if (templates.tools.length > 0) {
        templates.tools.forEach(t => console.log(`  - ${t}`));
    } else {
        console.log('  (none found)');
    }

    console.log('');
}

// Copy helper
async function copyFile(src: string, dest: string, force: boolean): Promise<boolean> {
    const absSrc = path.resolve(src);
    const absDest = path.resolve(dest);

    if (absSrc === absDest) {
        return false;
    }

    if (!fs.existsSync(src)) {
        console.log(chalk.red(`[ERROR] Source file missing: ${src}`));
        return false;
    }

    if (fs.existsSync(dest) && !force) {
        console.log(chalk.yellow(`[SKIP] Already exists: ${dest}`));
        return false;
    }

    await fs.ensureDir(path.dirname(dest));
    await fs.copy(src, dest);
    console.log(chalk.green(`[OK] Installed: ${dest}`));
    return true;
}

// Install agents
async function installAgents(names: string[], force: boolean): Promise<number> {
    const templateSource = getTemplateSource();
    const templates = await discoverTemplates();
    let installed = 0;

    for (const name of names) {
        const normalized = name.toLowerCase().trim();
        const matched = templates.agents.find(a => a.toLowerCase() === normalized);

        if (matched) {
            const src = path.join(templateSource, 'agents', `${matched}.md`);
            const dest = path.join('docs/ai/agents', `${matched}.md`);
            if (await copyFile(src, dest, force)) {
                installed++;
            }
        } else {
            console.log(chalk.yellow(`[WARN] Agent "${name}" not found. Use --list to see available agents.`));
        }
    }

    return installed;
}

// Install language standards
async function installStandards(names: string[], force: boolean): Promise<number> {
    const templateSource = getTemplateSource();
    const templates = await discoverTemplates();
    let installed = 0;

    for (const name of names) {
        const normalized = name.toLowerCase().trim();
        const matched = templates.standards.find(s => s.toLowerCase() === normalized);

        if (matched) {
            const src = path.join(templateSource, 'templates/standards', `${matched}.standards.md`);
            const dest = path.join('docs/ai/standards', `${matched}.standards.md`);
            if (await copyFile(src, dest, force)) {
                installed++;
            }
        } else {
            console.log(chalk.yellow(`[WARN] Standard "${name}" not found. Use --list to see available standards.`));
        }
    }

    return installed;
}

// Install tools
async function installTools(names: string[], force: boolean): Promise<number> {
    const templateSource = getTemplateSource();
    const templates = await discoverTemplates();
    let installed = 0;

    for (const name of names) {
        const normalized = name.toLowerCase().trim();
        const matched = templates.tools.find(t => t.toLowerCase() === normalized);

        if (matched) {
            const src = path.join(templateSource, 'tools', `${matched}.tool.md`);
            const dest = path.join('docs/ai/.contextuate/tools', `${matched}.tool.md`);
            if (await copyFile(src, dest, force)) {
                installed++;
            }
        } else {
            console.log(chalk.yellow(`[WARN] Tool "${name}" not found. Use --list to see available tools.`));
        }
    }

    return installed;
}

// Subcommand handlers
export async function installAgentsCommand(names: string[], options: { all?: boolean; force?: boolean }): Promise<void> {
    const templates = await discoverTemplates();
    const useAll = options.all || names.includes('all');
    const agentsToInstall = useAll ? templates.agents : names;

    if (agentsToInstall.length === 0) {
        console.log(chalk.yellow('No agents specified. Use "all" or provide agent names.'));
        console.log(chalk.gray('Available agents:'));
        templates.agents.forEach(a => console.log(`  - ${a}`));
        return;
    }

    console.log(chalk.blue('\n[INFO] Installing agents...\n'));
    const count = await installAgents(agentsToInstall, options.force || false);
    console.log(chalk.green(`\n[OK] Installed ${count} agent(s)\n`));
}

export async function installStandardsCommand(names: string[], options: { all?: boolean; force?: boolean }): Promise<void> {
    const templates = await discoverTemplates();
    const useAll = options.all || names.includes('all');
    const standardsToInstall = useAll ? templates.standards : names;

    if (standardsToInstall.length === 0) {
        console.log(chalk.yellow('No standards specified. Use "all" or provide language names.'));
        console.log(chalk.gray('Available standards:'));
        templates.standards.forEach(s => console.log(`  - ${s}`));
        return;
    }

    console.log(chalk.blue('\n[INFO] Installing language standards...\n'));
    const count = await installStandards(standardsToInstall, options.force || false);
    console.log(chalk.green(`\n[OK] Installed ${count} standard(s)\n`));
}

export async function installToolsCommand(names: string[], options: { all?: boolean; force?: boolean }): Promise<void> {
    const templates = await discoverTemplates();
    const useAll = options.all || names.includes('all');
    const toolsToInstall = useAll ? templates.tools : names;

    if (toolsToInstall.length === 0) {
        console.log(chalk.yellow('No tools specified. Use "all" or provide tool names.'));
        console.log(chalk.gray('Available tools:'));
        templates.tools.forEach(t => console.log(`  - ${t}`));
        return;
    }

    console.log(chalk.blue('\n[INFO] Installing tools...\n'));
    const count = await installTools(toolsToInstall, options.force || false);
    console.log(chalk.green(`\n[OK] Installed ${count} tool(s)\n`));
}

// Main install command (flag style or interactive)
export async function installCommand(options: InstallOptions): Promise<void> {
    // Handle --list flag
    if (options.list) {
        await listTemplates();
        return;
    }

    const templates = await discoverTemplates();
    const force = options.force || false;

    // Check if any flags were provided
    const hasFlags = options.agents || options.standards || options.tools || options.all;

    if (!hasFlags) {
        // Interactive mode
        try {
            const { categories } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'categories',
                    message: 'What would you like to install?',
                    choices: [
                        { name: 'Agents (AI persona definitions)', value: 'agents' },
                        { name: 'Language Standards (coding guidelines)', value: 'standards' },
                        { name: 'Tools (AI tool guides)', value: 'tools' },
                    ],
                    validate: (answer) => {
                        if (answer.length < 1) {
                            return 'Select at least one category.';
                        }
                        return true;
                    },
                },
            ]);

            let selectedAgents: string[] = [];
            let selectedStandards: string[] = [];
            let selectedTools: string[] = [];

            if (categories.includes('agents') && templates.agents.length > 0) {
                const { agents } = await inquirer.prompt([
                    {
                        type: 'checkbox',
                        name: 'agents',
                        message: 'Select agents to install:',
                        choices: [
                            { name: 'Select All', value: '__all__' },
                            new inquirer.Separator(),
                            ...templates.agents.map(a => ({
                                name: a.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                                value: a,
                            })),
                        ],
                    },
                ]);
                selectedAgents = agents.includes('__all__') ? templates.agents : agents;
            }

            if (categories.includes('standards') && templates.standards.length > 0) {
                const { standards } = await inquirer.prompt([
                    {
                        type: 'checkbox',
                        name: 'standards',
                        message: 'Select language standards to install:',
                        choices: [
                            { name: 'Select All', value: '__all__' },
                            new inquirer.Separator(),
                            ...templates.standards.map(s => ({
                                name: s.charAt(0).toUpperCase() + s.slice(1),
                                value: s,
                            })),
                        ],
                    },
                ]);
                selectedStandards = standards.includes('__all__') ? templates.standards : standards;
            }

            if (categories.includes('tools') && templates.tools.length > 0) {
                const { tools } = await inquirer.prompt([
                    {
                        type: 'checkbox',
                        name: 'tools',
                        message: 'Select tools to install:',
                        choices: [
                            { name: 'Select All', value: '__all__' },
                            new inquirer.Separator(),
                            ...templates.tools.map(t => ({
                                name: t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                                value: t,
                            })),
                        ],
                    },
                ]);
                selectedTools = tools.includes('__all__') ? templates.tools : tools;
            }

            // Install selected items
            let totalInstalled = 0;

            if (selectedAgents.length > 0) {
                console.log(chalk.blue('\n[INFO] Installing agents...'));
                totalInstalled += await installAgents(selectedAgents, force);
            }

            if (selectedStandards.length > 0) {
                console.log(chalk.blue('\n[INFO] Installing language standards...'));
                totalInstalled += await installStandards(selectedStandards, force);
            }

            if (selectedTools.length > 0) {
                console.log(chalk.blue('\n[INFO] Installing tools...'));
                totalInstalled += await installTools(selectedTools, force);
            }

            console.log(chalk.green(`\n[OK] Installation complete. ${totalInstalled} file(s) installed.\n`));
        } catch (error: any) {
            if (error.name === 'ExitPromptError' || error.message?.includes('User force closed')) {
                console.log(chalk.yellow('\nInstallation cancelled.'));
                process.exit(0);
            }
            throw error;
        }
    } else {
        // Flag-based mode
        let totalInstalled = 0;

        // Handle --all flag
        if (options.all) {
            console.log(chalk.blue('\n[INFO] Installing all templates...\n'));
            totalInstalled += await installAgents(templates.agents, force);
            totalInstalled += await installStandards(templates.standards, force);
            totalInstalled += await installTools(templates.tools, force);
        } else {
            // Handle individual flags
            if (options.agents && options.agents.length > 0) {
                const agentsToInstall = options.agents.includes('all') ? templates.agents : options.agents;
                console.log(chalk.blue('\n[INFO] Installing agents...'));
                totalInstalled += await installAgents(agentsToInstall, force);
            }

            if (options.standards && options.standards.length > 0) {
                const standardsToInstall = options.standards.includes('all') ? templates.standards : options.standards;
                console.log(chalk.blue('\n[INFO] Installing language standards...'));
                totalInstalled += await installStandards(standardsToInstall, force);
            }

            if (options.tools && options.tools.length > 0) {
                const toolsToInstall = options.tools.includes('all') ? templates.tools : options.tools;
                console.log(chalk.blue('\n[INFO] Installing tools...'));
                totalInstalled += await installTools(toolsToInstall, force);
            }
        }

        console.log(chalk.green(`\n[OK] Installation complete. ${totalInstalled} file(s) installed.\n`));
    }
}
