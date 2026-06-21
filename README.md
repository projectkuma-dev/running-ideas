# Running Ideas

A dead-simple PWA for capturing quick ideas one-handed while running, then emailing
the whole session to yourself (Work or Personal) afterward.

- **Frontend:** vanilla HTML/CSS/JS as an installable PWA, hosted on GitHub Pages.
- **Backend:** a Supabase Edge Function that sends email via Gmail + Nodemailer, with
  all credentials kept server-side.

## Project structure

```
running-ideas/
├── index.html              # App shell: capture screen + send screen
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline app-shell cache (capture works with no signal)
├── .nojekyll               # Tell GitHub Pages to serve files as-is
├── css/
│   └── styles.css          # Mobile-first, high-contrast, large tap targets
├── js/
│   ├── app.js              # Entry point: screen routing + SW registration
│   ├── capture.js          # Capture screen controller
│   ├── send.js             # Send screen controller
│   ├── storage.js          # Session persistence (localStorage) — data source of truth
│   ├── api.js              # Backend client (the one place that calls fetch)
│   ├── config.js           # Edge Function URL, anon key, recipient labels
│   └── ui.js               # Toast + formatting helpers
├── icons/                  # SVG + generated PNG app icons
├── scripts/
│   └── generate-icons.mjs  # Regenerate PNG icons (no dependencies)
└── supabase/
    ├── config.toml
    └── functions/send-email/index.ts   # Gmail + Nodemailer sender
```

The modules are intentionally decoupled so future features slot in cleanly:
new backend calls go in `api.js`, a different data store swaps behind `storage.js`,
and new screens follow the `capture.js` / `send.js` pattern.

## Run locally

PWAs need to be served over `http://` (not opened as a `file://`), or the service
worker and manifest won't load. From the project root:

```bash
npx serve .
# or:  python -m http.server 8000
```

Then open the printed URL. To test on your phone over the same Wi-Fi, use your
computer's LAN IP (the capture UI works fully without the backend configured).

### Testing the send flow without deploying

A zero-dependency mock of the Edge Function lets you exercise the full send flow
locally. It validates the request and logs the composed email instead of sending it:

```bash
node scripts/mock-server.mjs        # listens on http://localhost:4180
```

Then point `js/config.js` at it temporarily:

```js
edgeFunctionUrl: 'http://localhost:4180/',
supabaseAnonKey: 'test-anon-key',
```

Send a session from the UI and watch the composed subject/body print in the mock's
console. Use the `Personal`/`Work` recipients normally; sending to a recipient keyed
`fail` makes the mock return a 502 so you can verify error handling. Revert
`config.js` before deploying.

> Note: the service worker caches `js/config.js`. After editing config during local
> testing, do a hard reload (or unregister the SW in DevTools → Application) so the
> change is picked up.

### Tests

```bash
node --test supabase/functions/send-email/email.test.ts   # email composer unit tests
```

## Deploy the frontend (GitHub Pages)

1. Push this folder to a GitHub repo.
2. **Settings → Pages →** deploy from the `main` branch, root folder.
3. Your app will be at `https://<user>.github.io/<repo>/`.

Because all paths are relative and `start_url`/`scope` are `"."`, it works from a
subpath without changes.

## Deploy the backend (Supabase Edge Function)

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Store secrets (never committed, never sent to the browser):
supabase secrets set \
  GMAIL_USER="you@gmail.com" \
  GMAIL_APP_PASSWORD="your-16-char-app-password" \
  RECIPIENT_WORK="work-address@example.com" \
  RECIPIENT_PERSONAL="personal-address@example.com" \
  ALLOWED_ORIGIN="https://<user>.github.io"

supabase functions deploy send-email
```

### Gmail App Password

The Gmail account needs 2-Step Verification enabled, then create an **App Password**
at <https://myaccount.google.com/apppasswords>. Use that 16-character value for
`GMAIL_APP_PASSWORD` — not your normal Google password.

### Wire the frontend to the backend

Edit [`js/config.js`](js/config.js) and set:

- `edgeFunctionUrl` → `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email`
- `supabaseAnonKey` → your project's anon/public key (safe to expose)

## Regenerating icons

```bash
node scripts/generate-icons.mjs
```

## Security model

- The browser holds **no email addresses and no Gmail credentials** — only recipient
  keys (`work` / `personal`) and the public anon key.
- The Edge Function maps keys → addresses and authenticates to Gmail using secrets.
- `ALLOWED_ORIGIN` locks CORS to your Pages origin in production.

## Roadmap (kept modular for these)

- **Claude API** summarization/clustering of captured ideas → add a call in `api.js`.
- **Google Drive** export of sessions.
- **Supabase database** for idea history → swap the backing store behind `storage.js`.
```
