-- Add location fields to NGO profiles table
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50;
ALTER TABLE public.ngo_profiles ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false;

-- Ensure events table has location fields (some may already exist)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create function to calculate distance between coordinates using Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL, 
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Handle NULL values
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Haversine formula to calculate distance in kilometers
  RETURN (
    6371 * acos(
      GREATEST(-1, LEAST(1,
        cos(radians(lat1)) * cos(radians(lat2)) * 
        cos(radians(lng2) - radians(lng1)) + 
        sin(radians(lat1)) * sin(radians(lat2))
      ))
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_ngo_profiles_location ON public.ngo_profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;