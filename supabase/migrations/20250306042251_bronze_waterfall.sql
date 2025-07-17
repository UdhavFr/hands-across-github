/*
  # Initial Schema for JoinHands Platform

  1. New Tables
    - `users`
      - Extended user profile data
      - Links to auth.users
    - `ngo_profiles`
      - Detailed NGO information
      - Connected to users table
    - `events`
      - Volunteer events
      - Created by NGOs
    - `event_registrations`
      - Tracks volunteer event signups
    
  2. Security
    - Enable RLS on all tables
    - Policies for:
      - Users can read their own data
      - NGOs can manage their own events
      - Public can view events and NGO profiles
      - Volunteers can register for events
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text NOT NULL,
  avatar_url text,
  user_type text NOT NULL CHECK (user_type IN ('volunteer', 'ngo')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create NGO profiles table
CREATE TABLE IF NOT EXISTS ngo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  description text NOT NULL,
  logo_url text,
  website text,
  cause_areas text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid NOT NULL REFERENCES ngo_profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  date timestamptz NOT NULL,
  location text NOT NULL,
  image_url text,
  slots_available integer NOT NULL CHECK (slots_available >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id),
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- NGO profiles policies
CREATE POLICY "NGO profiles are publicly viewable"
  ON ngo_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "NGOs can manage own profile"
  ON ngo_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Events policies
CREATE POLICY "Events are publicly viewable"
  ON events
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "NGOs can manage own events"
  ON events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ngo_profiles
      WHERE id = events.ngo_id
      AND user_id = auth.uid()
    )
  );

-- Event registrations policies
CREATE POLICY "Users can view own registrations"
  ON event_registrations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can register for events"
  ON event_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
      AND slots_available > 0
    )
  );

-- Create function to update event slots
CREATE OR REPLACE FUNCTION update_event_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
    UPDATE events
    SET slots_available = slots_available - 1
    WHERE id = NEW.event_id
    AND slots_available > 0;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    UPDATE events
    SET slots_available = slots_available - 1
    WHERE id = NEW.event_id
    AND slots_available > 0;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    UPDATE events
    SET slots_available = slots_available + 1
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating event slots
CREATE TRIGGER update_event_slots_trigger
AFTER INSERT OR UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_event_slots();