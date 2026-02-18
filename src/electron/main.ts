import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { MitchChat, IOInterface } from '../cli/mitch_chat';
import { KillSwitch } from '../lib/security/killswitch';
import { IPC_CHANNELS, SystemLockPayload } from './ipc';

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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    const ipcIO: IOInterface = {
        input: (handler) => {
            ipcMain.on(IPC_CHANNELS.terminalInput, async (_event, text: string) => {
                try {
                    await handler(text);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send(IPC_CHANNELS.terminalError, message);
                    }
                }
            });
        },
        output: (text) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(IPC_CHANNELS.terminalOutput, text);
            }
        },
        close: () => {
            if (mainWindow) mainWindow.close();
        }
    };

    chatInstance = new MitchChat({ userId: 'Electron_User', role: 'ADMIN' }, ipcIO);
    chatInstance.start();

    setInterval(() => {
        if (KillSwitch.isLocked && mainWindow && !mainWindow.isDestroyed()) {
            const payload: SystemLockPayload = { reason: KillSwitch.lastReason || 'Kill-Switch Engaged' };
            mainWindow.webContents.send(IPC_CHANNELS.systemLock, payload);
        }
    }, 1000);
}

app.whenReady().then(createTrustedWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
