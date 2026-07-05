/**
 * History screen controller.
 *
 * Read-only view over the local sent-ideas archive (storage.js), newest
 * first, grouped by day, with live substring search.
 */
import { loadHistory } from './storage.js';
import { formatTime, escapeHtml } from './ui.js';
import { CONFIG } from './config.js';

export function initHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const search = document.getElementById('history-search');

  function labelFor(key) {
    return CONFIG.recipients.find((r) => r.key === key)?.label || key;
  }

  function dayOf(ts) {
    return new Date(ts).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const entries = loadHistory()
      .filter((e) => !q || e.text.toLowerCase().includes(q))
      .reverse(); // newest first

    empty.hidden = entries.length > 0;
    empty.textContent = q
      ? 'No sent ideas match that search.'
      : 'Nothing sent yet. Ideas land here after you send them.';

    let lastDay = null;
    const parts = [];
    for (const e of entries) {
      const day = dayOf(e.sentAt);
      if (day !== lastDay) {
        parts.push(`<li class="history-day">${escapeHtml(day)}</li>`);
        lastDay = day;
      }
      parts.push(`
        <li class="idea-item">
          <span class="idea-text">${escapeHtml(e.text)}</span>
          <span class="idea-meta">
            <span class="idea-time">captured ${formatTime(e.ts)}</span>
            <span class="history-chip history-chip-${escapeHtml(e.recipient)}">${escapeHtml(labelFor(e.recipient))}</span>
          </span>
        </li>`);
    }
    list.innerHTML = parts.join('');
  }

  search.addEventListener('input', render);

  return { render };
}
