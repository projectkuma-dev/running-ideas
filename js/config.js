/**
 * App configuration.
 *
 * NOTE ON SECURITY: No private email addresses or Gmail credentials live here.
 * The frontend only knows recipient *keys* ("work" / "personal"). The Supabase
 * Edge Function maps those keys to real addresses stored as server-side secrets.
 *
 * The Supabase anon key below is *public by design* — it only authorizes calling
 * the function, not reading data.
 */

// When served from localhost, talk to the local mock backend
// (scripts/mock-server.mjs) instead of the deployed Edge Function.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

export const CONFIG = {
  // Deployed Edge Function URL (mock server during local development).
  edgeFunctionUrl: IS_LOCAL
    ? 'http://localhost:4180/'
    : 'https://kkqtywoxtebfrnsfbjgq.supabase.co/functions/v1/send-email',

  // Supabase anon/public key (safe to expose).
  supabaseAnonKey: IS_LOCAL
    ? 'test-anon-key'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcXR5d294dGViZnJuc2ZiamdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzgwMzcsImV4cCI6MjA5NzYxNDAzN30.pN3qjQsVaHgi3d6TPlwCFJ3qQlk6glYz4YxmujE-b9I',

  // Recipient options for routing. Keys must match the Edge Function.
  recipients: [
    { key: 'work', label: 'Work' },
    { key: 'personal', label: 'Personal' },
  ],
};
