import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { MitchChat, IOInterface } from '../cli/mitch_chat';
import { KillSwitch } from '../lib/security/killswitch';

// ELECTRON MAIN PROCESS (THE KERNEL)
// This is the "Trusted Zone". It holds the keys, the DB, and the Kill-Switch.
// The Renderer (Browser Window) is the "Untrusted Zone".

let mainWindow: BrowserWindow | null = null;
let chatInstance: MitchChat | null = null;

function createTrustedWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false, // SECURITY: No Node in Renderer
            contextIsolation: true, // SECURITY: Bridge Isolation
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true           // SECURITY: OS Sandboxing
        }
    });

    // Load the "Dumb" UI
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Initialize Mitch Secure Chat (Kernel Logic)
    const ipcIO: IOInterface = {
        input: (handler) => {
            // Listen to IPC from Renderer
            ipcMain.on('terminal-input', (event, text) => {
                handler(text);
            });
        },
        output: (text) => {
            // Send back to Renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal-output', text);
            }
        },
        close: () => {
            if (mainWindow) mainWindow.close();
        }
    };

    chatInstance = new MitchChat({ userId: "Electron_User", role: "ADMIN" }, ipcIO);
    chatInstance.start();

    // Safety Net: Monitor Kill-Switch
    setInterval(() => {
        if (KillSwitch.isLocked && mainWindow) {
            mainWindow.webContents.send('system-lock', { reason: "Kill-Switch Engaged" });
        }
    }, 1000);
}

app.whenReady().then(createTrustedWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
