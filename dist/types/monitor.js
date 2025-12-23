"use strict";
/**
 * Contextuate Monitor - Type Definitions
 *
 * Shared TypeScript types for the monitor feature.
 * Used by both server and client components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.getDefaultMonitorPaths = getDefaultMonitorPaths;
/**
 * Default configuration values
 */
exports.DEFAULT_CONFIG = {
    mode: 'local',
    server: {
        host: '0.0.0.0',
        port: 3847,
        wsPort: 3848,
    },
    redis: {
        host: 'localhost',
        port: 6379,
        password: null,
        channel: 'contextuate:events',
    },
    persistence: {
        enabled: true,
        type: 'file',
    },
    socketPath: '/tmp/contextuate-monitor.sock',
};
/**
 * Get default monitor paths
 *
 * @returns MonitorPaths with all default directory and file paths
 */
function getDefaultMonitorPaths() {
    // Note: We use lazy imports to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('os');
    const baseDir = path.join(os.homedir(), '.contextuate', 'monitor');
    return {
        baseDir,
        configFile: path.join(baseDir, 'config.json'),
        rawDir: path.join(baseDir, 'raw'),
        processedDir: path.join(baseDir, 'processed'),
        sessionsDir: path.join(baseDir, 'sessions'),
        hooksDir: path.join(baseDir, 'hooks'),
        daemonPidFile: path.join(baseDir, 'daemon.pid'),
        daemonLogFile: path.join(baseDir, 'daemon.log'),
        daemonStateFile: path.join(baseDir, 'daemon.state.json'),
    };
}
