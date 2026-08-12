-- ============================================================================
-- HARDEN STORAGE ACCESS (C-02)
-- ============================================================================
-- claim-attachments holds worker expense-claim evidence (receipts, invoices,
-- photographs of documents) and site-photos holds field evidence. Both were
-- created public; a later migration set public=false but the SELECT policies it
-- created still let ANY authenticated user of the whole project read every
-- object, and it did not touch the avatar flow that relied on a public bucket.
--
-- This migration:
--   1. Keeps both buckets private.
--   2. claim-attachments: objects are stored at <org_id>/<user_id>/<file>.
--      Only members of the owning organization may read; only the owner may
--      update/delete; uploads must target the caller's own folder.
--   3. site-photos: field photos are stored at <user_id>/<file>; avatars at
--      avatars/<user_id>. Members of the uploader's organization may read
--      field photos; avatar owners and their org members may read avatars;
--      only the owner may write to their folders.
--   4. Creates a dedicated public `avatars` bucket so profile photos keep
--      working via getPublicUrl while site evidence stays private.
-- ============================================================================

UPDATE storage.buckets SET public = false WHERE id IN ('site-photos', 'claim-attachments');

-- ---------------------------------------------------------------------------
-- claim-attachments (private, org-scoped)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can view claim attachments" ON storage.objects;

CREATE POLICY "Org members can view claim attachments" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'claim-attachments'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND is_member_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can upload claim attachments" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'claim-attachments'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND is_member_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can update their own claim attachments" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'claim-attachments'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own claim attachments" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'claim-attachments'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- ---------------------------------------------------------------------------
-- site-photos (private; field photos + avatars)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own site photos" ON storage.objects;

CREATE POLICY "Org members can view site photos" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'site-photos'
    AND (
      -- Field photos: <user_id>/<file> — visible to members of the uploader's org.
      ( (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = (storage.foldername(name))[1]::uuid
            AND is_member_of_org(auth.uid(), p.organization_id)
        ) )
      OR
      -- Avatars: avatars/<user_id> — visible to the owner and their org members.
      ( (storage.foldername(name))[1] = 'avatars'
        AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = (storage.foldername(name))[2]::uuid
            AND (p.user_id = auth.uid() OR is_member_of_org(auth.uid(), p.organization_id))
        ) )
    )
  );

CREATE POLICY "Users can upload site photos" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'site-photos'
    AND (
      -- Field photos go into the caller's own folder.
      ( (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND auth.uid()::text = (storage.foldername(name))[1] )
      OR
      -- Avatars go into avatars/<caller>.
      ( (storage.foldername(name))[1] = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[2] )
    )
  );

CREATE POLICY "Users can update their own site photos" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'site-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR ( (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2] )
    )
  );

CREATE POLICY "Users can delete their own site photos" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'site-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR ( (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2] )
    )
  );

-- ---------------------------------------------------------------------------
-- avatars bucket (public on purpose: profile photos are displayed app-wide)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
