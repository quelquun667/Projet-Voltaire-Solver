// content.js
console.log('Projet Voltaire Assistant: Content script loaded.');

let inspectorEnabled = false;
let solveEnabled = false;
let delayMin = 1000;
let delayMax = 2000;
let isSolving = false;
let lastDetectedSentence = '';
let movedPhrases = new Set(); // Track D&D phrases already placed
let errorRate = 0; // Percentage of intentional mistakes (0-50)

// Load initial settings
chrome.storage.local.get(['delayMin', 'delayMax', 'solveEnabled', 'errorRate'], (result) => {
    if (result.delayMin !== undefined) delayMin = result.delayMin;
    if (result.delayMax !== undefined) delayMax = result.delayMax;
    if (result.errorRate !== undefined) errorRate = result.errorRate;
    solveEnabled = result.solveEnabled || false;
    if (solveEnabled) solveLoop();
});

function incrementStat(type) {
    const key = type === 'correct' ? 'statsCorrect' : 'statsWrong';
    chrome.storage.local.get([key], (result) => {
        chrome.storage.local.set({ [key]: (result[key] || 0) + 1 });
    });
}

const config = {
    wordSelector: 'div[tabindex="0"]',
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
    } else if (request.action === 'updateDelay') {
        delayMin = request.min;
        delayMax = request.max;
        console.log(`Delay updated: ${delayMin}-${delayMax}ms`);
    } else if (request.action === 'updateErrorRate') {
        errorRate = request.rate;
        console.log(`Error rate updated: ${errorRate}%`);
    }
});

// --- Read exercise data from extractor.js (MAIN world) ---

function getExercisesFromDOM() {
    // Trigger fresh extraction in the page context
    document.dispatchEvent(new CustomEvent('__pv_extract'));

    const dataEl = document.getElementById('__pv_exercises');
    if (!dataEl) return null;

    try {
        return JSON.parse(dataEl.getAttribute('data-exercises'));
    } catch (e) {
        return null;
    }
}

function normalizeSentence(str) {
    return str
        .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")  // curly apostrophes
        .replace(/[\u2011\u2010\u2012\u2013\u2014]/g, '-')  // special hyphens/dashes
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function stripPunctuation(str) {
    // Remove all punctuation except apostrophes (important for French)
    return str.replace(/[.,;:!?()«»""…\-–—]/g, '').replace(/\s+/g, ' ').trim();
}

function findCurrentExercise(exercises, displayedWords) {
    if (!exercises || !displayedWords || displayedWords.length === 0) return null;

    const displayedText = normalizeSentence(displayedWords.join(' '));
    const displayedStripped = stripPunctuation(displayedText);
    console.log('Normalized displayed:', displayedText);

    let bestMatch = null;
    let bestScore = 0;

    for (const ex of exercises) {
        if (!ex.sentence) continue;
        const exText = normalizeSentence(ex.sentence.map(s => s.text).join(' '));
        const exStripped = stripPunctuation(exText);

        // Exact match (with or without punctuation)
        if (exText === displayedText || exStripped === displayedStripped) {
            return ex;
        }

        // Containment match (stripped)
        if (exStripped.includes(displayedStripped) || displayedStripped.includes(exStripped)) {
            return ex;
        }

        // Word-based fuzzy matching
        const exWords = exStripped.split(/\s+/);
        const dispWords = displayedStripped.split(/\s+/);
        const matchCount = dispWords.filter(w => exWords.includes(w)).length;
        const score = matchCount / Math.max(dispWords.length, exWords.length);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = ex;
        }
    }

    // Accept if >60% of words match
    if (bestScore >= 0.6) {
        console.log(`Fuzzy matched with score ${(bestScore * 100).toFixed(0)}%`);
        return bestMatch;
    }

    return null;
}

function getAnswerForExercise(exercise) {
    if (!exercise) return null;

    // "click_on_mistake" type: click the word with the error, or "pas de faute"
    if (exercise.type === 'click_on_mistake') {
        if (!exercise.hasMistake) {
            return { type: 'no_mistake' };
        }
        for (const part of exercise.sentence) {
            if (part.mistake) {
                return { type: 'click_word', word: part.text };
            }
        }
    }

    // "click_on_word" type: click the word marked with clue
    if (exercise.type === 'click_on_word') {
        for (const part of exercise.sentence) {
            if (part.clue) {
                return { type: 'click_word', word: part.text };
            }
        }
    }

    // Fallback: look for any word with mistake or clue
    for (const part of exercise.sentence) {
        if (part.mistake || part.clue) {
            return { type: 'click_word', word: part.text };
        }
    }

    // No word to click and hasMistake is false
    if (exercise.hasMistake === false) {
        return { type: 'no_mistake' };
    }

    return null;
}

// --- Drag & Drop solver ---

function stripHtml(str) {
    return str.replace(/<[^>]*>/g, '');
}

function isDragAndDropPage() {
    const pageText = document.body ? document.body.innerText : '';
    return pageText.includes('Cliquer / Déposer') || pageText.includes('Cliquer / D\u00e9poser');
}

// Returns: 'moved' | 'done' | 'error'
function solveDragAndDrop(exercises) {
    const dndExercises = exercises.filter(ex => ex.type === 'drag_and_drop');
    if (dndExercises.length === 0) {
        console.log('[D&D] No drag_and_drop exercises in data');
        return 'error';
    }

    // Find all visible data-testid="html" elements on the page
    const htmlElements = Array.from(document.querySelectorAll('[data-testid="html"]')).filter(isVisible);
    // Also search div[tabindex="0"] for simple word cards
    const tabElements = Array.from(document.querySelectorAll('div[tabindex="0"]')).filter(el => {
        if (!isVisible(el)) return false;
        const text = (el.innerText || '').trim();
        // Filter to short text elements that look like D&D cards (not buttons/UI)
        return text.length > 0 && text.length < 60 && !el.querySelector('svg') &&
            !(text.toUpperCase().includes('VALIDER')) &&
            !(text.toUpperCase().includes('CONTINUER')) &&
            !(text.toUpperCase().includes('SUIVANT'));
    });
    // Merge both sources, deduplicate by text
    const allCardElements = [...htmlElements, ...tabElements];
    const seen = new Set();
    const uniqueCards = [];
    for (const el of allCardElements) {
        const text = normalizeSentence(el.innerText.trim());
        if (text && !seen.has(text)) {
            seen.add(text);
            uniqueCards.push({ element: el, text: text });
        }
    }
    const pageTexts = uniqueCards.map(c => c.text);

    // Step 1: Identify which D&D exercise is currently displayed
    let currentExercise = null;
    let bestMatchCount = 0;

    for (const ex of dndExercises) {
        const allWords = [];
        for (const col of ex.columns) {
            for (const word of col.words) {
                allWords.push(normalizeSentence(stripHtml(word)));
            }
        }
        let matchCount = 0;
        for (const pt of pageTexts) {
            if (allWords.includes(pt)) matchCount++;
        }
        if (matchCount > bestMatchCount) {
            bestMatchCount = matchCount;
            currentExercise = ex;
        }
    }

    if (!currentExercise || bestMatchCount === 0) {
        console.log('[D&D] Could not identify current D&D exercise on page');
        console.log('[D&D] Page texts:', pageTexts.slice(0, 10));
        if (dndExercises.length > 0) {
            const sampleWords = dndExercises[0].columns[0].words.slice(0, 5).map(w => normalizeSentence(stripHtml(w)));
            console.log('[D&D] Sample exercise words:', sampleWords);
        }
        return 'error';
    }

    // Step 2: Build mapping for THIS exercise only
    const columnNames = currentExercise.columns.map(col => stripHtml(col.instruction));
    const phraseToColumn = {};
    for (const col of currentExercise.columns) {
        const colName = stripHtml(col.instruction);
        for (const word of col.words) {
            phraseToColumn[normalizeSentence(stripHtml(word))] = colName;
        }
    }
    console.log(`[D&D] Matched exercise with ${columnNames.length} columns: [${columnNames.join(', ')}]`);

    // Step 3: Find unplaced phrases using all detected cards
    // Find drop zone Y position to distinguish placed vs unplaced
    const dropZonesCheck = Array.from(document.querySelectorAll('.r-vacyoi')).filter(isVisible);
    let dropZoneTop = Infinity;
    for (const dz of dropZonesCheck) {
        const r = dz.getBoundingClientRect();
        if (r.top < dropZoneTop) dropZoneTop = r.top;
    }

    const unplacedPhrases = [];
    for (const card of uniqueCards) {
        if (movedPhrases.has(card.text)) continue;

        // The clickable element: for [data-testid="html"], click the parent card
        const clickTarget = card.element.hasAttribute && card.element.hasAttribute('data-testid')
            ? card.element.parentElement : card.element;
        if (!clickTarget) continue;

        // Skip elements that are below the drop zone top (already placed)
        const cardRect = clickTarget.getBoundingClientRect();
        if (dropZoneTop < Infinity && cardRect.top >= dropZoneTop - 10) continue;

        const colName = phraseToColumn[card.text];
        if (colName) {
            unplacedPhrases.push({ element: clickTarget, text: card.text, column: colName });
        } else {
            const stripped = stripPunctuation(card.text);
            for (const [phraseKey, cn] of Object.entries(phraseToColumn)) {
                if (stripPunctuation(phraseKey) === stripped) {
                    unplacedPhrases.push({ element: clickTarget, text: card.text, column: cn });
                    break;
                }
            }
        }
    }

    if (unplacedPhrases.length === 0) {
        console.log('[D&D] No unplaced phrases remaining');
        return 'done';
    }

    console.log(`[D&D] Found ${unplacedPhrases.length} unplaced phrases`);

    // Step 4: Find drop zones and map by position (left to right = column order)
    let dropZones = Array.from(document.querySelectorAll('.r-vacyoi')).filter(isVisible);
    let zoneMap = [];

    if (dropZones.length >= columnNames.length) {
        dropZones.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        for (let i = 0; i < columnNames.length; i++) {
            zoneMap.push({ element: dropZones[i], column: columnNames[i] });
        }
    }

    if (zoneMap.length < columnNames.length) {
        console.log('[D&D] Position mapping failed, trying fallback...');
        zoneMap = [];
        const allDivs = Array.from(document.querySelectorAll('div')).filter(isVisible);
        const colKeywords = columnNames.map(name => {
            const words = name.split(/\s+/);
            return { name: name, keyword: words[words.length - 1].toLowerCase() };
        });
        for (const ck of colKeywords) {
            for (const div of allDivs) {
                const text = (div.innerText || '').toLowerCase();
                const rect = div.getBoundingClientRect();
                const otherKeywords = colKeywords.filter(c => c.keyword !== ck.keyword);
                if (text.includes(ck.keyword) &&
                    !otherKeywords.some(ok => text.includes(ok.keyword)) &&
                    rect.height > 50 && rect.width > 100) {
                    if (!zoneMap.some(z => z.column === ck.name)) {
                        zoneMap.push({ element: div, column: ck.name });
                        break;
                    }
                }
            }
        }
    }

    if (zoneMap.length === 0) {
        console.log('[D&D] Could not find drop zones');
        return 'error';
    }

    console.log(`[D&D] Mapped ${zoneMap.length} drop zones:`, zoneMap.map(z => z.column));

    // Step 5: Move the first unplaced phrase
    const phrase = unplacedPhrases[0];
    const targetZone = zoneMap.find(z => z.column === phrase.column);

    if (!targetZone) {
        console.log(`[D&D] No drop zone found for column: ${phrase.column}`);
        return 'error';
    }

    console.log(`[D&D] Moving "${phrase.text}" → "${phrase.column}"`);
    movedPhrases.add(phrase.text);

    simulateClick(phrase.element);
    setTimeout(() => {
        simulateClick(targetZone.element);
    }, 400);

    return 'moved';
}

// --- Main solve logic ---

function solveLoop() {
    if (!solveEnabled || isSolving) return;

    // Only run on exercise pages
    if (!window.location.href.includes('/exercice') && !window.location.href.includes('/entrainement')) {
        setTimeout(solveLoop, 2000);
        return;
    }

    const currentDelay = getRandomDelay();

    // 0. Check for Drag & Drop exercise
    if (isDragAndDropPage()) {
        // First check for SUIVANT/CONTINUER (correction/BRAVO screen)
        const allClickable = [
            ...Array.from(document.querySelectorAll('button')),
            ...Array.from(document.querySelectorAll('[data-testid="button"]'))
        ].filter(isVisible);
        const nextBtn = allClickable.find(btn => {
            const text = (btn.innerText || '').trim().toUpperCase();
            return text === 'SUIVANT' || text === 'CONTINUER';
        });
        if (nextBtn) {
            console.log('[D&D] Clicking SUIVANT/CONTINUER');
            simulateClick(nextBtn);
            movedPhrases.clear();
            lastDetectedSentence = '';
            setTimeout(solveLoop, currentDelay);
            return;
        }

        // Then try to solve
        const exercises = getExercisesFromDOM();
        if (exercises) {
            isSolving = true;
            const dndResult = solveDragAndDrop(exercises);
            isSolving = false;
            if (dndResult === 'moved') {
                setTimeout(solveLoop, currentDelay + 600);
                return;
            }
            if (dndResult === 'done') {
                // All phrases placed → click VALIDER
                const validerBtn = allClickable.find(btn => {
                    const text = (btn.innerText || '').trim().toUpperCase();
                    return text.includes('VALIDER');
                });
                if (validerBtn) {
                    console.log('[D&D] All placed, clicking VALIDER');
                    simulateClick(validerBtn);
                    setTimeout(solveLoop, currentDelay + 1000);
                    return;
                }
            }
            // dndResult === 'error' → don't click VALIDER, just retry
        } else {
            console.warn('[D&D] Extractor not ready, will retry...');
        }
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // 1. Check for popups/modals (sound features, difficulty, etc.)
    const allButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);

    // Auto-dismiss "Fonctionnalités sonores" popup → click DÉSACTIVER
    const disableBtn = allButtons.find(btn => {
        const text = (btn.innerText || '').trim().toUpperCase();
        return text === 'DÉSACTIVER' || text === 'DESACTIVER';
    });
    if (disableBtn) {
        console.log('Popup detected, clicking DÉSACTIVER');
        disableBtn.click();
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // Auto-click "JE NE PEUX PAS ÉCOUTER" for audio exercises
    const cantListenBtn = allButtons.find(btn => {
        const text = (btn.innerText || '').trim().toUpperCase();
        return text.includes('NE PEUX PAS') || text.includes('PAS ÉCOUTER') || text.includes('PAS ECOUTER');
    });
    if (cantListenBtn) {
        console.log('Audio exercise detected, clicking "Je ne peux pas écouter"');
        cantListenBtn.click();
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // Skip screens (rules, corrections, difficulty) — no exercise words visible
    const clickableWords = document.querySelectorAll('div[tabindex="0"]');
    const hasExerciseWords = Array.from(clickableWords).some(el => {
        const text = (el.innerText || '').trim();
        return text.length > 0 && text.length < 40 && !el.querySelector('svg');
    });

    if (!hasExerciseWords) {
        const skipButton = allButtons.find(btn => {
            const text = (btn.innerText || btn.textContent || '').trim().toUpperCase();
            return text === 'CONTINUER' || text === 'SUIVANT';
        });
        if (skipButton) {
            console.log('Non-exercise screen detected. Clicking:', skipButton.innerText.trim());
            simulateClick(skipButton);
            lastDetectedSentence = '';
            movedPhrases.clear();
            setTimeout(solveLoop, currentDelay);
            return;
        }
    }

    // 2. Check for Correction/Suivant screen (after answering)
    const correctionButton = allButtons.find(btn => {
        const text = (btn.innerText || btn.textContent || '').trim().toUpperCase();
        return text.includes('SUIVANT');
    });

    if (correctionButton) {
        console.log('Correction screen detected. Clicking Suivant...');
        simulateClick(correctionButton);
        lastDetectedSentence = '';
        movedPhrases.clear();
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // 3. Find Valider button (only when answering)
    const dataTestButtons = Array.from(document.querySelectorAll(config.buttonSelector)).filter(isVisible);
    const actionButton = dataTestButtons.find(btn => {
        const text = (btn.innerText || btn.textContent || '').trim();
        return config.nextButtonText.some(t => text.includes(t));
    });

    if (actionButton && !actionButton.disabled) {
        console.log('Clicking action button:', actionButton.innerText.trim());
        actionButton.click();
        lastDetectedSentence = '';
        setTimeout(solveLoop, currentDelay);
        return;
    }

    // 3. Look for sentence words and solve
    const potentialWords = Array.from(document.querySelectorAll(config.wordSelector)).filter(isVisible);

    // Normalize apostrophes/quotes for comparison (site uses U+2019 curly quote)
    function normalizeText(str) {
        return str.replace(/[\u2018\u2019\u02BC\u0060]/g, "'");
    }

    const noMistakeButton = potentialWords.find(el => {
        const text = el.innerText ? normalizeText(el.innerText).replace(/\s+/g, ' ').trim().toUpperCase() : '';
        // Must contain "PAS DE FAUTE" AND be short enough to be a button (not a container)
        return (text.includes("IL N'Y A PAS DE FAUTE") || text.includes("PAS DE FAUTE")) && text.length < 30;
    });

    const sentenceWords = potentialWords.filter(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        const upperText = normalizeText(text).toUpperCase();
        if (noMistakeButton && el === noMistakeButton) return false;
        return text.length > 0 &&
            text.length < 40 &&
            !el.querySelector('svg') &&
            !el.closest('[data-testid="html"]') &&
            !upperText.includes('COUP DE POUCE') &&
            !upperText.includes('PAS DE FAUTE') &&
            !upperText.includes('RETOUR AU MENU') &&
            !upperText.includes('SUIVANT') &&
            !upperText.includes('CONTINUER') &&
            !upperText.includes('VALIDER');
    });

    if (sentenceWords.length > 0) {
        const fullSentence = sentenceWords.map(w => w.innerText.trim()).join(' ');

        if (fullSentence !== lastDetectedSentence) {
            console.log('Detected sentence:', fullSentence);

            isSolving = true;

            const exercises = getExercisesFromDOM();
            if (exercises) {
                // Only mark as seen once we have exercises to work with
                lastDetectedSentence = fullSentence;
                console.log(`Found ${exercises.length} exercises in React state.`);
                const displayedWords = sentenceWords.map(w => w.innerText.trim());
                const currentExercise = findCurrentExercise(exercises, displayedWords);

                if (currentExercise) {
                    const answer = getAnswerForExercise(currentExercise);
                    console.log('Answer:', answer);

                    // Check if we should intentionally make a mistake
                    const shouldMakeMistake = errorRate > 0 && Math.random() * 100 < errorRate;

                    if (shouldMakeMistake && sentenceWords.length > 1) {
                        // Intentional mistake: click a random wrong word or wrong action
                        console.log(`Intentional mistake (${errorRate}% rate)`);
                        incrementStat('wrong');
                        if (answer && answer.type === 'no_mistake') {
                            // Should be "pas de faute" → click a random word instead
                            const randomWord = sentenceWords[Math.floor(Math.random() * sentenceWords.length)];
                            simulateClick(randomWord);
                        } else if (answer && answer.type === 'click_word') {
                            // Should click a specific word → click "pas de faute" or wrong word
                            if (noMistakeButton && Math.random() < 0.5) {
                                const rect = noMistakeButton.getBoundingClientRect();
                                document.dispatchEvent(new CustomEvent('__pv_click', { detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }));
                            } else {
                                // Click a wrong word
                                const wrongWords = sentenceWords.filter(w =>
                                    normalizeSentence(w.innerText.trim()) !== normalizeSentence(answer.word)
                                );
                                if (wrongWords.length > 0) {
                                    const randomWrong = wrongWords[Math.floor(Math.random() * wrongWords.length)];
                                    simulateClick(randomWrong);
                                }
                            }
                        }
                    } else if (answer && answer.type === 'no_mistake') {
                        console.log('No mistake → clicking "Pas de faute"');
                        // Find the button using multiple strategies
                        let btn = noMistakeButton;
                        if (!btn) {
                            const allBtns = Array.from(document.querySelectorAll('[data-testid="button"], button, div[role="button"]')).filter(isVisible);
                            btn = allBtns.find(b => {
                                const t = normalizeText(b.innerText || '').toUpperCase();
                                return t.includes('PAS DE FAUTE');
                            });
                        }
                        if (btn) {
                            console.log('Found Pas de faute button:', btn.tagName, btn.className.substring(0, 50));
                            const rect = btn.getBoundingClientRect();
                            const cx = rect.left + rect.width / 2;
                            const cy = rect.top + rect.height / 2;
                            document.dispatchEvent(new CustomEvent('__pv_click', { detail: { x: cx, y: cy } }));
                            incrementStat('correct');
                        } else {
                            console.warn('Pas de faute button not found!');
                        }
                    } else if (answer && answer.type === 'click_word') {
                        const normalizedAnswer = normalizeSentence(answer.word);
                        let targetWord = sentenceWords.find(w =>
                            normalizeSentence(w.innerText.trim()) === normalizedAnswer
                        );
                        if (!targetWord) {
                            const answerWords = normalizedAnswer.split(/\s+/);
                            targetWord = sentenceWords.find(w => {
                                const norm = normalizeSentence(w.innerText.trim());
                                return answerWords.includes(norm);
                            });
                        }
                        if (targetWord) {
                            console.log('Clicking correct word:', answer.word, '→', targetWord.innerText.trim());
                            simulateClick(targetWord);
                            incrementStat('correct');
                        } else {
                            console.warn('Word not found in DOM:', answer.word);
                        }
                    }
                } else {
                    console.warn('Could not match current exercise.');
                    // Debug: show first 5 exercise sentences for comparison
                    const sample = exercises.slice(0, 5).map(ex =>
                        ex.sentence ? ex.sentence.map(s => s.text).join(' ') : '(no sentence)'
                    );
                    console.log('Sample exercises:', sample);
                    console.log('Displayed words:', displayedWords);
                }
            } else {
                // Don't update lastDetectedSentence — retry on next loop
                console.warn('Extractor not ready, will retry...');
            }

            isSolving = false;
        }
    }

    if (solveEnabled) {
        setTimeout(solveLoop, currentDelay);
    }
}

// --- Utilities ---

function simulateClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const options = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

    // React Native Web Pressable uses pointer/touch events
    element.dispatchEvent(new PointerEvent('pointerdown', { ...options, pointerId: 1 }));
    element.dispatchEvent(new MouseEvent('mousedown', options));
    element.dispatchEvent(new PointerEvent('pointerup', { ...options, pointerId: 1 }));
    element.dispatchEvent(new MouseEvent('mouseup', options));
    element.dispatchEvent(new MouseEvent('click', options));
}

function isVisible(elem) {
    if (!elem) return false;
    const style = window.getComputedStyle(elem);
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length) &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0';
}

// --- Inspector Mode ---

let lastHighlighted = null;

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

function highlightElement(e) {
    if (lastHighlighted) lastHighlighted.style.outline = '';
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
    const selector = testId || `${tag}${id}${classes}`;

    console.log('Selected Element:', selector);
    console.log('Inner Text:', el.innerText);

    chrome.runtime.sendMessage({ action: 'logSelector', selector });
}
