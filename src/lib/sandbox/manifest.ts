/**
 * Tool capability manifest — the upfront declaration of what a plugin is allowed to do.
 * The runtime enforces the manifest: host functions not declared here are never injected
 * into the WASM environment, so the plugin cannot call them regardless of its own code.
 * DEFAULT_MANIFEST.risk_level is HIGH — unknown tools are maximally restricted (fail closed).
 * Principle of least privilege: Saltzer & Schroeder 1975; NIST SP 800-53 CM-7.
 * See docs/SECURITY_REFERENCE.md §"Sandbox".
 */
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
