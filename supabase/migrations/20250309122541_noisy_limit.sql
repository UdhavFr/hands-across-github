/*
  # Add NGO enrollments table and policies

  1. New Tables
    - `ngo_enrollments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `ngo_id` (uuid, references ngo_profiles)
      - `status` (text, enum: pending, approved, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `ngo_enrollments` table
    - Add policies for:
      - Users can create enrollments
      - Users can view their own enrollments
      - NGOs can view and manage enrollments for their organization
*/

-- Create the enrollments table
CREATE TABLE IF NOT EXISTS ngo_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  ngo_id uuid REFERENCES ngo_profiles(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_ngo UNIQUE (user_id, ngo_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE ngo_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for ngo_enrollments
CREATE POLICY "Users can create enrollments"
  ON ngo_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own enrollments"
  ON ngo_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "NGOs can manage enrollments for their organization"
  ON ngo_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ngo_profiles
      WHERE ngo_profiles.id = ngo_enrollments.ngo_id
      AND ngo_profiles.user_id = auth.uid()
    )
  );