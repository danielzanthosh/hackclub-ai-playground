-- Function to handle new user creation/sync from auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (sub, name, updated_at)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Hack Clubber'), (extract(epoch FROM now()) * 1000)::bigint)
  ON CONFLICT (sub) DO UPDATE
  SET 
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (requires superuser or bypass, usually handled by Supabase)
-- Note: We can only create this if we have permission. In Supabase, we usually do.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
