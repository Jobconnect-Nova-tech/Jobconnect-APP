
-- Profile professional fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cv_url text,
  ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Allow users to manage their own role rows
DROP POLICY IF EXISTS "users insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "users update own role" ON public.user_roles;
DROP POLICY IF EXISTS "users delete own role" ON public.user_roles;

CREATE POLICY "users insert own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own role" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own role" ON public.user_roles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars (public read, owner write)
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner update" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner delete" ON storage.objects;

CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for cvs (private, owner only)
DROP POLICY IF EXISTS "cvs owner read" ON storage.objects;
DROP POLICY IF EXISTS "cvs owner insert" ON storage.objects;
DROP POLICY IF EXISTS "cvs owner update" ON storage.objects;
DROP POLICY IF EXISTS "cvs owner delete" ON storage.objects;

CREATE POLICY "cvs owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "cvs owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "cvs owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "cvs owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
