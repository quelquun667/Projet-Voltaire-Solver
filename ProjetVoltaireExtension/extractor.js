// extractor.js — Runs in MAIN world (page context)
// Has access to React fiber internals

console.log('[Extractor] Loaded in MAIN world');

function extractExercises() {
    var el = document.querySelector('div[tabindex="0"]');
    if (!el) {
        console.log('[Extractor] No div[tabindex="0"] found');
        return null;
    }

    var fiberKey = Object.keys(el).find(function(k) { return k.startsWith('__reactFiber$'); });
    if (!fiberKey) {
        console.log('[Extractor] No React fiber key found on element');
        return null;
    }

    var fiber = el[fiberKey];
    var allExercises = [];
    var fiberDepth = 0;

    function safeStringify(obj) {
        var localSeen = new WeakSet();
        return JSON.stringify(obj, function(key, val) {
            if (typeof val === 'function') return undefined;
            if (val instanceof Element) return undefined;
            if (typeof val === 'object' && val !== null) {
                try {
                    if (localSeen.has(val)) return undefined;
                    localSeen.add(val);
                } catch(e) { return undefined; }
            }
            return val;
        });
    }

    function findExArrays(obj, results) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            // Match arrays of exercise objects (various types)
            if (obj.length > 0 && obj[0] && obj[0].sentence &&
                (obj[0].type || 'hasMistake' in obj[0])) {
                results.push(obj);
                return;
            }
            for (var i = 0; i < obj.length; i++) {
                findExArrays(obj[i], results);
            }
            return;
        }
        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; j++) {
            if (obj[keys[j]] && typeof obj[keys[j]] === 'object') {
                findExArrays(obj[keys[j]], results);
            }
        }
    }

    while (fiber) {
        fiberDepth++;
        var s = fiber.memoizedState;
        while (s) {
            var val = s.memoizedState;
            if (val && typeof val === 'object') {
                try {
                    var str = safeStringify(val);
                    if (str && str.includes('"sentence"') && (str.includes('"hasMistake"') || str.includes('"type"'))) {
                        var parsed = JSON.parse(str);
                        var found = [];
                        findExArrays(parsed, found);
                        for (var i = 0; i < found.length; i++) {
                            allExercises.push(found[i]);
                        }
                    }
                } catch(e) {}
            }
            s = s.next;
        }
        fiber = fiber.return;
    }

    console.log('[Extractor] Traversed ' + fiberDepth + ' fiber nodes, found ' + allExercises.length + ' exercise arrays');

    if (allExercises.length === 0) return null;

    // Merge all found arrays, deduplicate by id, keep the largest set
    var byId = {};
    for (var a = 0; a < allExercises.length; a++) {
        for (var b = 0; b < allExercises[a].length; b++) {
            var ex = allExercises[a][b];
            if (ex.id) byId[ex.id] = ex;
        }
    }
    var result = Object.values(byId);
    console.log('[Extractor] Returning ' + result.length + ' unique exercises');
    return result;
}

function storeExercises() {
    var exercises = extractExercises();
    var dataEl = document.getElementById('__pv_exercises');
    if (!dataEl) {
        dataEl = document.createElement('div');
        dataEl.id = '__pv_exercises';
        dataEl.style.display = 'none';
        document.body.appendChild(dataEl);
    }
    if (exercises && exercises.length > 0) {
        dataEl.setAttribute('data-exercises', JSON.stringify(exercises));
        dataEl.setAttribute('data-timestamp', Date.now().toString());
        dataEl.setAttribute('data-count', exercises.length.toString());
        console.log('[Extractor] Stored ' + exercises.length + ' exercises in DOM');
    } else {
        console.log('[Extractor] No exercises found to store');
    }
}

// Listen for extraction requests from content script
document.addEventListener('__pv_extract', function() {
    if (!isExercisePage()) return;
    console.log('[Extractor] Received __pv_extract event');
    storeExercises();
});

// Only run on exercise pages
function isExercisePage() {
    return window.location.href.includes('/exercice');
}

// Also run on init with retry
function init() {
    if (!isExercisePage()) {
        console.log('[Extractor] Not an exercise page, skipping.');
        return;
    }
    if (document.body) {
        console.log('[Extractor] Init - attempting first extraction');
        storeExercises();
        if (!document.getElementById('__pv_exercises') ||
            !document.getElementById('__pv_exercises').getAttribute('data-exercises')) {
            var retries = 0;
            var retryInterval = setInterval(function() {
                retries++;
                console.log('[Extractor] Retry #' + retries);
                storeExercises();
                var dataEl = document.getElementById('__pv_exercises');
                if ((dataEl && dataEl.getAttribute('data-exercises')) || retries >= 10) {
                    clearInterval(retryInterval);
                    if (retries >= 10) console.log('[Extractor] Gave up after 10 retries');
                }
            }, 2000);
        }
    } else {
        setTimeout(init, 100);
    }
}

init();
