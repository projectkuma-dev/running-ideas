/**
 * Supabase Edge Function: send-email
 *
 * Receives a batch of captured ideas + a recipient key from the PWA, compiles a
 * clean email, and sends it via Gmail using Nodemailer.
 *
 * All secrets live server-side (set with `supabase secrets set`):
 *   GMAIL_USER            - the Gmail address that sends the mail
 *   GMAIL_APP_PASSWORD    - a Gmail App Password (NOT your account password)
 *   RECIPIENT_WORK        - destination address for the "work" key
 *   RECIPIENT_PERSONAL    - destination address for the "personal" key
 *
 * The frontend never sees any address or credential — it only sends a key.
 *
 * Deploy:  supabase functions deploy send-email
 */
import nodemailer from 'npm:nodemailer@6.9.13';
import { buildEmail, type Idea } from './email.ts';

// Restrict to your GitHub Pages origin in production for tighter CORS.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Map a recipient key to a real address held in secrets. */
function resolveRecipient(key: string): string | null {
  const map: Record<string, string | undefined> = {
    work: Deno.env.get('RECIPIENT_WORK'),
    personal: Deno.env.get('RECIPIENT_PERSONAL'),
  };
  return map[key] ?? null;
}

/**
 * Archive sent ideas to the ideas_history table via PostgREST using the
 * service role (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected
 * into Edge Functions). RLS denies the anon key, so history stays private.
 *
 * Best-effort: the email already went out, so a failed insert is logged,
 * not surfaced as an error to the client.
 */
async function archiveIdeas(recipient: string, ideas: Idea[]): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    console.error('archive skipped: missing SUPABASE_URL / service role key');
    return false;
  }

  const batchId = crypto.randomUUID();
  const rows = ideas.map((i) => ({
    batch_id: batchId,
    recipient,
    text: i.text,
    captured_at: new Date(i.ts).toISOString(),
  }));

  try {
    const res = await fetch(`${url}/rest/v1/ideas_history`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      console.error('archive insert failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('archive insert threw:', err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { recipient?: string; ideas?: Idea[] };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { recipient, ideas } = payload;

  if (!recipient || !Array.isArray(ideas) || ideas.length === 0) {
    return json({ error: 'recipient and a non-empty ideas array are required' }, 400);
  }

  const to = resolveRecipient(recipient);
  if (!to) return json({ error: `Unknown recipient: ${recipient}` }, 400);

  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!gmailUser || !gmailPass) {
    return json({ error: 'Email service not configured' }, 500);
  }

  const { text, html, subject } = buildEmail(ideas);

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `Running Ideas <${gmailUser}>`,
      to,
      subject,
      text,
      html,
    });

    const archived = await archiveIdeas(recipient, ideas);
    return json({ ok: true, sent: ideas.length, archived });
  } catch (err) {
    console.error('sendMail failed:', err);
    return json({ error: 'Failed to send email' }, 502);
  }
});
