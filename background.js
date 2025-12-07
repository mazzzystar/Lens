// Lens - Background Service Worker
// A Bicycle for the Mind in the Age of Noise
// Powered by OpenRouter

// Available models
const MODELS = {
  'gemini-3-pro': {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    supportsThinking: true
  },
  'claude-4-opus': {
    id: 'anthropic/claude-opus-4',
    name: 'Claude 4 Opus',
    supportsThinking: true
  }
};

// The Soul of Lens: The Prompt
const LENS_BASE_PROMPT = `You are Lens, a thoughtful analyst. Give sharp, insightful, and comprehensive commentary on the given text.

Your analysis should be:
- **Sharp**: Get to the core of what's being said
- **Insightful**: Offer perspectives the reader might not have considered
- **Comprehensive**: Cover the key dimensions - logic, assumptions, implications, context

Format your response in Markdown. Use headers, bullet points, or emphasis where appropriate to structure your thoughts clearly.`;

// Language names mapping (30 languages)
const LANGUAGE_NAMES = {
  'en': 'English',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'uk': 'Ukrainian',
  'cs': 'Czech',
  'sv': 'Swedish',
  'da': 'Danish',
  'fi': 'Finnish',
  'no': 'Norwegian',
  'el': 'Greek',
  'he': 'Hebrew',
  'ro': 'Romanian'
};

// Build system prompt with language instruction
function buildSystemPrompt(language) {
  let prompt = LENS_BASE_PROMPT;
  if (language && language !== 'auto') {
    const langName = LANGUAGE_NAMES[language] || language;
    prompt += `\n\nIMPORTANT: You MUST respond in ${langName}.`;
  }
  return prompt;
}

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lens-analyze',
    title: chrome.i18n.getMessage('contextMenuTitle') || '💡 Lens',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'lens-analyze' && info.selectionText) {
    // Tell content script to clear selection and show loading
    chrome.tabs.sendMessage(tab.id, {
      type: 'LENS_START',
      text: info.selectionText
    });

    try {
      await generateInsightStreaming(info.selectionText, tab.id);
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'LENS_ERROR',
        error: error.message
      });
    }
  }
});

// Generate insight using OpenRouter API with streaming
async function generateInsightStreaming(text, tabId) {
  const config = await chrome.storage.sync.get(['apiKey', 'model', 'language', 'enableThinking']);

  if (!config.apiKey) {
    throw new Error('Please set your OpenRouter API key in Lens settings');
  }

  const modelKey = config.model || 'gemini-3-pro';
  const model = MODELS[modelKey];
  const language = config.language || 'auto';
  const enableThinking = config.enableThinking || false;
  const systemPrompt = buildSystemPrompt(language);

  // Build request body
  const requestBody = {
    model: model.id,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `What do you think of this? Give your commentary:\n\n"${text}"` }
    ],
    temperature: 0.7,
    stream: true
  };

  // Add reasoning parameter if thinking is enabled and model supports it
  if (enableThinking && model.supportsThinking) {
    requestBody.reasoning = {
      effort: 'medium'
    };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://github.com/user/lens-extension',
      'X-Title': 'Lens - See Through the Noise'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error?.message || 'API request failed';
    if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized') || response.status === 401) {
      throw new Error('Invalid OpenRouter API key. Get yours at openrouter.ai/keys');
    }
    throw new Error(errorMessage);
  }

  // Process streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let isFirstChunk = true;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from buffer
      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        // Skip empty lines and comments
        if (!line || line.startsWith(':')) continue;

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);

            // Check for errors
            if (parsed.error) {
              throw new Error(parsed.error.message || 'Stream error');
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;

              // Send streaming update to content script
              if (isFirstChunk) {
                chrome.tabs.sendMessage(tabId, {
                  type: 'LENS_STREAM_START'
                });
                isFirstChunk = false;
              }

              chrome.tabs.sendMessage(tabId, {
                type: 'LENS_STREAM_CHUNK',
                chunk: content,
                fullContent: fullContent
              });
            }
          } catch (e) {
            if (e.message !== 'Stream error') {
              // Ignore JSON parse errors for incomplete chunks
            } else {
              throw e;
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Send final result
  chrome.tabs.sendMessage(tabId, {
    type: 'LENS_STREAM_END',
    insight: fullContent
  });
}
