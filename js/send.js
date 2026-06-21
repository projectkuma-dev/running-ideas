/**
 * Send screen controller.
 *
 * Lets the user pick a recipient, previews the session, and posts to the backend.
 * On success it offers to clear the session and returns to capture.
 */
import { CONFIG } from './config.js';
import { loadIdeas, clearSession } from './storage.js';
import { sendIdeas } from './api.js';
import { toast, formatTime, escapeHtml } from './ui.js';

export function initSend({ onAfterSend } = {}) {
  const select = document.getElementById('recipient-select');
  const sendBtn = document.getElementById('send-btn');
  const countEl = document.getElementById('send-count');
  const preview = document.getElementById('send-preview');

  const overlay = document.getElementById('success-overlay');
  const successMsg = document.getElementById('success-msg');
  const newSessionBtn = document.getElementById('new-session-btn');
  const keepBtn = document.getElementById('keep-btn');

  // Populate recipient dropdown from config (labels only — no addresses).
  select.innerHTML = CONFIG.recipients
    .map((r) => `<option value="${escapeHtml(r.key)}">${escapeHtml(r.label)}</option>`)
    .join('');

  function showSuccess(count, label) {
    successMsg.textContent =
      `${count} idea${count === 1 ? '' : 's'} emailed to ${label}.`;
    overlay.hidden = false;
  }

  function finish({ clear }) {
    if (clear) clearSession();
    overlay.hidden = true;
    render();
    onAfterSend?.();
  }

  newSessionBtn.addEventListener('click', () => finish({ clear: true }));
  keepBtn.addEventListener('click', () => finish({ clear: false }));

  function render() {
    const ideas = loadIdeas();
    countEl.textContent = `${ideas.length} idea${ideas.length === 1 ? '' : 's'}`;
    sendBtn.disabled = ideas.length === 0;

    preview.innerHTML = ideas
      .map(
        (idea) => `
        <li>
          <span class="pv-time">${formatTime(idea.ts)}</span>
          ${escapeHtml(idea.text)}
        </li>`
      )
      .join('');
  }

  async function send() {
    const ideas = loadIdeas();
    if (ideas.length === 0) return;

    const recipient = select.value;
    const label = CONFIG.recipients.find((r) => r.key === recipient)?.label || recipient;

    sendBtn.disabled = true;
    const original = sendBtn.textContent;
    sendBtn.textContent = 'Sending…';

    try {
      await sendIdeas({
        recipient,
        ideas: ideas.map(({ text, ts }) => ({ text, ts })),
      });

      // Success screen lets the user clear or keep — no jarring native dialog.
      showSuccess(ideas.length, label);
    } catch (err) {
      toast(err.message || 'Send failed', 'error');
    } finally {
      sendBtn.textContent = original;
      sendBtn.disabled = loadIdeas().length === 0;
    }
  }

  sendBtn.addEventListener('click', send);

  return { render };
}
