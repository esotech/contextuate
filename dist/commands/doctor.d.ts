interface DoctorOptions {
    fix?: boolean;
    install?: boolean;
}
export declare function doctorCommand(options?: DoctorOptions): Promise<void>;
export {};
