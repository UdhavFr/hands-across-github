import { useState, useEffect } from 'react';
import { Edit3, X, Loader2, Building, Globe, MapPin, Tag, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NgoProfileForm } from './NgoProfileForm';
import type { NGOProfile } from '../types';
import toast from 'react-hot-toast';

interface ProfileTabProps {
  ngoId: string;
  onProfileUpdate?: (profile: NGOProfile) => void;
}

export default function ProfileTab({ ngoId, onProfileUpdate }: ProfileTabProps) {
  const [profile, setProfile] = useState<NGOProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [ngoId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ngo_profiles')
        .select('*')
        .eq('id', ngoId)
        .single();

      if (error) throw error;
      setProfile(data as NGOProfile);
    } catch (error) {
      console.error('Error fetching NGO profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: NGOProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
    onProfileUpdate?.(updatedProfile);
    toast.success('Profile updated successfully!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-12">
        <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Profile Not Found</h3>
        <p className="text-muted-foreground">Unable to load organization profile.</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Edit Organization Profile</h2>
          <button
            onClick={() => setIsEditing(false)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <NgoProfileForm
          mode="edit"
          existingProfile={profile}
          onSuccess={handleProfileUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Organization Profile</h2>
          <p className="text-muted-foreground">
            Manage your organization's information and settings
          </p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo and Basic Info */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            {/* Logo */}
            <div className="text-center">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={`${profile.name} logo`}
                  className="w-24 h-24 mx-auto rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="w-24 h-24 mx-auto rounded-lg bg-muted border border-border flex items-center justify-center">
                  <Building className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="text-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                (profile as any).status === 'approved' 
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : (profile as any).status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {(profile as any).status === 'approved' ? '✓ Verified' : 
                 (profile as any).status === 'pending' ? '⏳ Pending Review' : '❌ Rejected'}
              </span>
            </div>

            {/* Website Link */}
            {profile.website && (
              <div className="text-center">
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Details */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Organization Name
                </label>
                <p className="text-foreground font-medium">{profile.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <p className="text-foreground leading-relaxed">{profile.description}</p>
              </div>
            </div>
          </div>

          {/* Cause Areas */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Cause Areas
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {profile.cause_areas && profile.cause_areas.length > 0 ? (
                profile.cause_areas.map((cause, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                  >
                    {cause}
                  </span>
                ))
              ) : (
                <p className="text-muted-foreground">No cause areas specified</p>
              )}
            </div>
          </div>

          {/* Location & Service Area */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Service Area
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Address
                </label>
                <p className="text-foreground">
                  {(profile as any).address || 'Not specified'}
                </p>
                {(profile as any).city && (
                  <p className="text-muted-foreground text-sm">
                    {(profile as any).city}, {(profile as any).state}, {(profile as any).country}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Service Radius
                </label>
                <p className="text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {(profile as any).service_radius_km || 50} km
                </p>
              </div>
            </div>
          </div>

          {/* Profile Stats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Profile Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-muted-foreground mb-1">Created</label>
                <p className="text-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Last Updated</label>
                <p className="text-foreground">
                  {new Date((profile as any).updated_at || profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}