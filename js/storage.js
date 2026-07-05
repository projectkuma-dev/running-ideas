/**
 * Session storage for captured ideas.
 *
 * Persists to localStorage so ideas survive screen-lock, app backgrounding, or an
 * accidental reload mid-run. A "session" is the current uncommitted batch of ideas;
 * ideas are removed as they are sent (or trashed at send time).
 *
 * This module is the single source of truth for idea data. Future versions can swap
 * the backing store (e.g. a Supabase table for history) without touching the UI.
 *
 * Idea shape: {
 *   id: string,
 *   text: string,
 *   ts: number,                              // epoch ms
 *   route?: 'work' | 'personal' | 'trash',   // triage assignment (default applied at read)
 * }
 */
const SESSION_KEY = 'running-ideas:session:v1';
const DRAFT_KEY = 'running-ideas:draft:v1';
const DEFAULT_ROUTE_KEY = 'running-ideas:default-route:v1';

/** @returns {Array<{id:string,text:string,ts:number,route?:string}>} */
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

/** Remove one idea by id. Returns the removed idea and its index (for undo). */
export function deleteIdea(id) {
  const ideas = loadIdeas();
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) return null;
  const [removed] = ideas.splice(index, 1);
  persist(ideas);
  return { idea: removed, index };
}

/** Re-insert a previously deleted idea at its original position (undo). */
export function restoreIdea(idea, index) {
  const ideas = loadIdeas();
  const at = Math.min(Math.max(index, 0), ideas.length);
  ideas.splice(at, 0, idea);
  persist(ideas);
}

/** Patch one idea (e.g. { text } or { route }). Returns the updated idea or null. */
export function updateIdea(id, patch) {
  const ideas = loadIdeas();
  const idea = ideas.find((i) => i.id === id);
  if (!idea) return null;
  Object.assign(idea, patch);
  persist(ideas);
  return idea;
}

/** Set the route on every idea in the session (bulk triage). */
export function setAllRoutes(route) {
  const ideas = loadIdeas();
  for (const idea of ideas) idea.route = route;
  persist(ideas);
  setDefaultRoute(route);
}

/** Remove a set of ideas by id (e.g. a group that was just sent, or trash). */
export function removeIdeas(ids) {
  const set = new Set(ids);
  persist(loadIdeas().filter((i) => !set.has(i.id)));
}

/** Wipe the current session. */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

/* ---------- Default route (where unrouted ideas go) ---------- */

export function getDefaultRoute() {
  try {
    return localStorage.getItem(DEFAULT_ROUTE_KEY) || 'work';
  } catch {
    return 'work';
  }
}

export function setDefaultRoute(route) {
  if (route !== 'work' && route !== 'personal') return;
  try {
    localStorage.setItem(DEFAULT_ROUTE_KEY, route);
  } catch { /* non-fatal */ }
}

/* ---------- Draft autosave (half-typed idea survives lock/reload) ---------- */

export function saveDraft(text) {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* non-fatal */ }
}

export function loadDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
}

export function clearDraft() {
  saveDraft('');
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
