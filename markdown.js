// Markdown parser for Lens
// Robust handling of bold, italic, and their combinations

function parseMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Step 1: Protect code blocks (replace with placeholders to avoid processing)
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `\x00CB${codeBlocks.length}\x00`;
    codeBlocks.push(`<pre class="lens-code-block"><code>${code.trim()}</code></pre>`);
    return placeholder;
  });

  // Step 2: Protect inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `\x00IC${inlineCodes.length}\x00`;
    inlineCodes.push(`<code class="lens-inline-code">${code}</code>`);
    return placeholder;
  });

  // Step 3: Headers (must be at start of line)
  html = html.replace(/^#### (.+)$/gm, '<h5 class="lens-h5">$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4 class="lens-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="lens-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="lens-h2">$1</h2>');

  // Step 4: Bold and Italic - process in correct order
  //
  // Key insight: Process from most specific to least specific
  // - *** (bold+italic) before ** (bold) before * (italic)
  // - Use non-greedy matching (.+?)
  // - Require content to start/end with non-whitespace
  // - Limit italic to single line to prevent runaway matches

  // Bold+Italic: ***text*** or ___text___
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // Bold: **text** or __text__
  // Use non-greedy match, content must have at least one char
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  // IMPORTANT: Only match within a single line to prevent runaway matches
  // Also ensure we don't match * that's part of ** (use negative lookbehind/ahead)
  // Match pattern: *nonspace...nonspace* where ... doesn't contain newline or *
  html = html.replace(/(?<!\*)\*([^\s*][^\n*]*[^\s*])\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!\*)\*([^\s*])\*(?!\*)/g, '<em>$1</em>'); // single char

  // Underscore italic: _text_ (not in middle of word)
  html = html.replace(/(?<![a-zA-Z0-9])_([^\s_][^\n_]*[^\s_])_(?![a-zA-Z0-9])/g, '<em>$1</em>');
  html = html.replace(/(?<![a-zA-Z0-9])_([^\s_])_(?![a-zA-Z0-9])/g, '<em>$1</em>'); // single char

  // Step 5: Blockquotes (> quote) - must handle escaped >
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="lens-quote">$1</blockquote>');

  // Step 6: Lists
  // Unordered lists: use - only (avoid * to prevent emphasis conflicts)
  html = html.replace(/^- (.+)$/gm, '<li class="lens-li">$1</li>');
  html = html.replace(/(<li class="lens-li">[^<]*<\/li>\n?)+/g, (match) => {
    return `<ul class="lens-ul">${match}</ul>`;
  });

  // Ordered lists: 1. 2. 3. etc
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="lens-oli">$1</li>');
  html = html.replace(/(<li class="lens-oli">[^<]*<\/li>\n?)+/g, (match) => {
    return `<ol class="lens-ol">${match}</ol>`;
  });

  // Step 7: Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="lens-link">$1</a>');

  // Step 8: Horizontal rules (--- only, not *** to avoid emphasis conflicts)
  html = html.replace(/^-{3,}$/gm, '<hr class="lens-hr">');

  // Step 9: Restore protected content
  codeBlocks.forEach((code, i) => {
    html = html.replace(`\x00CB${i}\x00`, code);
  });
  inlineCodes.forEach((code, i) => {
    html = html.replace(`\x00IC${i}\x00`, code);
  });

  // Step 10: Line breaks
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/(<br>){3,}/g, '<br><br>');

  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
