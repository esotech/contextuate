interface InstallOptions {
    agents?: string[];
    standards?: string[];
    tools?: string[];
    skills?: string[];
    all?: boolean;
    list?: boolean;
    force?: boolean;
}
export declare function installAgentsCommand(names: string[], options: {
    all?: boolean;
    force?: boolean;
    includeSkills?: boolean;
}): Promise<void>;
export declare function installStandardsCommand(names: string[], options: {
    all?: boolean;
    force?: boolean;
}): Promise<void>;
export declare function installToolsCommand(names: string[], options: {
    all?: boolean;
    force?: boolean;
}): Promise<void>;
export declare function installSkillsCommand(names: string[], options: {
    all?: boolean;
    force?: boolean;
}): Promise<void>;
export declare function installCommand(options: InstallOptions): Promise<void>;
export {};
