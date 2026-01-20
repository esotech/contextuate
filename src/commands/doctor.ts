import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {
    detectTools,
    promptInstallTools,
    processTemplateDirectory,
    readContextuateConfig,
    writeContextuateConfig,
    printToolStatus,
    ContextuateConfig
} from '../utils/tools';

interface DoctorOptions {
    fix?: boolean;
    install?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Doctor                 ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    const installDir = 'docs/ai/.contextuate';

    // Check if Contextuate is installed
    if (!fs.existsSync(installDir)) {
        console.log(chalk.red('[ERROR] Contextuate is not installed in this project.'));
        console.log(chalk.gray('  Run: contextuate init'));
        return;
    }

    // Read existing config
    let config = await readContextuateConfig(installDir);
    const configExists = config !== null;

    if (!configExists) {
        console.log(chalk.yellow('[WARN] contextuate.json not found. Will create one.'));
    }

    // Detect tools
    console.log(chalk.blue('[INFO] Checking tool availability...'));
    let tools = detectTools();

    printToolStatus(tools);

    // Offer to install missing tools if --install flag or interactive
    if (options.install || options.fix) {
        tools = await promptInstallTools(tools, false);
    } else if (!tools.ripgrep.installed) {
        console.log('');
        console.log(chalk.gray('  Tip: Run "contextuate doctor --install" to install missing tools'));
    }

    // Update or create config
    console.log('');
    console.log(chalk.blue('[INFO] Updating contextuate.json...'));

    const now = new Date().toISOString();

    if (config) {
        // Update existing config
        config.tools = tools;
        config.updated = now;
    } else {
        // Create new config - try to read version.json for migration
        const versionJsonPath = path.join(installDir, 'version.json');
        let pkgInfo = {
            name: '@esotech/contextuate',
            version: '0.0.0',
            description: 'AI Context Framework',
            repository: 'https://github.com/esotech/contextuate'
        };

        if (fs.existsSync(versionJsonPath)) {
            try {
                const versionData = JSON.parse(await fs.readFile(versionJsonPath, 'utf-8'));
                pkgInfo = {
                    name: versionData.name || pkgInfo.name,
                    version: versionData.version || pkgInfo.version,
                    description: versionData.description || pkgInfo.description,
                    repository: versionData.repository || pkgInfo.repository
                };
            } catch {
                // Use defaults
            }
        }

        config = {
            ...pkgInfo,
            initialized: now,
            updated: now,
            tools
        };
    }

    await writeContextuateConfig(installDir, config);
    console.log(chalk.green('[OK] contextuate.json updated'));

    // Remove old version.json if it exists (migration)
    const versionJsonPath = path.join(installDir, 'version.json');
    if (fs.existsSync(versionJsonPath)) {
        await fs.remove(versionJsonPath);
        console.log(chalk.yellow('[CLEANUP] Removed legacy version.json (migrated to contextuate.json)'));
    }

    // Process template variables if --fix flag
    if (options.fix) {
        console.log('');
        console.log(chalk.blue('[INFO] Processing template variables...'));

        const agentsDir = 'docs/ai/agents';
        const frameworkAgentsDir = path.join(installDir, 'agents');

        let totalProcessed = 0;

        if (fs.existsSync(agentsDir)) {
            const count = await processTemplateDirectory(agentsDir, tools);
            totalProcessed += count;
        }

        if (fs.existsSync(frameworkAgentsDir)) {
            const count = await processTemplateDirectory(frameworkAgentsDir, tools);
            totalProcessed += count;
        }

        if (totalProcessed > 0) {
            console.log(chalk.green(`[OK] Updated template variables in ${totalProcessed} file(s)`));
        } else {
            console.log(chalk.gray('[--] No template variables to update'));
        }
    }

    // Summary
    console.log('');
    console.log(chalk.green('╔════════════════════════════════════════╗'));
    console.log(chalk.green('║     Doctor Check Complete              ║'));
    console.log(chalk.green('╚════════════════════════════════════════╝'));
    console.log('');

    // Report issues
    const issues: string[] = [];

    if (!tools.ripgrep.installed) {
        issues.push('ripgrep not installed (code search will use slower grep)');
    }

    if (issues.length > 0) {
        console.log(chalk.yellow('Issues found:'));
        issues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
        console.log('');
        console.log(chalk.gray('Run "contextuate doctor --fix" to attempt automatic fixes'));
    } else {
        console.log(chalk.green('All checks passed!'));
    }

    console.log('');
}
