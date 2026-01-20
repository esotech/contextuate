export interface ToolInfo {
    installed: boolean;
    version: string | null;
    path: string | null;
}
export interface ToolsConfig {
    ripgrep: ToolInfo;
}
export interface ContextuateConfig {
    name: string;
    version: string;
    description: string;
    repository: string;
    initialized: string;
    updated: string;
    tools: ToolsConfig;
}
/**
 * Detect ripgrep installation
 */
export declare function detectRipgrep(): ToolInfo;
/**
 * Detect all tools
 */
export declare function detectTools(): ToolsConfig;
/**
 * Detect the current operating system and package manager
 */
export declare function detectPlatform(): {
    os: 'macos' | 'linux' | 'windows';
    packageManager: string | null;
};
/**
 * Install ripgrep using the appropriate package manager
 */
export declare function installRipgrep(): Promise<boolean>;
/**
 * Prompt user to install missing tools
 */
export declare function promptInstallTools(tools: ToolsConfig, nonInteractive?: boolean): Promise<ToolsConfig>;
/**
 * Process template variables in a file
 */
export declare function processTemplateVariables(content: string, tools: ToolsConfig): string;
/**
 * Process template variables in all files in a directory
 */
export declare function processTemplateDirectory(dir: string, tools: ToolsConfig): Promise<number>;
/**
 * Read contextuate.json config
 */
export declare function readContextuateConfig(installDir: string): Promise<ContextuateConfig | null>;
/**
 * Write contextuate.json config
 */
export declare function writeContextuateConfig(installDir: string, config: ContextuateConfig): Promise<void>;
/**
 * Print tool status
 */
export declare function printToolStatus(tools: ToolsConfig): void;
