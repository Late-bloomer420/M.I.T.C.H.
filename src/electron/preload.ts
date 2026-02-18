import { contextBridge, ipcRenderer } from 'electron';

// PRELOAD SCRIPT (THE BRIDGE)
// This is the ONLY link between the Secure Kernel and the UI.
// It exposes a strictly minimal API.

contextBridge.exposeInMainWorld('miTch', {
    // Send input to Kernel to be sanitized/masked
    sendInput: (text: string) => ipcRenderer.send('terminal-input', text),

    // Receive clean output from Kernel
    onOutput: (callback: (text: string) => void) => {
        ipcRenderer.on('terminal-output', (_event, value) => callback(value));
    },

    // Receive Lock Signals
    onLock: (callback: (reason: string) => void) => {
        ipcRenderer.on('system-lock', (_event, data) => callback(data.reason));
    }
});
