/** Small shared UI helpers: toast notifications and time formatting. */

let toastTimer = null;

/**
 * Show a transient toast.
 * @param {string} message
 * @param {'info'|'ok'|'error'} [type]
 */
export function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;

  clearTimeout(toastTimer);
  el.textContent = message;
  el.className = 'toast' + (type === 'ok' ? ' toast-ok' : type === 'error' ? ' toast-error' : '');
  el.hidden = false;
  // force reflow so the transition runs even on rapid repeat calls
  void el.offsetWidth;
  el.classList.add('show');

  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 220);
  }, type === 'error' ? 3500 : 2200);
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
