-- Fix events RLS to allow NGOs (by user) to create events for their NGO profile

-- Drop overly strict policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'events' 
      AND policyname = 'NGOs can create events'
  ) THEN
    EXECUTE 'DROP POLICY "NGOs can create events" ON public.events';
  END IF;
END $$;

-- Create correct INSERT policy that checks ngo_profiles link to auth user
CREATE POLICY "NGOs can create events (by ngo_profile)"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.ngo_profiles p 
    WHERE p.id = events.ngo_id 
      AND p.user_id = auth.uid()
  )
);

-- Ensure UPDATEs are also checked against ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'events' 
      AND policyname = 'NGOs can update own events'
  ) THEN
    CREATE POLICY "NGOs can update own events"
    ON public.events
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.ngo_profiles p 
        WHERE p.id = events.ngo_id 
          AND p.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.ngo_profiles p 
        WHERE p.id = events.ngo_id 
          AND p.user_id = auth.uid()
      )
    );
  END IF;
END $$;


