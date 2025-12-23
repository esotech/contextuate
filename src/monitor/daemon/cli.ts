#!/usr/bin/env node
/**
 * Daemon CLI Entry Point
 *
 * This is the entry point for running the daemon as a standalone process.
 * Used when starting the daemon in detached mode.
 */

import * as fs from 'fs';
import { Command } from 'commander';
import { startDaemon } from './index.js';
import type { MonitorConfig } from '../../types/monitor.js';

const program = new Command();

program
    .name('contextuate-daemon')
    .description('Contextuate Monitor Daemon')
    .option('-c, --config <path>', 'Path to config file')
    .parse(process.argv);

const options = program.opts();

async function main() {
    if (!options.config) {
        console.error('[Error] Config file path is required (--config)');
        process.exit(1);
    }

    // Load configuration
    let config: MonitorConfig;
    try {
        const configContent = await fs.promises.readFile(options.config, 'utf-8');
        config = JSON.parse(configContent);
    } catch (err: any) {
        console.error(`[Error] Failed to load config: ${err.message}`);
        process.exit(1);
    }

    // Start daemon
    const daemon = await startDaemon(config);

    // Handle shutdown signals
    const shutdown = async () => {
        console.log('\n[Info] Shutting down daemon...');
        await daemon.stop();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('[Error] Fatal error:', err);
    process.exit(1);
});
