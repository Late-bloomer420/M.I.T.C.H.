/**
 * Typed IPC contract between the Electron main process (Trusted Zone) and renderer
 * (Untrusted Zone). Typed channel constants prevent accidental channel name collisions.
 * MitchBridge is the surface exposed to the renderer via contextBridge.exposeInMainWorld —
 * the only way the renderer can communicate with the main process.
 * contextIsolation + sandbox:true ensure the renderer cannot access Node.js APIs directly.
 * See docs/SECURITY_REFERENCE.md §"Electron Trusted Zone".
 */
export const IPC_CHANNELS = {
    terminalInput: 'terminal-input',
    terminalOutput: 'terminal-output',
    terminalError: 'terminal-error',
    systemLock: 'system-lock'
} as const;

export interface SystemLockPayload {
    reason: string;
}

export interface MitchBridge {
    sendInput: (text: string) => void;
    onOutput: (callback: (text: string) => void) => void;
    onError: (callback: (message: string) => void) => void;
    onLock: (callback: (reason: string) => void) => void;
}
