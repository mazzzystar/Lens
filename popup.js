// Lens - Popup Script
// Simple settings management for OpenRouter

document.addEventListener('DOMContentLoaded', async () => {
  // Apply i18n translations
  applyTranslations();

  const modelSelect = document.getElementById('model');
  const apiKeyInput = document.getElementById('apiKey');
  const enableThinkingCheckbox = document.getElementById('enableThinking');
  const languageSelect = document.getElementById('language');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  const config = await chrome.storage.sync.get(['apiKey', 'model', 'language', 'enableThinking']);

  if (config.model) {
    modelSelect.value = config.model;
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
    const model = modelSelect.value;
    const language = languageSelect.value;
    const enableThinking = enableThinkingCheckbox.checked;

    if (!apiKey) {
      showStatus('errorNoApiKey', 'error', 'Please enter an API key');
      return;
    }

    // Basic validation for OpenRouter API key
    if (!apiKey.startsWith('sk-or-')) {
      showStatus('errorInvalidApiKey', 'error', 'OpenRouter API keys should start with "sk-or-"');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey, model, language, enableThinking });
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
