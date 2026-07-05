/**
 * Capture screen controller.
 *
 * Owns the idea input, the "Add Idea" action, and the live list rendering.
 * Reads/writes ideas only through storage.js.
 *
 * Mid-run affordances:
 *  - Draft autosave: a half-typed idea survives screen lock or reload.
 *  - Undo delete: a mis-tap on Delete is reversible for 5 seconds, no confirm.
 */
import {
  addIdea, deleteIdea, restoreIdea, loadIdeas,
  saveDraft, loadDraft, clearDraft,
} from './storage.js';
import { toast, formatTime, escapeHtml } from './ui.js';

export function initCapture({ onChange } = {}) {
  const input = document.getElementById('idea-input');
  const addBtn = document.getElementById('add-btn');
  const list = document.getElementById('idea-list');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('idea-count');

  function notify() { onChange?.(); }

  function render() {
    const ideas = loadIdeas();
    count.textContent = String(ideas.length);
    empty.hidden = ideas.length > 0;

    // Newest first so the latest capture is always in the thumb's eye-line.
    list.innerHTML = ideas
      .slice()
      .reverse()
      .map(
        (idea) => `
        <li class="idea-item" data-id="${idea.id}">
          <span class="idea-text">${escapeHtml(idea.text)}</span>
          <span class="idea-meta">
            <span class="idea-time">${formatTime(idea.ts)}</span>
            <button class="idea-delete" type="button" aria-label="Delete idea">Delete</button>
          </span>
        </li>`
      )
      .join('');
  }

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, window.innerHeight * 0.4) + 'px';
  }

  function commit() {
    const idea = addIdea(input.value);
    if (!idea) {
      input.focus();
      return;
    }
    input.value = '';
    clearDraft();
    autoGrow();
    render();
    notify();
    // Confirm the capture without requiring eyes on screen.
    navigator.vibrate?.(40);
    // Keep the keyboard up for rapid-fire capture.
    input.focus();
  }

  // --- events ---
  addBtn.addEventListener('click', commit);

  input.addEventListener('input', () => {
    autoGrow();
    saveDraft(input.value);
  });

  // Enter commits; Shift+Enter inserts a newline.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  });

  // Delegate delete taps: delete immediately, offer Undo — no confirm dialog.
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.idea-delete');
    if (!btn) return;
    const li = btn.closest('.idea-item');
    const id = li?.dataset.id;
    if (!id) return;

    const removed = deleteIdea(id);
    render();
    notify();
    if (removed) {
      toast('Deleted', 'info', {
        actionLabel: 'Undo',
        onAction: () => {
          restoreIdea(removed.idea, removed.index);
          render();
          notify();
        },
      });
    }
  });

  // Restore any half-typed idea from a previous visit.
  const draft = loadDraft();
  if (draft) {
    input.value = draft;
    autoGrow();
  }

  render();
  return { render };
}
