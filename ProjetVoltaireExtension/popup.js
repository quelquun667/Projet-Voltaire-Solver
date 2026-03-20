// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const inspectorToggle = document.getElementById('inspectorToggle');
    const solveToggle = document.getElementById('solveToggle');
    const delayMinInput = document.getElementById('delayMin');
    const delayMaxInput = document.getElementById('delayMax');
    const errorRateInput = document.getElementById('errorRate');
    const errorRateValue = document.getElementById('errorRateValue');
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
    chrome.storage.local.get(['inspectorEnabled', 'solveEnabled', 'delayMin', 'delayMax', 'darkMode', 'errorRate'], (result) => {
        inspectorToggle.checked = result.inspectorEnabled || false;
        solveToggle.checked = result.solveEnabled || false;

        if (result.darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }

        if (result.delayMin !== undefined) delayMinInput.value = result.delayMin;
        if (result.delayMax !== undefined) delayMaxInput.value = result.delayMax;
        if (result.errorRate !== undefined) {
            errorRateInput.value = result.errorRate;
            errorRateValue.textContent = result.errorRate;
        }

        // Auto-check for updates on load
        checkForUpdates(true);
    });

    // Load and display stats
    function updateStats() {
        chrome.storage.local.get(['statsCorrect', 'statsWrong'], (result) => {
            const correct = result.statsCorrect || 0;
            const wrong = result.statsWrong || 0;
            document.getElementById('statCorrect').textContent = correct;
            document.getElementById('statWrong').textContent = wrong;
            document.getElementById('statTotal').textContent = correct + wrong;
        });
    }
    updateStats();
    // Refresh stats every 2 seconds while popup is open
    setInterval(updateStats, 2000);

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
            const response = await fetch('https://raw.githubusercontent.com/quelquun667/Projet-Voltaire-Solver/refs/heads/main/ProjetVoltaireExtension/manifest.json');

            if (!response.ok) throw new Error('Erreur réseau');

            const remoteManifest = await response.json();
            const remoteVersion = remoteManifest.version;

            if (compareVersions(remoteVersion, currentVersion) > 0) {
                // Update available
                if (silent) {
                    settingsBadge.classList.add('visible');
                    // Also update status text if settings menu is opened later
                    updateStatusDiv.innerHTML = `Nouvelle version disponible : <b>${remoteVersion}</b><br><a href="https://github.com/quelquun667/Projet-Voltaire-Solver/releases/latest" target="_blank" style="color: #007bff;">Télécharger sur GitHub</a>`;
                    updateStatusDiv.style.color = 'green';
                } else {
                    updateStatusDiv.innerHTML = `Nouvelle version disponible : <b>${remoteVersion}</b><br><a href="https://github.com/quelquun667/Projet-Voltaire-Solver/releases/latest" target="_blank" style="color: #007bff;">Télécharger sur GitHub</a>`;
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

    // Delay Inputs with validation
    const delayWarning = document.getElementById('delayWarning');
    const MIN_DELAY = 1000;

    function validateAndUpdateDelay() {
        let min = parseInt(delayMinInput.value, 10) || MIN_DELAY;
        let max = parseInt(delayMaxInput.value, 10) || 2000;
        let warning = '';

        // Enforce minimum threshold
        if (min < MIN_DELAY) {
            min = MIN_DELAY;
            delayMinInput.value = MIN_DELAY;
            warning = 'Minimum 1000ms pour eviter les bugs.';
        }
        if (max < MIN_DELAY) {
            max = MIN_DELAY;
            delayMaxInput.value = MIN_DELAY;
            warning = 'Minimum 1000ms pour eviter les bugs.';
        }

        // Ensure min <= max
        if (min > max) {
            max = min;
            delayMaxInput.value = max;
            warning = 'Max ajuste au min.';
        }

        delayWarning.textContent = warning;
        delayWarning.style.display = warning ? 'block' : 'none';

        chrome.storage.local.set({ delayMin: min, delayMax: max });
        sendMessageToContent({ action: 'updateDelay', min: min, max: max });
    }

    delayMinInput.addEventListener('change', validateAndUpdateDelay);
    delayMaxInput.addEventListener('change', validateAndUpdateDelay);

    // Error Rate Slider
    errorRateInput.addEventListener('input', () => {
        errorRateValue.textContent = errorRateInput.value;
    });
    errorRateInput.addEventListener('change', () => {
        const rate = parseInt(errorRateInput.value, 10);
        chrome.storage.local.set({ errorRate: rate });
        sendMessageToContent({ action: 'updateErrorRate', rate: rate });
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
