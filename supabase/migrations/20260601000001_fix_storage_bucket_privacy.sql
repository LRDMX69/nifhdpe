
-- Fix storage bucket privacy issues
-- Make site-photos and claim-attachments buckets private instead of public
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('site-photos', 'claim-attachments');

-- Update storage policies for site-photos to require authentication
DROP POLICY IF EXISTS "Anyone can view site photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload site photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own site photos" ON storage.objects;

CREATE POLICY "Authenticated users can view site photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'site-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload site photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own site photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own site photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'site-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update storage policies for claim-attachments to require authentication and restrict access
DROP POLICY IF EXISTS "Anyone can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can view claim attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view claim attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'claim-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload claim attachments" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'claim-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own claim attachments" ON storage.objects FOR UPDATE
  USING (bucket_id = 'claim-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own claim attachments" ON storage.objects FOR DELETE
  USING (bucket_id = 'claim-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
