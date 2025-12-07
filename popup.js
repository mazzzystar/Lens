// Lens - Popup Script
// Simple settings management for OpenRouter

document.addEventListener('DOMContentLoaded', async () => {
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
  if (config.enableThinking) {
    enableThinkingCheckbox.checked = config.enableThinking;
  }

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const language = languageSelect.value;
    const enableThinking = enableThinkingCheckbox.checked;

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Basic validation for OpenRouter API key
    if (!apiKey.startsWith('sk-or-')) {
      showStatus('OpenRouter API keys should start with "sk-or-"', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey, model, language, enableThinking });
      showStatus('Settings saved successfully', 'success');
    } catch (error) {
      showStatus('Failed to save settings', 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});
