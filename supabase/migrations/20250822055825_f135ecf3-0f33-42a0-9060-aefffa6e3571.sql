-- Fix security issue by setting search_path for the distance calculation function
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL, 
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;