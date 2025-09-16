-- Create event-images storage bucket for event images
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);

-- Create policies for event images
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "NGOs can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "NGOs can update their event images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "NGOs can delete their event images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);