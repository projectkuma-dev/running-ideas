/**
 * Local mock of the Supabase Edge Function for development/testing.
 *
 * Mirrors the real contract in supabase/functions/send-email/index.ts:
 *   - CORS preflight (OPTIONS)
 *   - POST { recipient, ideas } -> { ok, sent }
 *   - validation errors -> 4xx; force a 502 with recipient "fail"
 *
 * It does NOT send real email — it logs the composed message so you can verify
 * the payload shape end-to-end. Run:  node scripts/mock-server.mjs [port]
 */
import { createServer } from 'node:http';
import { buildEmail } from '../supabase/functions/send-email/email.ts';

const PORT = Number(process.argv[2]) || 4180;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const send = (res, status, body) =>
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' }).end(JSON.stringify(body));

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return send(res, 400, { error: 'Invalid JSON body' });
    }

    const { recipient, ideas } = payload;
    if (!recipient || !Array.isArray(ideas) || ideas.length === 0) {
      return send(res, 400, { error: 'recipient and a non-empty ideas array are required' });
    }
    if (recipient === 'fail') return send(res, 502, { error: 'Failed to send email' });

    const email = buildEmail(ideas);
    console.log(`\n[mock] → ${recipient} (${ideas.length} ideas)`);
    console.log(`[mock] subject: ${email.subject}`);
    console.log(`[mock] text:\n${email.text}\n`);

    return send(res, 200, { ok: true, sent: ideas.length });
  });
});

server.listen(PORT, () => console.log(`[mock] send-email listening on http://localhost:${PORT}`));
