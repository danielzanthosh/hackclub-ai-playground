ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sub TEXT UNIQUE;
COMMENT ON COLUMN public.users.sub IS 'Hack Club Identity public_id (OIDC sub claim)';
