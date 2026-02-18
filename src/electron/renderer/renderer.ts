import type { MitchBridge } from '../ipc';

// RENDERER SCRIPT (UNTRUSTED UI)
// This code cannot access Node.js or the Filesystem.
// It can only talk to 'window.miTch'.

declare global {
    interface Window {
        miTch: MitchBridge;
    }
}

// Simple Terminal UI Mock
const termContainer = document.getElementById('terminal-container');
const outputDiv = document.createElement('div');
outputDiv.style.fontFamily = 'monospace';
outputDiv.style.whiteSpace = 'pre-wrap';
if (termContainer) {
    termContainer.appendChild(outputDiv);

    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.background = '#333';
    input.style.color = 'white';
    input.style.border = 'none';
    input.placeholder = 'Type secure command...';

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value;
            window.miTch.sendInput(cmd);
            input.value = '';
        }
    });

    termContainer.appendChild(input);
}

function appendLine(text: string, color: string) {
    const line = document.createElement('div');
    line.textContent = text;
    line.style.color = color;
    outputDiv.appendChild(line);
    if (termContainer) termContainer.scrollTop = termContainer.scrollHeight;
}

window.miTch.onOutput((text: string) => {
    let color = '#ddd';
    if (text.includes('Shield')) color = '#4CAF50';
    if (text.includes('PANIC')) color = '#f44336';
    appendLine(text, color);
});

window.miTch.onError((message: string) => {
    appendLine(`[Kernel Error] ${message}`, '#ff6b6b');
});

window.miTch.onLock((reason: string) => {
    const overlay = document.getElementById('lock-overlay');
    const reasonDiv = document.getElementById('lock-reason');
    if (overlay && reasonDiv) {
        overlay.style.display = 'flex';
        reasonDiv.textContent = `Reason: ${reason}`;
    }
});
