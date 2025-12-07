// Lens - Content Script
// Injects the insight display into any webpage with streaming support

let lensPopup = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'LENS_LOADING':
      showLoading();
      break;
    case 'LENS_STREAM_START':
      showStreamingStart();
      break;
    case 'LENS_STREAM_CHUNK':
      updateStreamingContent(message.fullContent);
      break;
    case 'LENS_STREAM_END':
      showInsight(message.insight);
      break;
    case 'LENS_RESULT':
      showInsight(message.insight);
      break;
    case 'LENS_ERROR':
      showError(message.error);
      break;
  }
});

// Create and show loading state
function showLoading() {
  removeExistingPopup();

  lensPopup = document.createElement('div');
  lensPopup.className = 'lens-popup lens-loading';
  lensPopup.innerHTML = `
    <div class="lens-header">
      <span class="lens-logo">◉ Lens</span>
      <button class="lens-close" aria-label="Close">&times;</button>
    </div>
    <div class="lens-content">
      <div class="lens-spinner"></div>
      <span>Seeing through the noise...</span>
    </div>
  `;

  document.body.appendChild(lensPopup);
  positionPopup();
  attachCloseHandler();

  // Animate in
  requestAnimationFrame(() => {
    lensPopup.classList.add('lens-visible');
  });
}

// Show streaming start state
function showStreamingStart() {
  if (!lensPopup) {
    showLoading();
  }

  lensPopup.classList.remove('lens-loading');
  lensPopup.innerHTML = `
    <div class="lens-header">
      <span class="lens-logo">◉ Lens</span>
      <button class="lens-close" aria-label="Close">&times;</button>
    </div>
    <div class="lens-content">
      <div class="lens-insight lens-streaming"></div>
    </div>
  `;

  attachCloseHandler();
}

// Update streaming content
function updateStreamingContent(fullContent) {
  if (!lensPopup) {
    showStreamingStart();
  }

  const insightDiv = lensPopup.querySelector('.lens-insight');
  if (insightDiv) {
    insightDiv.innerHTML = formatInsight(fullContent);
    // Add cursor effect during streaming
    if (!insightDiv.querySelector('.lens-cursor')) {
      const cursor = document.createElement('span');
      cursor.className = 'lens-cursor';
      insightDiv.appendChild(cursor);
    }
  }
}

// Show the insight result (final)
function showInsight(insight) {
  if (!lensPopup) {
    showLoading();
  }

  lensPopup.classList.remove('lens-loading');
  lensPopup.innerHTML = `
    <div class="lens-header">
      <span class="lens-logo">◉ Lens</span>
      <button class="lens-close" aria-label="Close">&times;</button>
    </div>
    <div class="lens-content">
      <div class="lens-insight">${formatInsight(insight)}</div>
    </div>
  `;

  attachCloseHandler();
}

// Show error state
function showError(error) {
  if (!lensPopup) {
    showLoading();
  }

  lensPopup.classList.remove('lens-loading');
  lensPopup.classList.add('lens-error');
  lensPopup.innerHTML = `
    <div class="lens-header">
      <span class="lens-logo">◉ Lens</span>
      <button class="lens-close" aria-label="Close">&times;</button>
    </div>
    <div class="lens-content">
      <div class="lens-error-message">
        <span class="lens-error-icon">⚠️</span>
        <span>${escapeHtml(error)}</span>
      </div>
    </div>
  `;

  attachCloseHandler();
}

// Format the insight as Markdown
function formatInsight(text) {
  return parseMarkdown(text);
}

// Position popup near the selection
function positionPopup() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position below the selection
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX;

    // Adjust if popup would go off-screen
    const popupWidth = 380;
    const popupHeight = 200;

    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - 20;
    }

    if (top + popupHeight > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - popupHeight - 10;
    }

    lensPopup.style.top = `${Math.max(10, top)}px`;
    lensPopup.style.left = `${Math.max(10, left)}px`;
  }
}

// Attach close button handler
function attachCloseHandler() {
  const closeBtn = lensPopup.querySelector('.lens-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeExistingPopup);
  }
}

// Remove existing popup
function removeExistingPopup() {
  if (lensPopup) {
    lensPopup.classList.remove('lens-visible');
    setTimeout(() => {
      if (lensPopup && lensPopup.parentNode) {
        lensPopup.parentNode.removeChild(lensPopup);
      }
      lensPopup = null;
    }, 200);
  }
}

// Close popup when clicking outside
document.addEventListener('click', (e) => {
  if (lensPopup && !lensPopup.contains(e.target)) {
    removeExistingPopup();
  }
});

// Close popup on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lensPopup) {
    removeExistingPopup();
  }
});
