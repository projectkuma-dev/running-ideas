/**
 * Session storage for captured ideas.
 *
 * Persists to localStorage so ideas survive screen-lock, app backgrounding, or an
 * accidental reload mid-run. A "session" is the current uncommitted batch of ideas;
 * it is cleared after a successful send (or manually).
 *
 * This module is the single source of truth for idea data. Future versions can swap
 * the backing store (e.g. a Supabase table for history) without touching the UI.
 *
 * Idea shape: { id: string, text: string, ts: number }  // ts = epoch ms
 */
const SESSION_KEY = 'running-ideas:session:v1';

/** @returns {Array<{id:string,text:string,ts:number}>} */
export function loadIdeas() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(ideas) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(ideas));
  } catch (err) {
    // Storage full or unavailable (e.g. private mode). Surface to caller.
    console.error('Failed to persist ideas:', err);
  }
  return ideas;
}

/** Append a new idea. Returns the created idea, or null if text was empty. */
export function addIdea(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const idea = { id: makeId(), text: trimmed, ts: Date.now() };
  const ideas = loadIdeas();
  ideas.push(idea);
  persist(ideas);
  return idea;
}

/** Remove one idea by id. Returns the updated list. */
export function deleteIdea(id) {
  const ideas = loadIdeas().filter((i) => i.id !== id);
  return persist(ideas);
}

/** Wipe the current session. */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
