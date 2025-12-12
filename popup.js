// Lens - Popup Script
// Settings management for multiple AI providers

// Provider configurations
const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    apiKeyPrefix: 'sk-or-',
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyUrl: 'https://openrouter.ai/keys',
    apiKeyUrlText: 'openrouter.ai/keys',
    models: [
      { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'claude-4-opus', label: 'Claude 4 Opus' },
      { value: 'claude-4-sonnet', label: 'Claude 4 Sonnet' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    apiKeyPrefix: 'sk-',
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    apiKeyUrlText: 'platform.deepseek.com',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' }
    ]
  },
  openai: {
    name: 'OpenAI',
    apiKeyPrefix: 'sk-',
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyUrlText: 'platform.openai.com',
    models: [
      { value: 'gpt-5.2', label: 'GPT-5.2' },
      { value: 'gpt-5', label: 'GPT-5' }
    ]
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Apply i18n translations
  applyTranslations();

  const providerSelect = document.getElementById('provider');
  const modelSelect = document.getElementById('model');
  const apiKeyInput = document.getElementById('apiKey');
  const enableThinkingCheckbox = document.getElementById('enableThinking');
  const languageSelect = document.getElementById('language');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const apiLink = document.getElementById('apiLink');
  const apiLinkText = document.getElementById('apiLinkText');

  // Update models when provider changes
  function updateModels(provider) {
    const providerConfig = PROVIDERS[provider];
    modelSelect.innerHTML = '';

    providerConfig.models.forEach((model, index) => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      if (index === 0) option.selected = true;
      modelSelect.appendChild(option);
    });

    // Update API key placeholder and link
    apiKeyInput.placeholder = providerConfig.apiKeyPlaceholder;
    apiLink.href = providerConfig.apiKeyUrl;
    apiLink.textContent = providerConfig.apiKeyUrlText;
  }

  // Provider change handler
  providerSelect.addEventListener('change', () => {
    updateModels(providerSelect.value);
  });

  // Load saved settings
  const config = await chrome.storage.sync.get(['apiKey', 'provider', 'model', 'language', 'enableThinking']);

  // Set provider first (defaults to openrouter)
  const savedProvider = config.provider || 'openrouter';
  providerSelect.value = savedProvider;
  updateModels(savedProvider);

  // Then set model if it exists and is valid for this provider
  if (config.model) {
    const providerModels = PROVIDERS[savedProvider].models.map(m => m.value);
    if (providerModels.includes(config.model)) {
      modelSelect.value = config.model;
    }
  }

  if (config.apiKey) {
    apiKeyInput.value = config.apiKey;
  }
  if (config.language) {
    languageSelect.value = config.language;
  }
  // Default to thinking enabled
  enableThinkingCheckbox.checked = config.enableThinking !== false;

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const provider = providerSelect.value;
    const model = modelSelect.value;
    const language = languageSelect.value;
    const enableThinking = enableThinkingCheckbox.checked;

    if (!apiKey) {
      showStatus('errorNoApiKey', 'error', 'Please enter an API key');
      return;
    }

    const providerConfig = PROVIDERS[provider];

    // Basic validation for API key format
    if (!apiKey.startsWith(providerConfig.apiKeyPrefix)) {
      showStatus('errorInvalidApiKey', 'error',
        `${providerConfig.name} API keys should start with "${providerConfig.apiKeyPrefix}"`);
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey, provider, model, language, enableThinking });
      showStatus('statusSaved', 'success', 'Settings saved successfully');
    } catch (error) {
      showStatus('statusError', 'error', 'Failed to save settings');
    }
  });

  function showStatus(messageKey, type, fallback) {
    const message = chrome.i18n.getMessage(messageKey) || fallback || messageKey;
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});

// Apply translations to elements with data-i18n attributes
function applyTranslations() {
  // Text content translations
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      // Preserve inner HTML for elements with links
      if (el.querySelector('a') || el.querySelector('code')) {
        // Replace only the text parts, keep the HTML
        el.innerHTML = message;
      } else {
        el.textContent = message;
      }
    }
  });

  // Placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      el.placeholder = message;
    }
  });
}
