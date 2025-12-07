// Lens - Content Script
// Select text → Right-click → 💡 Lens → See insight below

let currentInsight = null;
let savedInsertInfo = null;

// Save selection position on mouseup (before right-click menu appears)
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
    const range = selection.getRangeAt(0);
    savedInsertInfo = findInsertPosition(range);
  }
});

// Also save on selectionchange for better coverage
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
    const range = selection.getRangeAt(0);
    savedInsertInfo = findInsertPosition(range);
  }
});

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
  // Clear selection so user can see original text
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  // Show loading state immediately using saved position
  showLoading(savedInsertInfo);
}

// Find the best element to insert after using CSS display property
function findInsertPosition(range) {
  let node = range.endContainer;

  // If text node, get parent
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  if (!node) return null;

  // Block-level display values
  const blockDisplays = ['block', 'flex', 'grid', 'table', 'table-row', 'table-cell', 'list-item', 'table-caption'];

  // Walk up to find a block-level element using computed style
  let current = node;
  while (current && current !== document.body && current !== document.documentElement) {
    try {
      const style = window.getComputedStyle(current);
      const display = style.display;

      if (blockDisplays.includes(display)) {
        return {
          element: current,
          tagName: current.tagName,
          display: display
        };
      }
    } catch (e) {
      // getComputedStyle can fail on some elements
    }
    current = current.parentElement;
  }

  // Fallback: return the original node's parent
  return {
    element: node,
    tagName: node.tagName || 'DIV',
    display: 'block'
  };
}

// Show loading state
function showLoading(insertInfo) {
  // Synchronously remove existing insight to avoid race condition
  removeExistingSync();

  // Use provided insertInfo or fallback
  if (!insertInfo || !insertInfo.element) {
    // Fallback: find a reasonable container
    const fallbackEl = document.querySelector('article, main, [role="main"], .content, .post') || document.body.firstElementChild;
    if (!fallbackEl) return;
    insertInfo = { element: fallbackEl, tagName: 'DIV', display: 'block' };
  }

  const insertAfterElement = insertInfo.element;

  // Check if element is still in DOM
  if (!document.body.contains(insertAfterElement)) {
    return;
  }

  // Create insight container - use same tag type as the original for consistency
  const safeTags = ['DIV', 'P', 'SECTION', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE'];
  const useTag = safeTags.includes(insertInfo.tagName) ? insertInfo.tagName.toLowerCase() : 'div';

  currentInsight = document.createElement(useTag);
  currentInsight.className = 'lens-insight lens-loading';
  currentInsight.innerHTML = `
    <div class="lens-insight-header">
      <span class="lens-icon">💡</span>
      <span class="lens-loading-text">Thinking</span>
      <span class="lens-dots"><span>.</span><span>.</span><span>.</span></span>
    </div>
  `;

  // Insert after the element
  try {
    insertAfterElement.insertAdjacentElement('afterend', currentInsight);
  } catch (e) {
    // Some elements don't support insertAdjacentElement, try parentNode
    try {
      insertAfterElement.parentNode.insertBefore(currentInsight, insertAfterElement.nextSibling);
    } catch (e2) {
      // Last resort: append to body
      document.body.appendChild(currentInsight);
    }
  }

  // Make visible with animation
  requestAnimationFrame(() => {
    if (currentInsight) {
      currentInsight.classList.add('lens-visible');
    }
  });
}

// Synchronously remove existing insight (no setTimeout race condition)
function removeExistingSync() {
  if (currentInsight) {
    if (currentInsight.parentNode) {
      currentInsight.remove();
    }
    currentInsight = null;
  }
}

// Start streaming - keep loading state, will update when first chunk arrives
function startStreaming() {
  if (!currentInsight) {
    showLoading(savedInsertInfo);
  }
  // Don't change anything here - keep showing "Thinking..." until first chunk
}

// Update streaming content
function updateStreamingContent(fullContent) {
  if (!currentInsight) {
    showLoading(savedInsertInfo);
  }

  if (!currentInsight) return; // Still no insight, bail out

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

  if (textDiv) {
    textDiv.innerHTML = parseMarkdown(fullContent);
    // Auto-scroll if insight is long
    textDiv.scrollTop = textDiv.scrollHeight;
  }
}

// Finish streaming
function finishStreaming(insight) {
  if (!currentInsight) {
    showLoading(savedInsertInfo);
  }

  if (!currentInsight) return;

  currentInsight.classList.remove('lens-loading');

  // Ensure we have the content structure
  let textDiv = currentInsight.querySelector('.lens-text');
  if (!textDiv) {
    currentInsight.innerHTML = `
      <div class="lens-insight-header">
        <span class="lens-icon">💡</span>
      </div>
      <div class="lens-insight-body">
        <div class="lens-text"></div>
      </div>
    `;
    textDiv = currentInsight.querySelector('.lens-text');
  }

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
    showLoading(savedInsertInfo);
  }

  if (!currentInsight) return;

  currentInsight.classList.remove('lens-loading');
  currentInsight.classList.add('lens-error', 'lens-visible');
  currentInsight.innerHTML = `
    <div class="lens-insight-header">
      <span class="lens-icon">⚠️</span>
      <span class="lens-error-text">${escapeHtml(error)}</span>
      <button class="lens-close" title="Close">×</button>
    </div>
  `;

  const closeBtn = currentInsight.querySelector('.lens-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeExisting);
  }
}

// Remove existing insight (with animation for user-initiated close)
function removeExisting() {
  const toRemove = currentInsight;
  currentInsight = null; // Clear reference immediately to prevent race conditions

  if (toRemove) {
    toRemove.classList.remove('lens-visible');
    setTimeout(() => {
      if (toRemove.parentNode) {
        toRemove.remove();
      }
    }, 200);
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
