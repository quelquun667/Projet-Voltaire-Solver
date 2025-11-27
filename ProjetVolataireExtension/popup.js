// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const inspectorToggle = document.getElementById('inspectorToggle');
    const solveToggle = document.getElementById('solveToggle');
    const delayMinInput = document.getElementById('delayMin');
    const delayMaxInput = document.getElementById('delayMax');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const aiToggle = document.getElementById('aiToggle');
    const logDiv = document.getElementById('log');

    // Load saved state
    chrome.storage.local.get(['inspectorEnabled', 'solveEnabled', 'delayMin', 'delayMax', 'apiKey', 'aiEnabled'], (result) => {
        inspectorToggle.checked = result.inspectorEnabled || false;
        solveToggle.checked = result.solveEnabled || false;
        aiToggle.checked = result.aiEnabled || false;

        if (result.delayMin !== undefined) delayMinInput.value = result.delayMin;
        if (result.delayMax !== undefined) delayMaxInput.value = result.delayMax;
        if (result.apiKey) apiKeyInput.value = result.apiKey;
    });

    // Inspector Toggle
    inspectorToggle.addEventListener('change', () => {
        const enabled = inspectorToggle.checked;
        chrome.storage.local.set({ inspectorEnabled: enabled });
        sendMessageToContent({ action: 'toggleInspector', enabled: enabled });
    });

    // Solve Toggle
    solveToggle.addEventListener('change', () => {
        const enabled = solveToggle.checked;
        chrome.storage.local.set({ solveEnabled: enabled });
        sendMessageToContent({ action: 'toggleSolve', enabled: enabled });
    });

    // AI Toggle
    aiToggle.addEventListener('change', () => {
        const enabled = aiToggle.checked;
        chrome.storage.local.set({ aiEnabled: enabled });
        sendMessageToContent({ action: 'toggleAI', enabled: enabled });
    });

    // Delay Inputs
    function updateDelay() {
        const min = parseInt(delayMinInput.value, 10) || 1000;
        const max = parseInt(delayMaxInput.value, 10) || 2000;
        chrome.storage.local.set({ delayMin: min, delayMax: max });
        sendMessageToContent({ action: 'updateDelay', min: min, max: max });
    }

    delayMinInput.addEventListener('change', updateDelay);
    delayMaxInput.addEventListener('change', updateDelay);

    // API Key Input
    apiKeyInput.addEventListener('change', () => {
        const key = apiKeyInput.value.trim();
        chrome.storage.local.set({ apiKey: key });
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'logSelector') {
            const p = document.createElement('p');
            p.textContent = `Selected: ${request.selector}`;
            p.style.borderBottom = '1px solid #eee';
            p.style.padding = '2px 0';
            logDiv.prepend(p);
        }
    });

    function sendMessageToContent(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }
});
