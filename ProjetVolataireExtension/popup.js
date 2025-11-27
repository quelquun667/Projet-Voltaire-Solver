// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const inspectorToggle = document.getElementById('inspectorToggle');
    const solveToggle = document.getElementById('solveToggle');
    const delayMinInput = document.getElementById('delayMin');
    const delayMaxInput = document.getElementById('delayMax');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const aiToggle = document.getElementById('aiToggle');
    const logDiv = document.getElementById('log');

    // Settings UI Elements
    const openSettingsBtn = document.getElementById('openSettings');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const themeToggle = document.getElementById('themeToggle');
    const currentVersionSpan = document.getElementById('currentVersion');
    const checkUpdateBtn = document.getElementById('checkUpdate');

    const updateStatusDiv = document.getElementById('updateStatus');
    const settingsBadge = document.getElementById('settingsBadge');

    // Load saved state
    chrome.storage.local.get(['inspectorEnabled', 'solveEnabled', 'delayMin', 'delayMax', 'apiKey', 'aiEnabled', 'darkMode'], (result) => {
        inspectorToggle.checked = result.inspectorEnabled || false;
        solveToggle.checked = result.solveEnabled || false;
        aiToggle.checked = result.aiEnabled || false;

        if (result.darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }

        if (result.delayMin !== undefined) delayMinInput.value = result.delayMin;
        if (result.delayMax !== undefined) delayMaxInput.value = result.delayMax;
        if (result.apiKey) apiKeyInput.value = result.apiKey;
        if (result.delayMin !== undefined) delayMinInput.value = result.delayMin;
        if (result.delayMax !== undefined) delayMaxInput.value = result.delayMax;
        if (result.apiKey) apiKeyInput.value = result.apiKey;

        // Auto-check for updates on load
        checkForUpdates(true);
    });

    // Settings Menu Logic
    openSettingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.remove('hidden');
        const manifest = chrome.runtime.getManifest();
        currentVersionSpan.textContent = manifest.version;
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.add('hidden');
        updateStatusDiv.textContent = ''; // Clear status on close
    });

    // Dark Mode Toggle
    themeToggle.addEventListener('change', () => {
        const isDark = themeToggle.checked;
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        chrome.storage.local.set({ darkMode: isDark });
    });

    // Update Checker
    checkUpdateBtn.addEventListener('click', () => checkForUpdates(false));

    async function checkForUpdates(silent = false) {
        if (!silent) {
            updateStatusDiv.textContent = 'Vérification...';
            updateStatusDiv.style.color = '#555';
        }

        try {
            const currentVersion = chrome.runtime.getManifest().version;
            const response = await fetch('https://raw.githubusercontent.com/quelquun667/Projet-Voltaire-Auto-Solve/refs/heads/main/ProjetVolataireExtension/manifest.json');

            if (!response.ok) throw new Error('Erreur réseau');

            const remoteManifest = await response.json();
            const remoteVersion = remoteManifest.version;

            if (compareVersions(remoteVersion, currentVersion) > 0) {
                // Update available
                if (silent) {
                    settingsBadge.classList.add('visible');
                    // Also update status text if settings menu is opened later
                    updateStatusDiv.innerHTML = `Nouvelle version disponible : <b>${remoteVersion}</b><br><a href="https://github.com/quelquun667/Projet-Voltaire-Auto-Solve" target="_blank" style="color: #007bff;">Télécharger sur GitHub</a>`;
                    updateStatusDiv.style.color = 'green';
                } else {
                    updateStatusDiv.innerHTML = `Nouvelle version disponible : <b>${remoteVersion}</b><br><a href="https://github.com/quelquun667/Projet-Voltaire-Auto-Solve" target="_blank" style="color: #007bff;">Télécharger sur GitHub</a>`;
                    updateStatusDiv.style.color = 'green';
                }
            } else {
                // No update
                if (!silent) {
                    updateStatusDiv.textContent = 'Vous êtes à jour !';
                    updateStatusDiv.style.color = 'green';
                }
            }
        } catch (error) {
            console.error(error);
            if (!silent) {
                updateStatusDiv.textContent = 'Erreur lors de la vérification.';
                updateStatusDiv.style.color = 'red';
            }
        }
    }

    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }

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
