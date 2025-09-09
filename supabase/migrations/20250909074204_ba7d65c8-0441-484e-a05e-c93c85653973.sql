-- Create storage bucket for NGO logos
INSERT INTO storage.buckets (id, name, public) VALUES ('ngo-logos', 'ngo-logos', true);

-- Create RLS policies for NGO logo uploads
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'ngo-logos');

CREATE POLICY "NGOs can upload their own logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ngo-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "NGOs can update their own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ngo-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "NGOs can delete their own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ngo-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);