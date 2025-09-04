-- Add enhanced profile fields to users table
ALTER TABLE public.users 
ADD COLUMN bio TEXT,
ADD COLUMN skills TEXT[],
ADD COLUMN social_links JSONB DEFAULT '{}',
ADD COLUMN location TEXT,
ADD COLUMN website TEXT,
ADD COLUMN profile_completion_score INTEGER DEFAULT 0;

-- Update profile completion scores for existing users
UPDATE public.users 
SET profile_completion_score = (
  CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 20 ELSE 0 END +
  CASE WHEN username IS NOT NULL AND username != '' THEN 15 ELSE 0 END +
  CASE WHEN email IS NOT NULL AND email != '' THEN 15 ELSE 0 END +
  CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 20 ELSE 0 END +
  CASE WHEN bio IS NOT NULL AND bio != '' THEN 15 ELSE 0 END +
  CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 10 ELSE 0 END +
  CASE WHEN location IS NOT NULL AND location != '' THEN 5 ELSE 0 END
);

-- Function to calculate profile completion score
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(user_row public.users)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Full name (20 points)
  IF user_row.full_name IS NOT NULL AND user_row.full_name != '' THEN
    score := score + 20;
  END IF;
  
  -- Username (15 points)
  IF user_row.username IS NOT NULL AND user_row.username != '' THEN
    score := score + 15;
  END IF;
  
  -- Email (15 points)
  IF user_row.email IS NOT NULL AND user_row.email != '' THEN
    score := score + 15;
  END IF;
  
  -- Avatar (20 points)
  IF user_row.avatar_url IS NOT NULL AND user_row.avatar_url != '' THEN
    score := score + 20;
  END IF;
  
  -- Bio (15 points)
  IF user_row.bio IS NOT NULL AND user_row.bio != '' THEN
    score := score + 15;
  END IF;
  
  -- Skills (10 points)
  IF user_row.skills IS NOT NULL AND array_length(user_row.skills, 1) > 0 THEN
    score := score + 10;
  END IF;
  
  -- Location (5 points)
  IF user_row.location IS NOT NULL AND user_row.location != '' THEN
    score := score + 5;
  END IF;
  
  RETURN score;
END;
$$;

-- Trigger to automatically update profile completion score
CREATE OR REPLACE FUNCTION public.update_profile_completion_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.profile_completion_score := public.calculate_profile_completion(NEW);
  RETURN NEW;
END;
$$;

-- Create trigger for profile completion updates
DROP TRIGGER IF EXISTS trigger_update_profile_completion ON public.users;
CREATE TRIGGER trigger_update_profile_completion
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_completion_score();