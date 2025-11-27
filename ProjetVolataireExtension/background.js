// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Projet Voltaire Assistant installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveWithAI') {
    handleAISolve(request.sentence, request.instruction, request.words)
      .then(answer => sendResponse({ success: true, answer: answer }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function handleAISolve(sentence, instruction, words) {
  const data = await chrome.storage.local.get(['apiKey']);
  const apiKey = data.apiKey;

  if (!apiKey) {
    throw new Error('API Key not found. Please set it in the extension popup.');
  }

  const prompt = `
    You are a French grammar expert helping to solve a Projet Voltaire exercise.
    
    Sentence: "${sentence}"
    Instruction: "${instruction}"
    Possible words to click: ${JSON.stringify(words)}

    Task: Identify the single word from the "Possible words" list that corresponds to the error or the target of the instruction.
    If the instruction says to click the error, find the spelling or grammar mistake.
    If the instruction says to click a specific grammatical element (e.g., "sujet", "COD"), identify it.
    
    Return ONLY the exact word as it appears in the list. Do not add any explanation or punctuation.
  `;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API Request failed');
  }

  const result = await response.json();
  const answer = result.candidates[0].content.parts[0].text.trim();

  // Clean up the answer (sometimes AI adds quotes or newlines)
  return answer.replace(/^["']|["']$/g, '').trim();
}
