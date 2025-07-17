/*
  # Insert Sample Data

  1. Sample Data Order
    - Auth Users (base authentication)
    - Public Users (user profiles)
    - NGO Profiles
    - Events
    - Event Registrations

  2. Data Structure
    - Uses properly formatted UUIDs
    - Maintains referential integrity
    - Includes realistic sample data
*/

-- First, insert auth users
DO $$
BEGIN
  INSERT INTO auth.users (id, email)
  VALUES 
    ('d0d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1a', 'volunteer1@example.com'),
    ('d1d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1b', 'volunteer2@example.com'),
    ('d2d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1c', 'ngo1@example.com'),
    ('d3d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1d', 'ngo2@example.com')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Then insert public user profiles
INSERT INTO public.users (id, full_name, user_type)
VALUES
  ('d0d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1a', 'John Volunteer', 'volunteer'),
  ('d1d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1b', 'Sarah Helper', 'volunteer'),
  ('d2d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1c', 'Green Earth NGO', 'ngo'),
  ('d3d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1d', 'Education First', 'ngo')
ON CONFLICT (id) DO NOTHING;

-- Insert NGO profiles
INSERT INTO public.ngo_profiles (id, user_id, name, description, website, cause_areas)
VALUES
  (
    'd2d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1c',
    'd2d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1c',
    'Green Earth NGO',
    'Dedicated to environmental conservation and sustainability',
    'https://greenearth.example.com',
    ARRAY['Environment', 'Conservation', 'Climate Change']
  ),
  (
    'd3d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1d',
    'd3d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1d',
    'Education First',
    'Providing quality education to underprivileged children',
    'https://educationfirst.example.com',
    ARRAY['Education', 'Child Welfare', 'Skill Development']
  )
ON CONFLICT (id) DO NOTHING;

-- Insert events (now referencing existing NGO profiles)
INSERT INTO public.events (id, ngo_id, title, description, date, location, image_url, slots_available)
VALUES
  (
    'f0f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1a',
    'd2d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1c',
    'Beach Cleanup Drive',
    'Join us for a day of cleaning our local beaches and protecting marine life',
    (CURRENT_DATE + INTERVAL '7 days')::timestamptz,
    'Sunset Beach',
    'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&q=80',
    50
  ),
  (
    'f1f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1b',
    'd2d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1c',
    'Tree Planting Initiative',
    'Help us green our city by planting trees in urban areas',
    (CURRENT_DATE + INTERVAL '14 days')::timestamptz,
    'City Park',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80',
    100
  ),
  (
    'f2f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1c',
    'd3d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1d',
    'Weekend Teaching Program',
    'Teach basic subjects to underprivileged children',
    (CURRENT_DATE + INTERVAL '10 days')::timestamptz,
    'Community Center',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80',
    20
  ),
  (
    'f3f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1d',
    'd3d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1d',
    'Computer Literacy Workshop',
    'Teach basic computer skills to adults and seniors',
    (CURRENT_DATE + INTERVAL '21 days')::timestamptz,
    'Public Library',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80',
    30
  )
ON CONFLICT (id) DO NOTHING;

-- Insert event registrations
DO $$
BEGIN
  INSERT INTO public.event_registrations (event_id, user_id, status)
  VALUES
    (
      'f0f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1a',
      'd0d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1a',
      'confirmed'
    ),
    (
      'f1f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1b',
      'd0d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1a',
      'pending'
    ),
    (
      'f2f7f0b1-c9c4-4f85-8143-3f8b9d0d0b1c',
      'd1d7d0b1-c9c4-4f85-8143-3f8b9d0d0b1b',
      'confirmed'
    );
END $$;