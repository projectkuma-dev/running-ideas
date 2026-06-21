/**
 * App configuration.
 *
 * NOTE ON SECURITY: No private email addresses or Gmail credentials live here.
 * The frontend only knows recipient *keys* ("work" / "personal"). The Supabase
 * Edge Function maps those keys to real addresses stored as server-side secrets.
 *
 * The Supabase anon key below is *public by design* — it only authorizes calling
 * the function, not reading data. Replace the two placeholders after you deploy.
 */
export const CONFIG = {
  // Deployed Edge Function URL, e.g. https://abcd1234.supabase.co/functions/v1/send-email
  edgeFunctionUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email',

  // Supabase anon/public key (safe to expose).
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',

  // Recipient options shown in the dropdown. Keys must match the Edge Function.
  recipients: [
    { key: 'work', label: 'Work' },
    { key: 'personal', label: 'Personal' },
  ],
};
