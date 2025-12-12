// Lens - Background Service Worker
// A Bicycle for the Mind in the Age of Noise
// Multi-provider support: OpenRouter, DeepSeek, OpenAI

// Provider configurations with API endpoints and model mappings
const PROVIDERS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/user/lens-extension',
      'X-Title': 'Lens - See Through the Noise'
    }),
    models: {
      'gemini-3-pro': { id: 'google/gemini-3-pro-preview', supportsThinking: true },
      'gemini-2.5-pro': { id: 'google/gemini-2.5-pro-preview-06-05', supportsThinking: true },
      'claude-4-opus': { id: 'anthropic/claude-opus-4', supportsThinking: true },
      'claude-4-sonnet': { id: 'anthropic/claude-sonnet-4', supportsThinking: true }
    },
    reasoningFormat: 'openrouter', // reasoning: { effort: "medium" }
    errorMessage: 'Invalid OpenRouter API key. Get yours at openrouter.ai/keys'
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/chat/completions',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    models: {
      'deepseek-chat': { id: 'deepseek-chat', supportsThinking: true }
    },
    reasoningFormat: 'deepseek', // thinking: { type: "enabled" }
    errorMessage: 'Invalid DeepSeek API key. Get yours at platform.deepseek.com'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    models: {
      'gpt-5.2': { id: 'gpt-5.2', supportsThinking: true },
      'gpt-5': { id: 'gpt-5', supportsThinking: true }
    },
    reasoningFormat: 'openai', // reasoning_effort: "medium"
    errorMessage: 'Invalid OpenAI API key. Get yours at platform.openai.com'
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

// Get browser's preferred language
async function getBrowserLanguage() {
  return new Promise((resolve) => {
    // chrome.i18n.getAcceptLanguages returns the user's preferred languages
    // from Chrome settings -> Languages -> Preferred languages
    chrome.i18n.getAcceptLanguages((languages) => {
      if (languages && languages.length > 0) {
        // Get the first preferred language and extract the base language code
        // e.g., "en-US" -> "en", "zh-CN" -> "zh"
        const primaryLang = languages[0].split('-')[0].toLowerCase();
        resolve(primaryLang);
      } else {
        // Fallback to UI language
        const uiLang = chrome.i18n.getUILanguage().split('-')[0].toLowerCase();
        resolve(uiLang);
      }
    });
  });
}

// Build system prompt with language instruction
async function buildSystemPrompt(language) {
  let prompt = LENS_BASE_PROMPT;

  let targetLang = language;
  if (!language || language === 'auto') {
    // Get browser's preferred language
    targetLang = await getBrowserLanguage();
  }

  if (targetLang && LANGUAGE_NAMES[targetLang]) {
    const langName = LANGUAGE_NAMES[targetLang];
    prompt += `\n\nIMPORTANT: You MUST respond in ${langName}.`;
  }

  return prompt;
}

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lens-analyze',
    title: chrome.i18n.getMessage('contextMenuTitle') || 'Lens',
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

// Generate insight using the configured API provider with streaming
async function generateInsightStreaming(text, tabId) {
  const config = await chrome.storage.sync.get(['apiKey', 'provider', 'model', 'language', 'enableThinking']);

  if (!config.apiKey) {
    throw new Error('Please set your API key in Lens settings');
  }

  const providerKey = config.provider || 'openrouter';
  const provider = PROVIDERS[providerKey];

  if (!provider) {
    throw new Error(`Unknown provider: ${providerKey}`);
  }

  const modelKey = config.model || Object.keys(provider.models)[0];
  const model = provider.models[modelKey];

  if (!model) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  const language = config.language || 'auto';
  const enableThinking = config.enableThinking !== false; // Default to true
  const systemPrompt = await buildSystemPrompt(language);

  // Build request body
  const requestBody = {
    model: model.id,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `What do you think of this? Give your commentary:\n\n"${text}"` }
    ],
    stream: true
  };

  // Add reasoning parameter based on provider format
  if (enableThinking && model.supportsThinking) {
    switch (provider.reasoningFormat) {
      case 'openrouter':
        // OpenRouter uses reasoning: { effort: "medium" }
        requestBody.reasoning = { effort: 'medium' };
        break;
      case 'deepseek':
        // DeepSeek uses thinking: { type: "enabled" }
        requestBody.thinking = { type: 'enabled' };
        break;
      case 'openai':
        // OpenAI Chat Completions uses reasoning_effort: "medium"
        requestBody.reasoning_effort = 'medium';
        break;
    }
  }

  // Only add temperature for providers/modes that support it
  // DeepSeek thinking mode and OpenAI reasoning don't support temperature
  if (!enableThinking || provider.reasoningFormat === 'openrouter') {
    requestBody.temperature = 0.7;
  }

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: provider.headers(config.apiKey),
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    let errorMessage = 'API request failed';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
    } catch (e) {
      // Ignore JSON parse errors
    }

    if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Invalid') || response.status === 401) {
      throw new Error(provider.errorMessage);
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
