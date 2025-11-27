// content.js
console.log('Projet Voltaire Assistant: Content script loaded.');

let inspectorEnabled = false;
let solveEnabled = false;
let learningEnabled = true; // Default to learning mode
let delayMin = 1000;
let delayMax = 2000;

let aiEnabled = false;
let isSolving = false;
let lastSolvedSignature = '';

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
    const style = window.getComputedStyle(elem);
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length) &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0';
}

let lastDetectedSentence = '';

function solveLoop() {
    if (!solveEnabled || isSolving) return;

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

    // 1.5 Check for Drag and Drop (Tableau)
    const dragDropInstruction = getDragDropInstruction();
    if (dragDropInstruction) {
        console.log('Drag and Drop detected:', dragDropInstruction);
        solveDragAndDrop(dragDropInstruction);
        setTimeout(solveLoop, currentDelay + 3000); // Wait longer for drag operations
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
        lastSolvedSignature = ''; // Reset for next drag and drop
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
    lastSolvedSignature = ''; // Reset for next drag and drop
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
    if (isSolving) return;
    isSolving = true;
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
                    // Prioritize data-testid
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
            isSolving = false;
        });
        return;
    }

    fallbackSolve(words, fullSentence);
    isSolving = false;
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


// --- Drag and Drop Logic ---

function getDragDropInstruction() {
    // Look for specific text indicating a drag and drop exercise
    const allDivs = Array.from(document.querySelectorAll('div'));
    const instructionDiv = allDivs.find(div => {
        const text = div.innerText || '';
        return (text.includes('Classer les') || text.includes('Déposer')) &&
            isVisible(div) &&
            text.length < 100 &&
            !text.includes('COUP DE POUCE');
    });
    return instructionDiv ? instructionDiv.innerText.trim() : null;
}

function solveDragAndDrop(instruction) {
    if (isSolving) return;
    console.log('Solving Drag and Drop...');

    // 1. Identify Draggable Items
    const allTextDivs = Array.from(document.querySelectorAll('div[dir="auto"]')).filter(isVisible);

    // Filter out headers and instructions
    const potentialItems = allTextDivs.filter(el => {
        const text = el.innerText.trim();
        return text.length > 0 &&
            text.length < 50 &&
            text !== instruction &&
            !text.includes('Pluriel en') &&
            !text.includes('Terminaison') &&
            !text.includes('Valider') &&
            !text.includes('Continuer') &&
            !text.includes('Suivant') &&
            !text.includes('CORRECTION') &&
            !text.includes('Classer les');
    });

    // 2. Identify Drop Zones (Columns)
    const potentialHeaders = allTextDivs.filter(el => {
        const text = el.innerText.trim();
        return text.includes('Pluriel en') || text.includes('Terminaison');
    });

    const columns = potentialHeaders.map(el => el.innerText.trim());
    const items = potentialItems.map(el => el.innerText.trim());

    console.log('Items found:', items);
    console.log('Columns found:', columns);

    if (items.length === 0 || columns.length === 0) {
        console.warn('Could not find items or columns for drag and drop.');
        isSolving = false; // Reset flag
        return;
    }

    const signature = instruction + items.join('') + columns.join('');
    console.log('Current Signature:', signature);
    console.log('Last Solved Signature:', lastSolvedSignature);

    if (signature === lastSolvedSignature) {
        console.log('Already solved this configuration. Skipping AI request.');
        return;
    }

    isSolving = true;
    lastSolvedSignature = signature;

    if (aiEnabled) {
        chrome.runtime.sendMessage({
            action: 'solveDragAndDrop',
            instruction: instruction,
            items: items,
            columns: columns
        }, (response) => {
            if (response && response.success) {
                console.log('AI Classification:', response.mapping);
                performDragAndDrop(response.mapping, potentialItems, potentialHeaders);
            } else {
                console.error('AI Error:', response ? response.error : 'Unknown error');
                isSolving = false; // Reset flag on error
            }
        });
    } else {
        isSolving = false; // Reset flag if AI disabled
    }
}

function performDragAndDrop(mapping, itemElements, columnElements) {
    if (!mapping) {
        isSolving = false;
        return;
    }

    const moves = [];

    // Find all drop zones globally first
    const allDropZones = Array.from(document.querySelectorAll('.r-vacyoi')).filter(isVisible);
    console.log(`Found ${allDropZones.length} drop zones with class .r-vacyoi`);

    for (const [itemText, columnText] of Object.entries(mapping)) {
        const source = itemElements.find(el => el.innerText.trim() === itemText);
        const targetHeader = columnElements.find(el => el.innerText.trim() === columnText);

        if (source && targetHeader) {
            let target = null;

            // Strategy 1: Index-based matching (Most robust if counts match)
            // If we have N headers and N drop zones, assume they map 1:1
            if (columnElements.length === allDropZones.length) {
                const headerIndex = columnElements.indexOf(targetHeader);
                if (headerIndex !== -1) {
                    target = allDropZones[headerIndex];
                    console.log(`Strategy 1 (Index): Mapped header "${columnText}" (index ${headerIndex}) to drop zone`, target);
                }
            }

            // Strategy 2: DOM Traversal (Fallback)
            if (!target) {
                // Check siblings of header
                if (targetHeader.nextElementSibling && targetHeader.nextElementSibling.classList.contains('r-vacyoi')) {
                    target = targetHeader.nextElementSibling;
                }
                // Check siblings of parent
                else if (targetHeader.parentElement && targetHeader.parentElement.nextElementSibling && targetHeader.parentElement.nextElementSibling.classList.contains('r-vacyoi')) {
                    target = targetHeader.parentElement.nextElementSibling;
                }
                // Broader search
                else {
                    const container = targetHeader.closest('div[style*="flex-direction: row"]') || targetHeader.parentElement.parentElement;
                    if (container) {
                        target = container.querySelector('.r-vacyoi');
                    }
                }
            }

            // Strategy 3: Generic Fallback (Last resort)
            if (!target) {
                target = targetHeader.nextElementSibling || (targetHeader.parentElement ? targetHeader.parentElement.nextElementSibling : null) || targetHeader;
            }

            // Store text identifiers instead of elements to allow re-querying
            moves.push({ itemText, columnText });
        }
    }

    // Execute moves sequentially with delay
    let moveIndex = 0;
    function nextMove() {
        if (moveIndex >= moves.length) {
            console.log('All moves completed. Polling for Validate button...');
            pollForValidate(0);
            return;
        }

        const move = moves[moveIndex];
        console.log(`Processing move ${moveIndex + 1}/${moves.length}: ${move.itemText} -> ${move.columnText}`);

        // Re-query elements to handle DOM updates/re-renders
        const allTextDivs = Array.from(document.querySelectorAll('div[dir="auto"]')).filter(isVisible);
        const source = allTextDivs.find(el => el.innerText.trim() === move.itemText);
        const targetHeader = allTextDivs.find(el => el.innerText.trim() === move.columnText);

        if (!source) {
            console.warn(`Source element "${move.itemText}" not found. Skipping.`);
            moveIndex++;
            setTimeout(nextMove, 500);
            return;
        }

        if (!targetHeader) {
            console.warn(`Target header "${move.columnText}" not found. Skipping.`);
            moveIndex++;
            setTimeout(nextMove, 500);
            return;
        }

        // Find drop zone dynamically
        let target = null;
        const allDropZones = Array.from(document.querySelectorAll('.r-vacyoi')).filter(isVisible);

        // Re-run targeting logic
        // Strategy 1: Index
        const currentHeaders = allTextDivs.filter(el => el.innerText.includes('Pluriel en') || el.innerText.includes('Terminaison'));
        if (currentHeaders.length === allDropZones.length) {
            const headerIndex = currentHeaders.indexOf(targetHeader);
            if (headerIndex !== -1) target = allDropZones[headerIndex];
        }

        // Strategy 2: DOM Traversal
        if (!target) {
            if (targetHeader.nextElementSibling && targetHeader.nextElementSibling.classList.contains('r-vacyoi')) {
                target = targetHeader.nextElementSibling;
            } else if (targetHeader.parentElement && targetHeader.parentElement.nextElementSibling && targetHeader.parentElement.nextElementSibling.classList.contains('r-vacyoi')) {
                target = targetHeader.parentElement.nextElementSibling;
            }
        }

        // Strategy 3: Fallback
        if (!target) {
            target = targetHeader.nextElementSibling || (targetHeader.parentElement ? targetHeader.parentElement.nextElementSibling : null) || targetHeader;
        }

        console.log(`Clicking ${move.itemText} then Drop Zone`);
        simulateClickAndDrop(source, target);

        moveIndex++;
        setTimeout(nextMove, 2500); // Increased delay between moves
    }

    nextMove();
}

function pollForValidate(attempts) {
    if (attempts > 10) { // Try for 5 seconds (10 * 500ms)
        console.warn('Validate button not found after polling.');
        isSolving = false;
        setTimeout(solveLoop, 3000);
        return;
    }

    // Robust search for "Valider" button
    const allElements = Array.from(document.querySelectorAll('[data-testid="button-text"], button, div[role="button"]'));

    // Debug logging
    console.log(`Polling for Validate (Attempt ${attempts + 1}). Found ${allElements.length} candidates.`);

    const validateButton = allElements.find(el => {
        const text = el.innerText ? el.innerText.trim().toUpperCase() : '';
        const isMatch = text.includes('VALIDER');
        const visible = isVisible(el);

        if (isMatch) {
            console.log('Candidate found:', el, 'Visible:', visible, 'Text:', text);
        }

        return visible && isMatch;
    });

    if (validateButton) {
        console.log('Found Valider button:', validateButton);
        validateButton.click();
        if (validateButton.parentElement) validateButton.parentElement.click();

        isSolving = false;
        setTimeout(solveLoop, 3000);
    } else {
        console.log(`Validate button not found (attempt ${attempts + 1}). Retrying...`);
        setTimeout(() => pollForValidate(attempts + 1), 500);
    }
}

function simulateClickAndDrop(sourceElement, targetElement) {
    // Click source
    simulateClick(sourceElement);
    sourceElement.style.border = '2px solid blue';

    // Wait 1 second then click target (User request)
    setTimeout(() => {
        simulateClick(targetElement);
        targetElement.style.border = '2px solid blue';

        setTimeout(() => {
            sourceElement.style.border = '';
            targetElement.style.border = '';
        }, 500);
    }, 1000); // 1 second delay
}
