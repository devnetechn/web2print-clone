-- Admin-editable settings that were previously environment variables.
--
-- Motivation: the card 4over charges on an automatic push lived in
-- FOUROVER_DEFAULT_PAYMENT_PROFILE, so changing it meant editing Vercel and
-- redeploying. The owner needs to pick that card himself, so it moves here.
--
-- Key/value rather than a column per setting: the admin Settings page has five
-- more tabs that are still mock-ups, and each will need somewhere to persist.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. This table holds a payment profile token, which is
-- the credential 4over charges against - it must never be readable by the anon
-- or authenticated client. Every read and write goes through the service-role
-- client in app/actions/settings.ts, behind requireAdmin(). With RLS enabled
-- and no policy, any direct query from a browser client returns nothing.
