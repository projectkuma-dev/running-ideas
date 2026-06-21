/**
 * Pure email-composition logic — no Deno, npm, or network dependencies.
 *
 * Kept separate from index.ts so it can be unit-tested in plain Node
 * (`node --test`) and reused if email generation moves elsewhere later.
 */

export interface Idea {
  text: string;
  ts: number;
}

export interface ComposedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * Compile a session's ideas into a clean plain-text + HTML email.
 * Ideas are presented in capture order. The date is taken from the first idea.
 */
export function buildEmail(ideas: Idea[]): ComposedEmail {
  if (!Array.isArray(ideas) || ideas.length === 0) {
    throw new Error('Cannot build an email with no ideas');
  }

  const dateStr = formatDate(ideas[0].ts);
  const count = ideas.length;
  const plural = count === 1 ? '' : 's';

  const subject = `Running Ideas — ${dateStr} (${count})`;

  const text = [
    `Running Ideas — ${dateStr}`,
    `${count} idea${plural} captured`,
    '',
    ...ideas.map((i, n) => `${n + 1}. [${formatTime(i.ts)}] ${i.text}`),
  ].join('\n');

  const rows = ideas
    .map(
      (i, n) => `
      <tr>
        <td style="padding:8px 12px;color:#8a93a3;font-size:13px;vertical-align:top;white-space:nowrap;">
          ${n + 1}. ${formatTime(i.ts)}
        </td>
        <td style="padding:8px 12px;font-size:15px;line-height:1.45;">${escapeHtml(i.text)}</td>
      </tr>`
    )
    .join('');

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;color:#0c1320;">
    <h2 style="margin:0 0 4px;">Running Ideas</h2>
    <p style="margin:0 0 16px;color:#5a6677;">${dateStr} &middot; ${count} idea${plural}</p>
    <table style="border-collapse:collapse;width:100%;border-top:1px solid #e2e7ef;">
      ${rows}
    </table>
  </div>`;

  return { subject, text, html };
}
