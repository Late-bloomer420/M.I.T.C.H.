export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ToolPermissions {
    network: boolean;
    filesystem: boolean;
    env_vars: string[]; // Whitelist of allowed env vars
}

export interface ToolManifest {
    name: string;
    version: string;
    permissions: ToolPermissions;
    risk_level: RiskLevel;
}

export const DEFAULT_MANIFEST: ToolManifest = {
    name: "unknown-tool",
    version: "1.0.0",
    permissions: {
        network: false,
        filesystem: false,
        env_vars: []
    },
    risk_level: "HIGH" // Default to high risk if unknown
};
