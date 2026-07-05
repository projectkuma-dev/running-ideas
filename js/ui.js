/** Small shared UI helpers: toast notifications and time formatting. */

let toastTimer = null;

/**
 * Show a transient toast.
 * @param {string} message
 * @param {'info'|'ok'|'error'} [type]
 * @param {{ actionLabel: string, onAction: () => void }} [action]
 *   Optional action button (e.g. Undo). Toast lingers longer when present.
 */
export function toast(message, type = 'info', action = null) {
  const el = document.getElementById('toast');
  if (!el) return;

  clearTimeout(toastTimer);
  el.textContent = message;
  el.className = 'toast' + (type === 'ok' ? ' toast-ok' : type === 'error' ? ' toast-error' : '');

  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.actionLabel;
    btn.addEventListener('click', () => {
      hideToast(el);
      action.onAction();
    });
    el.appendChild(btn);
  }

  el.hidden = false;
  // force reflow so the transition runs even on rapid repeat calls
  void el.offsetWidth;
  el.classList.add('show');

  const duration = action ? 5000 : type === 'error' ? 3500 : 2200;
  toastTimer = setTimeout(() => hideToast(el), duration);
}

function hideToast(el) {
  clearTimeout(toastTimer);
  el.classList.remove('show');
  setTimeout(() => { el.hidden = true; }, 220);
}

/** "2:47 PM" — short, glanceable time. */
export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Escape user text before inserting as HTML. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
