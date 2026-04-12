-- Create storage bucket for claim attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-attachments', 'claim-attachments', true);

-- Allow public reads for claim attachments and allow authenticated uploads
CREATE POLICY "Anyone can view claim attachments" ON storage.objects FOR SELECT USING (bucket_id = 'claim-attachments');
CREATE POLICY "Authenticated users can upload claim attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'claim-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own claim attachments" ON storage.objects FOR DELETE USING (bucket_id = 'claim-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to hold web push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org ON public.push_subscriptions (organization_id);
