/**
 * Triage / send screen controller.
 *
 * Post-run "clarify" step: each idea gets routed (Work / Personal / Trash),
 * text can be edited in place, then one email is sent per non-empty group.
 *
 * The Edge Function contract is unchanged ({ recipient, ideas }) — routing is
 * purely a frontend concern: one call per group. Ideas are removed from the
 * session as each group sends successfully, so a partial failure (flaky
 * signal) never double-sends; retrying only sends what's left.
 */
import { CONFIG } from './config.js';
import {
  loadIdeas, updateIdea, setAllRoutes, removeIdeas, getDefaultRoute,
} from './storage.js';
import { sendIdeas } from './api.js';
import { toast, formatTime, escapeHtml } from './ui.js';

const ROUTES = ['work', 'personal', 'trash'];

export function initSend({ onAfterSend } = {}) {
  const list = document.getElementById('triage-list');
  const sendBtn = document.getElementById('send-btn');
  const overlay = document.getElementById('success-overlay');
  const successMsg = document.getElementById('success-msg');
  const doneBtn = document.getElementById('done-btn');

  let editingId = null;

  function labelFor(key) {
    return CONFIG.recipients.find((r) => r.key === key)?.label || key;
  }

  /** Route with the session default applied to unrouted ideas. */
  function routeOf(idea) {
    return ROUTES.includes(idea.route) ? idea.route : getDefaultRoute();
  }

  function groups() {
    const byRoute = { work: [], personal: [], trash: [] };
    for (const idea of loadIdeas()) byRoute[routeOf(idea)].push(idea);
    return byRoute;
  }

  function render() {
    const ideas = loadIdeas();

    list.innerHTML = ideas
      .map((idea) => {
        const route = routeOf(idea);
        const isEditing = idea.id === editingId;
        const textHtml = isEditing
          ? `<textarea class="triage-edit" rows="2" aria-label="Edit idea">${escapeHtml(idea.text)}</textarea>`
          : `<div class="triage-text" role="button" tabindex="0" aria-label="Edit idea">${escapeHtml(idea.text)}</div>`;

        return `
        <li class="triage-item${route === 'trash' ? ' is-trash' : ''}" data-id="${idea.id}">
          ${textHtml}
          <span class="triage-time">${formatTime(idea.ts)}</span>
          <div class="seg" role="group" aria-label="Route idea">
            <button class="seg-btn${route === 'work' ? ' active' : ''}" type="button" data-route="work">Work</button>
            <button class="seg-btn${route === 'personal' ? ' active' : ''}" type="button" data-route="personal">Personal</button>
            <button class="seg-btn${route === 'trash' ? ' active' : ''}" type="button" data-route="trash" aria-label="Trash idea">🗑</button>
          </div>
        </li>`;
      })
      .join('');

    if (editingId) {
      const ta = list.querySelector('.triage-edit');
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }

    updateSendButton();
  }

  function updateSendButton() {
    const { work, personal, trash } = groups();
    const parts = [];
    if (work.length) parts.push(`${work.length} to ${labelFor('work')}`);
    if (personal.length) parts.push(`${personal.length} to ${labelFor('personal')}`);

    if (parts.length) {
      sendBtn.textContent = `Send ${parts.join(' · ')}`;
      sendBtn.disabled = false;
    } else if (trash.length) {
      sendBtn.textContent = `Discard ${trash.length} idea${trash.length === 1 ? '' : 's'}`;
      sendBtn.disabled = false;
    } else {
      sendBtn.textContent = 'Nothing to send';
      sendBtn.disabled = true;
    }
  }

  /* ---------- editing ---------- */

  function startEdit(id) {
    editingId = id;
    render();
  }

  function commitEdit(ta) {
    const id = editingId;
    editingId = null;
    const text = ta.value.trim();
    if (id && text) updateIdea(id, { text });
    render();
  }

  /* ---------- events ---------- */

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.triage-item');
    if (!item) return;
    const id = item.dataset.id;

    const segBtn = e.target.closest('.seg-btn');
    if (segBtn) {
      updateIdea(id, { route: segBtn.dataset.route });
      render();
      return;
    }

    if (e.target.closest('.triage-text')) startEdit(id);
  });

  list.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('triage-text') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      startEdit(e.target.closest('.triage-item')?.dataset.id);
      return;
    }
    if (e.target.classList.contains('triage-edit')) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitEdit(e.target);
      } else if (e.key === 'Escape') {
        editingId = null;
        render();
      }
    }
  });

  // Save the edit when focus leaves the textarea.
  list.addEventListener('focusout', (e) => {
    if (e.target.classList?.contains('triage-edit') && editingId) commitEdit(e.target);
  });

  for (const btn of document.querySelectorAll('.btn-bulk')) {
    btn.addEventListener('click', () => {
      setAllRoutes(btn.dataset.bulk);
      render();
    });
  }

  /* ---------- sending ---------- */

  async function send() {
    const { work, personal, trash } = groups();
    const toSend = { work, personal };
    const sendable = work.length + personal.length;

    // Nothing routed to an email — the button is in "Discard" mode.
    if (sendable === 0) {
      if (trash.length) {
        removeIdeas(trash.map((i) => i.id));
        toast('Discarded', 'info');
        render();
        onAfterSend?.();
      }
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    const sentParts = [];
    try {
      for (const key of ['work', 'personal']) {
        const group = toSend[key];
        if (!group.length) continue;

        await sendIdeas({
          recipient: key,
          ideas: group.map(({ text, ts }) => ({ text, ts })),
        });

        // Remove as soon as this group is confirmed sent — a later failure
        // must not resend it.
        removeIdeas(group.map((i) => i.id));
        sentParts.push(`${group.length} idea${group.length === 1 ? '' : 's'} to ${labelFor(key)}`);
      }

      removeIdeas(trash.map((i) => i.id));
      successMsg.textContent = `Emailed ${sentParts.join(' · ')}.`;
      overlay.hidden = false;
    } catch (err) {
      const done = sentParts.length ? `${sentParts.join(' · ')} sent — ` : '';
      toast(`${done}${err.message || 'Send failed'}`, 'error');
    } finally {
      render();
    }
  }

  sendBtn.addEventListener('click', send);

  doneBtn.addEventListener('click', () => {
    overlay.hidden = true;
    render();
    onAfterSend?.();
  });

  return { render };
}
