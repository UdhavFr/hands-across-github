/*
  # Create Events and Registrations Schema

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `date` (timestamptz)
      - `location` (text)
      - `ngo_id` (uuid, foreign key)
      - `image_url` (text)
      - `slots_available` (integer)
      - `created_at` (timestamptz)
    
    - `event_registrations`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for reading and creating registrations
*/

DO $$ BEGIN
  -- Create events table if it doesn't exist
  CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    date timestamptz NOT NULL,
    location text NOT NULL,
    ngo_id uuid NOT NULL REFERENCES auth.users(id),
    image_url text,
    slots_available integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
  );

  -- Create event registrations table if it doesn't exist
  CREATE TABLE IF NOT EXISTS event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, user_id)
  );

  -- Enable RLS
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
  DROP POLICY IF EXISTS "NGOs can create events" ON events;
  DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
  DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;

  -- Create new policies
  CREATE POLICY "Events are viewable by everyone"
    ON events
    FOR SELECT
    TO public
    USING (true);

  CREATE POLICY "NGOs can create events"
    ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = ngo_id);

  CREATE POLICY "Users can view their own registrations"
    ON event_registrations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can register for events"
    ON event_registrations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
END $$;