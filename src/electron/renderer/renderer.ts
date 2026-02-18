// RENDERER SCRIPT (UNTRUSTED UI)
// This code cannot access Node.js or the Filesystem.
// It can only talk to 'window.miTch'.

// Note: In a real build step, we'd import xterm properly.
// For this scaffolding, we assume xterm loaded globally or via script tag logic.
// import { Terminal } from 'xterm';

// Mocking xterm/miTch for type safety in this snippet
declare const miTch: {
    sendInput: (text: string) => void;
    onOutput: (cb: (text: string) => void) => void;
    onLock: (cb: (reason: string) => void) => void;
};

// Simple Terminal UI Mock
const termContainer = document.getElementById('terminal-container');
const outputDiv = document.createElement('div');
outputDiv.style.fontFamily = 'monospace';
outputDiv.style.whiteSpace = 'pre-wrap';
if (termContainer) {
    termContainer.appendChild(outputDiv);

    // Simulate Terminal Input Box
    const input = document.createElement('input');
    input.type = "text";
    input.style.width = "100%";
    input.style.background = "#333";
    input.style.color = "white";
    input.style.border = "none";
    input.placeholder = "Type secure command...";

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value;
            // Send to Kernel via Bridge
            miTch.sendInput(cmd);
            input.value = '';
        }
    });

    termContainer.appendChild(input);
}

// Receive Output from Kernel
miTch.onOutput((text: string) => {
    // Determine color based on content (Simulating syntax highlighting)
    let color = "#ddd";
    if (text.includes("Shield")) color = "#4CAF50"; // Green for Shield
    if (text.includes("PANIC")) color = "#f44336"; // Red for Panic

    const line = document.createElement('div');
    line.textContent = text;
    line.style.color = color;
    outputDiv.appendChild(line);
    // Auto-scroll
    if (termContainer) termContainer.scrollTop = termContainer.scrollHeight;
});

// Handle Lockout
miTch.onLock((reason: string) => {
    const overlay = document.getElementById('lock-overlay');
    const reasonDiv = document.getElementById('lock-reason');
    if (overlay && reasonDiv) {
        overlay.style.display = 'flex';
        reasonDiv.textContent = `Reason: ${reason}`;
    }
});
