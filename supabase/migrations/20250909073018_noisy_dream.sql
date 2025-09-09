/*
  # Create Storage Buckets for NGO Assets

  1. Storage Buckets
    - `ngo-logos` - For NGO logo uploads
    - `event-images` - For event image uploads

  2. Security Policies
    - NGOs can upload/manage their own logos
    - NGOs can upload/manage their event images
    - Public read access for all uploaded assets
*/

-- Create ngo-logos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ngo-logos', 'ngo-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create event-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for ngo-logos bucket
CREATE POLICY "NGO logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ngo-logos');

CREATE POLICY "NGOs can upload their own logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'ngo-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "NGOs can update their own logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'ngo-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "NGOs can delete their own logo" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'ngo-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policies for event-images bucket
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "NGOs can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "NGOs can update event images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "NGOs can delete event images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);