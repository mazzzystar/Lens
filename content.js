// Lens - Content Script
// Select text → Right-click → 💡 Lens → See insight below

let currentInsight = null;
let insertAfterElement = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'LENS_START':
      handleStart();
      break;
    case 'LENS_STREAM_START':
      startStreaming();
      break;
    case 'LENS_STREAM_CHUNK':
      updateStreamingContent(message.fullContent);
      break;
    case 'LENS_STREAM_END':
      finishStreaming(message.insight);
      break;
    case 'LENS_ERROR':
      showError(message.error);
      break;
  }
});

// Handle start - find position and clear selection
function handleStart() {
  // Find where to insert (after the selected text's container)
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    insertAfterElement = findInsertPosition(range);
  }

  // Clear selection so user can see original text
  selection.removeAllRanges();

  // Show loading state
  showLoading();
}

// Find the best element to insert after
function findInsertPosition(range) {
  let node = range.endContainer;

  // If text node, get parent
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  // Walk up to find a block-level element
  const blockTags = ['P', 'DIV', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];

  while (node && node !== document.body) {
    if (blockTags.includes(node.tagName)) {
      return node;
    }
    // Also check for common content classes
    if (node.classList && (
      node.classList.contains('tweet') ||
      node.classList.contains('post') ||
      node.classList.contains('content') ||
      node.classList.contains('text')
    )) {
      return node;
    }
    node = node.parentElement;
  }

  // Fallback: use the direct parent
  return range.endContainer.parentElement;
}

// Show loading state
function showLoading() {
  removeExisting();

  if (!insertAfterElement) return;

  currentInsight = document.createElement('div');
  currentInsight.className = 'lens-insight lens-loading';
  currentInsight.innerHTML = `
    <div class="lens-insight-header">
      <span class="lens-icon">💡</span>
      <span class="lens-loading-text">Thinking</span>
      <span class="lens-dots"><span>.</span><span>.</span><span>.</span></span>
    </div>
  `;

  insertAfterElement.insertAdjacentElement('afterend', currentInsight);

  requestAnimationFrame(() => {
    currentInsight.classList.add('lens-visible');
  });
}

// Start streaming - keep loading state, will update when first chunk arrives
function startStreaming() {
  if (!currentInsight) {
    showLoading();
  }
  // Don't change anything here - keep showing "Thinking..." until first chunk
}

// Update streaming content
function updateStreamingContent(fullContent) {
  if (!currentInsight) {
    showLoading();
  }

  // Check if we need to transition from loading to content state
  let textDiv = currentInsight.querySelector('.lens-text');
  if (!textDiv) {
    // First content chunk - transition from loading to content display
    currentInsight.classList.remove('lens-loading');
    currentInsight.innerHTML = `
      <div class="lens-insight-header">
        <span class="lens-icon">💡</span>
      </div>
      <div class="lens-insight-body">
        <div class="lens-text lens-streaming"></div>
      </div>
    `;
    textDiv = currentInsight.querySelector('.lens-text');
  }

  textDiv.innerHTML = parseMarkdown(fullContent);

  // Auto-scroll if insight is long
  textDiv.scrollTop = textDiv.scrollHeight;
}

// Finish streaming
function finishStreaming(insight) {
  if (!currentInsight) {
    startStreaming();
  }

  currentInsight.classList.remove('lens-loading');

  const textDiv = currentInsight.querySelector('.lens-text');
  if (textDiv) {
    textDiv.classList.remove('lens-streaming');
    textDiv.innerHTML = parseMarkdown(insight);
  }

  // Add close button
  const header = currentInsight.querySelector('.lens-insight-header');
  if (header && !header.querySelector('.lens-close')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lens-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', removeExisting);
    header.appendChild(closeBtn);
  }
}

// Show error
function showError(error) {
  if (!currentInsight) {
    if (!insertAfterElement) return;

    currentInsight = document.createElement('div');
    currentInsight.className = 'lens-insight';
    insertAfterElement.insertAdjacentElement('afterend', currentInsight);
  }

  currentInsight.classList.remove('lens-loading');
  currentInsight.classList.add('lens-error', 'lens-visible');
  currentInsight.innerHTML = `
    <div class="lens-insight-header">
      <span class="lens-icon">⚠️</span>
      <span class="lens-error-text">${escapeHtml(error)}</span>
      <button class="lens-close" title="Close">×</button>
    </div>
  `;

  currentInsight.querySelector('.lens-close').addEventListener('click', removeExisting);
}

// Remove existing insight
function removeExisting() {
  if (currentInsight) {
    currentInsight.classList.remove('lens-visible');
    setTimeout(() => {
      if (currentInsight && currentInsight.parentNode) {
        currentInsight.remove();
      }
      currentInsight = null;
    }, 200);
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
