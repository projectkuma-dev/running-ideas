/**
 * Backend client. Thin wrapper around the Supabase Edge Function.
 *
 * Keeping all network calls here means future endpoints (Claude summarization,
 * Drive export, history sync) get added in one place, and the UI never touches
 * fetch() directly.
 */
import { CONFIG } from './config.js';

/**
 * Send the session's ideas to the chosen recipient via the Edge Function.
 *
 * @param {{ recipient: string, ideas: Array<{text:string, ts:number}> }} payload
 * @returns {Promise<object>} parsed JSON response from the function
 * @throws {Error} on network failure or non-2xx response
 */
export async function sendIdeas({ recipient, ideas }) {
  if (!CONFIG.edgeFunctionUrl || CONFIG.edgeFunctionUrl.includes('YOUR_PROJECT_REF')) {
    throw new Error('Backend not configured yet. Set edgeFunctionUrl in js/config.js.');
  }

  let res;
  try {
    res = await fetch(CONFIG.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
      },
      body: JSON.stringify({ recipient, ideas }),
    });
  } catch {
    throw new Error('No connection. Check signal and try again.');
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Send failed (${res.status}). ${detail}`.trim());
  }

  return res.json().catch(() => ({}));
}
