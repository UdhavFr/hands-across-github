/**
 * RLS (Row Level Security) Fixes Utility
 * 
 * Provides SQL scripts and utilities to fix common RLS policy violations
 * in the NGO volunteer management platform.
 */

export interface RLSPolicyFix {
  table: string;
  description: string;
  sql: string;
}

/**
 * Common RLS policy fixes for the application
 */
export const RLS_FIXES: RLSPolicyFix[] = [
  {
    table: 'events',
    description: 'Allow NGOs to manage their own events',
    sql: `
-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow NGOs to manage their own events
CREATE POLICY "events_ngo_policy" ON events
  FOR ALL USING (
    ngo_id IN (
      SELECT id FROM ngo_profiles WHERE user_id = auth.uid()
    )
  );

-- Allow public read access to published events
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (true);
`
  },
  {
    table: 'ngo_profiles',
    description: 'Allow users to manage their own NGO profile',
    sql: `
-- Enable RLS on ngo_profiles table
ALTER TABLE ngo_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own NGO profile
CREATE POLICY "ngo_profiles_user_policy" ON ngo_profiles
  FOR ALL USING (user_id = auth.uid());

-- Allow public read access to NGO profiles
CREATE POLICY "ngo_profiles_public_read" ON ngo_profiles
  FOR SELECT USING (true);
`
  },
  {
    table: 'event_registrations',
    description: 'Allow users to manage their own registrations and NGOs to see registrations for their events',
    sql: `
-- Enable RLS on event_registrations table
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own registrations
CREATE POLICY "registrations_user_policy" ON event_registrations
  FOR ALL USING (user_id = auth.uid());

-- Allow NGOs to see registrations for their events
CREATE POLICY "registrations_ngo_policy" ON event_registrations
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN ngo_profiles np ON e.ngo_id = np.id
      WHERE np.user_id = auth.uid()
    )
  );

-- Allow NGOs to update registration status for their events
CREATE POLICY "registrations_ngo_update" ON event_registrations
  FOR UPDATE USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN ngo_profiles np ON e.ngo_id = np.id
      WHERE np.user_id = auth.uid()
    )
  );
`
  },
  {
    table: 'ngo_enrollments',
    description: 'Allow NGOs to manage enrollments and users to see their own enrollments',
    sql: `
-- Enable RLS on ngo_enrollments table
ALTER TABLE ngo_enrollments ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own enrollments
CREATE POLICY "enrollments_user_policy" ON ngo_enrollments
  FOR SELECT USING (user_id = auth.uid());

-- Allow NGOs to manage enrollments for their organization
CREATE POLICY "enrollments_ngo_policy" ON ngo_enrollments
  FOR ALL USING (
    ngo_id IN (
      SELECT id FROM ngo_profiles WHERE user_id = auth.uid()
    )
  );
`
  },
  {
    table: 'certificates',
    description: 'Allow users to see their own certificates and NGOs to manage certificates for their events',
    sql: `
-- Enable RLS on certificates table (if it exists)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own certificates
CREATE POLICY "certificates_user_policy" ON certificates
  FOR SELECT USING (user_id = auth.uid());

-- Allow NGOs to manage certificates for their events
CREATE POLICY "certificates_ngo_policy" ON certificates
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN ngo_profiles np ON e.ngo_id = np.id
      WHERE np.user_id = auth.uid()
    )
  );
`
  },
  {
    table: 'user_preferences',
    description: 'Allow users to manage their own preferences',
    sql: `
-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own preferences
CREATE POLICY "user_preferences_policy" ON user_preferences
  FOR ALL USING (user_id = auth.uid());
`
  },
  {
    table: 'certificate_templates',
    description: 'Allow NGOs to manage their own certificate templates',
    sql: `
-- Create certificate_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_id UUID REFERENCES ngo_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_data JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on certificate_templates table
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- Allow NGOs to manage their own certificate templates
CREATE POLICY "certificate_templates_ngo_policy" ON certificate_templates
  FOR ALL USING (
    ngo_id IN (
      SELECT id FROM ngo_profiles WHERE user_id = auth.uid()
    )
  );
`
  }
];

/**
 * Storage bucket policies
 */
export const STORAGE_POLICIES = [
  {
    bucket: 'ngo-logos',
    description: 'Allow authenticated users to upload and manage NGO logos',
    sql: `
-- Allow authenticated users to upload logos
CREATE POLICY "ngo_logos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ngo-logos' AND
    auth.role() = 'authenticated'
  );

-- Allow users to update their own NGO logos
CREATE POLICY "ngo_logos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ngo-logos' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to NGO logos
CREATE POLICY "ngo_logos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ngo-logos');

-- Allow users to delete their own NGO logos
CREATE POLICY "ngo_logos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ngo-logos' AND
    auth.role() = 'authenticated'
  );
`
  },
  {
    bucket: 'event-images',
    description: 'Allow authenticated users to upload and manage event images',
    sql: `
-- Allow authenticated users to upload event images
CREATE POLICY "event_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-images' AND
    auth.role() = 'authenticated'
  );

-- Allow users to update event images for their NGO's events
CREATE POLICY "event_images_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'event-images' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to event images
CREATE POLICY "event_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

-- Allow users to delete event images for their NGO's events
CREATE POLICY "event_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-images' AND
    auth.role() = 'authenticated'
  );
`
  }
];

/**
 * Complete RLS setup script
 */
export const COMPLETE_RLS_SETUP = `
-- =====================================================
-- Complete RLS Setup for NGO Volunteer Management Platform
-- =====================================================

${RLS_FIXES.map(fix => `-- ${fix.description}\n${fix.sql}`).join('\n\n')}

-- =====================================================
-- Storage Bucket Policies
-- =====================================================

${STORAGE_POLICIES.map(policy => `-- ${policy.description}\n${policy.sql}`).join('\n\n')}

-- =====================================================
-- Additional Utility Functions
-- =====================================================

-- Function to check if user owns an NGO
CREATE OR REPLACE FUNCTION user_owns_ngo(ngo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ngo_profiles 
    WHERE id = ngo_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access event
CREATE OR REPLACE FUNCTION user_can_access_event(event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events e
    JOIN ngo_profiles np ON e.ngo_id = np.id
    WHERE e.id = event_id AND np.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Enable RLS on auth.users (if needed)
-- =====================================================

-- Note: This is usually handled by Supabase automatically
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Refresh schema cache
-- =====================================================

NOTIFY pgrst, 'reload schema';
`;

/**
 * Quick fixes for common RLS issues
 */
export const QUICK_FIXES = {
  // Disable RLS temporarily for testing (NOT for production)
  disableRLS: (tableName: string) => `
ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;
`,

  // Enable RLS with permissive policy for testing
  enablePermissiveRLS: (tableName: string) => `
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "${tableName}_permissive" ON ${tableName} FOR ALL USING (true);
`,

  // Check current RLS status
  checkRLSStatus: `
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
`,

  // List all policies
  listPolicies: `
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`
};

/**
 * Diagnostic queries to help identify RLS issues
 */
export const RLS_DIAGNOSTICS = {
  checkUserAuth: `
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.jwt() ->> 'email' as user_email;
`,

  checkNGOProfile: `
SELECT 
  id,
  user_id,
  name,
  created_at
FROM ngo_profiles 
WHERE user_id = auth.uid();
`,

  checkEventAccess: `
SELECT 
  e.id,
  e.title,
  e.ngo_id,
  np.user_id as ngo_owner_id,
  (np.user_id = auth.uid()) as user_owns_ngo
FROM events e
LEFT JOIN ngo_profiles np ON e.ngo_id = np.id
LIMIT 5;
`,

  checkTableRLS: (tableName: string) => `
SELECT 
  '${tableName}' as table_name,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = '${tableName}' AND schemaname = 'public') as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = '${tableName}') as policy_count;
`
};

export default {
  RLS_FIXES,
  STORAGE_POLICIES,
  COMPLETE_RLS_SETUP,
  QUICK_FIXES,
  RLS_DIAGNOSTICS
};