// content.js
console.log('Projet Voltaire Assistant: Content script loaded.');

let inspectorEnabled = false;
let solveEnabled = false;
let learningEnabled = true; // Default to learning mode
let delayMin = 1000;
let delayMax = 2000;

let aiEnabled = false;

// Load initial settings
chrome.storage.local.get(['delayMin', 'delayMax', 'aiEnabled'], (result) => {
    if (result.delayMin !== undefined) delayMin = result.delayMin;
    if (result.delayMax !== undefined) delayMax = result.delayMax;
    aiEnabled = result.aiEnabled || false;
});

// Configuration for selectors
const config = {
    sentenceSelector: '[data-testid="html"]',
    wordSelector: 'div[tabindex="0"]', // Words in the sentence have tabindex="0"
    buttonSelector: '[data-testid="button"]',
    nextButtonText: ['Suivant', 'Continuer', 'Valider']
};

function getRandomDelay() {
    return Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleInspector') {
        inspectorEnabled = request.enabled;
        toggleInspectorMode(inspectorEnabled);
    } else if (request.action === 'toggleSolve') {
        solveEnabled = request.enabled;
        if (solveEnabled) solveLoop();
    } else if (request.action === 'toggleAI') {
        aiEnabled = request.enabled;
        console.log('AI Mode:', aiEnabled);
    } else if (request.action === 'updateDelay') {
        delayMin = request.min;
        delayMax = request.max;
        console.log(`Delay updated: ${delayMin}-${delayMax}ms`);
    }
});

// Inspector Mode Logic
function toggleInspectorMode(enabled) {
    if (enabled) {
        document.body.style.cursor = 'crosshair';
        document.addEventListener('mouseover', highlightElement);
        document.addEventListener('click', logElementInfo);
    } else {
        document.body.style.cursor = 'default';
        document.removeEventListener('mouseover', highlightElement);
        document.removeEventListener('click', logElementInfo);
        removeHighlight();
    }
}

let lastHighlighted = null;

function highlightElement(e) {
    if (lastHighlighted) {
        lastHighlighted.style.outline = '';
    }
    e.target.style.outline = '2px solid red';
    lastHighlighted = e.target;
}

function removeHighlight() {
    if (lastHighlighted) {
        lastHighlighted.style.outline = '';
        lastHighlighted = null;
    }
}

function logElementInfo(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '';
    const testId = el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : '';

    // Prioritize data-testid
    const selector = testId || `${tag}${id}${classes}`;

    console.log('Selected Element:', selector);
    console.log('Inner Text:', el.innerText);

    // Send to popup
    chrome.runtime.sendMessage({
        action: 'logSelector',
        selector: selector
    });
    if (solveEnabled) {
        setTimeout(solveLoop, getRandomDelay());
    }
}

function isVisible(elem) {
    if (!elem) return false;
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

let lastDetectedSentence = '';

function solveLoop() {
    if (!solveEnabled) return;

    const currentDelay = getRandomDelay();

    // 1. Check for Correction Modal first
    // Heuristic: Check for "SUIVANT" button that is visible.
    // The correction modal usually has a "SUIVANT" button.
    const allButtons = Array.from(document.querySelectorAll('button'));
    const correctionButton = allButtons.find(btn => {
        const text = btn.innerText || btn.textContent;
        return text.includes('SUIVANT') && isVisible(btn);
    });

    if (correctionButton) {
        console.log('Correction screen detected (Suivant button found).');
        handleCorrection(correctionButton);
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // 2. Find the "Valider" or "Continuer" button (Main flow)
    const buttons = Array.from(document.querySelectorAll(config.buttonSelector)).filter(isVisible);
    const actionButton = buttons.find(btn => {
        const text = btn.innerText || btn.textContent;
        return config.nextButtonText.some(t => text.includes(t));
    });

    if (actionButton && !actionButton.disabled) {
        console.log('Clicking action button:', actionButton.innerText);
        actionButton.click();
        lastDetectedSentence = ''; // Reset for next sentence
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // 3. If no action button, look for the sentence words
    const potentialWords = Array.from(document.querySelectorAll(config.wordSelector)).filter(isVisible);

    // Identify "No Mistake" button if present in potential words
    // Heuristic: Check for specific text, handling newlines and extra spaces
    const noMistakeButton = potentialWords.find(el => {
        const text = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim().toUpperCase() : '';
        return text.includes("IL N'Y A PAS DE FAUTE") || text.includes("PAS DE FAUTE");
    });

    const sentenceWords = potentialWords.filter(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        // Exclude the "No Mistake" button from the sentence construction
        if (noMistakeButton && el === noMistakeButton) return false;

        return text.length > 0 &&
            text.length < 40 &&
            !el.querySelector('svg') &&
            !el.closest('[data-testid="html"]') &&
            !text.includes('COUP DE POUCE');
    });

    if (sentenceWords.length > 0) {
        const fullSentence = sentenceWords.map(w => w.innerText.trim()).join(' ');

        if (fullSentence !== lastDetectedSentence) {
            console.log('Detected sentence:', fullSentence);
            lastDetectedSentence = fullSentence;

            const instruction = getInstruction();
            console.log('Instruction:', instruction);

            // Pass potential words. We can exclude the noMistakeButton from the *list passed to AI* 
            // to avoid confusion, but we handle the "No Mistake" answer specifically anyway.
            const clickableOptions = potentialWords.filter(el => {
                const text = el.innerText ? el.innerText.trim() : '';
                return text.length > 0 && !el.querySelector('svg') && !text.includes('COUP DE POUCE');
            });

            solveSentence(clickableOptions, fullSentence, instruction);
        }
    }

    if (solveEnabled) {
        setTimeout(solveLoop, currentDelay);
    }
}

function getInstruction() {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const instructionDiv = allDivs.find(div => {
        const text = div.innerText || '';
        return (text.includes('Cliquez sur') || text.includes('Cliquer sur')) &&
            isVisible(div) &&
            text.length < 100;
    });
    return instructionDiv ? instructionDiv.innerText.trim() : 'Instruction not found';
}

function handleCorrection(nextButton) {
    // Scrape the correct answer
    // Look for the green highlighted word in the correction section
    const correctionLabel = Array.from(document.querySelectorAll('div')).find(el => el.innerText === 'CORRECTION');

    if (correctionLabel) {
        const correctionContainer = correctionLabel.parentElement; // Assuming container is parent
        if (correctionContainer) {
            // Find the highlighted word. It might have a style attribute or class.
            // In the screenshot, "bonnes" is highlighted.
            // Let's look for an element with a background color.
            const highlighted = Array.from(correctionContainer.querySelectorAll('*')).find(el => {
                const style = window.getComputedStyle(el);
                return style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgb(255, 255, 255)';
            });

            if (highlighted) {
                const correctWord = highlighted.innerText.trim();
                console.log('Learned correct answer:', correctWord);
                saveCorrectAnswer(lastDetectedSentence, correctWord);
            }
        }
    }

    console.log('Clicking Next (Correction)...');
    nextButton.click();
}

function saveCorrectAnswer(sentence, word) {
    if (!sentence || !word) return;
    chrome.storage.local.get(['learnedAnswers'], (result) => {
        const answers = result.learnedAnswers || {};
        answers[sentence] = word;
        chrome.storage.local.set({ learnedAnswers: answers }, () => {
            console.log('Saved answer for:', sentence);
        });
    });
}

function simulateClick(element) {
    const options = { bubbles: true, cancelable: true, view: window };
    element.dispatchEvent(new MouseEvent('mousedown', options));
    element.dispatchEvent(new MouseEvent('mouseup', options));
    element.dispatchEvent(new MouseEvent('click', options));
}

function solveSentence(words, fullSentence, instruction) {
    console.log('Attempting to auto-solve...');

    // 0. AI Mode
    if (aiEnabled) {
        console.log('AI Mode active. Asking Gemini...');
        const wordList = words.map(w => w.innerText.trim());

        chrome.runtime.sendMessage({
            action: 'solveWithAI',
            sentence: fullSentence,
            instruction: instruction,
            words: wordList
        }, (response) => {
            if (response && response.success) {
                console.log('AI Answer:', response.answer);

                // Special handling for "No Mistake"
                if (response.answer.toUpperCase().includes("PAS DE FAUTE") || response.answer.toUpperCase().includes("AUCUNE FAUTE")) {
                    console.log('AI says: No Mistake. Searching for button...');

                    // Search globally for the button, ignoring the passed 'words' list to be safe
                    // Exclude elements that look like instructions (contain "cliquez", "sinon")
                    const allElements = Array.from(document.querySelectorAll('button, div[role="button"], div[class*="button"], span, div[tabindex="0"]'));
                    const noMistakeBtn = allElements.find(el => {
                        const text = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim().toUpperCase() : '';
                        const isInstruction = text.includes("CLIQUEZ") || text.includes("SINON") || text.includes("SI ");
                        return isVisible(el) &&
                            (text.includes("IL N'Y A PAS DE FAUTE") || text === "PAS DE FAUTE") &&
                            !isInstruction;
                    });

                    if (noMistakeBtn) {
                        // Check if the found element is a wrapper containing the actual button
                        const innerButton = noMistakeBtn.querySelector('button') || noMistakeBtn.closest('button');
                        const targetToClick = innerButton || noMistakeBtn;

                        console.log('Found "No Mistake" element:', noMistakeBtn);
                        console.log('Clicking target:', targetToClick);

                        simulateClick(targetToClick);
                        targetToClick.style.border = '4px solid purple'; // Strong highlight
                        return;
                    } else {
                        console.error('Could not find "No Mistake" button on page!');
                    }
                }

                // Standard word matching
                let targetWord = words.find(w => w.innerText.trim() === response.answer);

                if (targetWord) {
                    simulateClick(targetWord);
                    targetWord.style.border = '2px solid purple'; // Purple for AI
                } else {
                    console.warn('AI returned a word not found in the list:', response.answer);
                    // Fallback to learning/random if AI fails to match
                    fallbackSolve(words, fullSentence);
                }
            } else {
                console.error('AI Error:', response ? response.error : 'Unknown error');
                fallbackSolve(words, fullSentence);
            }
        });
        return;
    }

    fallbackSolve(words, fullSentence);
}

function fallbackSolve(words, fullSentence) {
    // 1. Check if we know the answer (Learning Mode)
    chrome.storage.local.get(['learnedAnswers'], (result) => {
        const answers = result.learnedAnswers || {};
        const knownAnswer = answers[fullSentence];

        if (knownAnswer) {
            console.log('Found known answer:', knownAnswer);
            const targetWord = words.find(w => w.innerText.trim() === knownAnswer);
            if (targetWord) {
                console.log('Clicking known correct word:', knownAnswer);
                simulateClick(targetWord);
                targetWord.style.border = '2px solid green';
                return;
            }
        }

        // 2. If unknown, fall back to random
        if (words.length > 0) {
            const randomIndex = Math.floor(Math.random() * words.length);
            const wordToClick = words[randomIndex];

            console.log('Auto-selecting random word (learning mode):', wordToClick.innerText);
            simulateClick(wordToClick);
            wordToClick.style.border = '2px solid orange';
        }
    });
}
