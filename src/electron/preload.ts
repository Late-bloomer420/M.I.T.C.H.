import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, MitchBridge, SystemLockPayload } from './ipc';

// PRELOAD SCRIPT (THE BRIDGE)
// This is the ONLY link between the Secure Kernel and the UI.
// It exposes a strictly minimal API.

const bridge: MitchBridge = {
    // Send input to Kernel to be sanitized/masked
    sendInput: (text: string) => ipcRenderer.send(IPC_CHANNELS.terminalInput, text),

    // Receive clean output from Kernel
    onOutput: (callback: (text: string) => void) => {
        ipcRenderer.on(IPC_CHANNELS.terminalOutput, (_event, value) => callback(value));
    },

    // Receive operational errors from Kernel
    onError: (callback: (message: string) => void) => {
        ipcRenderer.on(IPC_CHANNELS.terminalError, (_event, value) => callback(value));
    },

    // Receive Lock Signals
    onLock: (callback: (reason: string) => void) => {
        ipcRenderer.on(IPC_CHANNELS.systemLock, (_event, data: SystemLockPayload) => callback(data.reason));
    }
};

contextBridge.exposeInMainWorld('miTch', bridge);
