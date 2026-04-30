ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_system_prompt TEXT DEFAULT 'You are a helpful AI assistant.';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personalization JSONB DEFAULT '{}'::jsonb;
