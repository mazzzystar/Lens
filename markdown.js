// Simple Markdown parser for Lens
// Supports: headers, bold, italic, code, lists, blockquotes, links

function parseMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="lens-code-block"><code>${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="lens-inline-code">$1</code>');

  // Headers (## Header)
  html = html.replace(/^### (.+)$/gm, '<h4 class="lens-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="lens-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="lens-h2">$1</h2>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>');

  // Blockquotes (> quote)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="lens-quote">$1</blockquote>');

  // Unordered lists (- item or * item)
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="lens-li">$1</li>');
  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/(<li class="lens-li">.*<\/li>\n?)+/g, (match) => {
    return `<ul class="lens-ul">${match}</ul>`;
  });

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="lens-oli">$1</li>');
  // Wrap consecutive ordered <li> tags in <ol>
  html = html.replace(/(<li class="lens-oli">.*<\/li>\n?)+/g, (match) => {
    return `<ol class="lens-ol">${match}</ol>`;
  });

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="lens-link">$1</a>');

  // Horizontal rules (--- or ***)
  html = html.replace(/^[\-\*]{3,}$/gm, '<hr class="lens-hr">');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up multiple <br> tags
  html = html.replace(/(<br>){3,}/g, '<br><br>');

  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
