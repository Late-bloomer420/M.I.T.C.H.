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
