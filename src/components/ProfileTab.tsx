import { useState, useEffect } from 'react';
import { Edit3, X, Building, Globe, MapPin, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NgoProfileForm } from './NgoProfileForm';
import type { NGOProfile } from '../types';
import toast from 'react-hot-toast';

interface ProfileTabProps {
  ngoId: string | null;
  onProfileUpdate: () => void;
}

export function ProfileTab({ ngoId, onProfileUpdate }: ProfileTabProps) {
  const [profile, setProfile] = useState<NGOProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [ngoId]);

  const fetchProfile = async () => {
    if (!ngoId) return;
    
    try {
      const { data, error } = await supabase
        .from('ngo_profiles')
        .select('*')
        .eq('id', ngoId)
        .single();

      if (error) throw error;
      setProfile(data as NGOProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = (updatedProfile: NGOProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
    onProfileUpdate();
    toast.success('Profile updated successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Organization Profile</h2>
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
        
        <NgoProfileForm
          mode="edit"
          existingProfile={profile}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Organization Profile</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      {/* Profile Display */}
      <div className="bg-card rounded-lg border p-6 space-y-8">
        {/* Basic Info Section */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organization Name</label>
                  <p className="text-lg font-medium">{profile.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground">{profile.description}</p>
                </div>
                
                {profile.website && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Website</label>
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Organization Logo</h3>
            {profile.logo_url ? (
              <div className="w-48 h-48 mx-auto">
                <img
                  src={profile.logo_url}
                  alt={`${profile.name} logo`}
                  className="w-full h-full object-contain border rounded-lg bg-muted"
                />
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted">
                <Building className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Location & Service Area */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location & Service Area
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-foreground">
                {[profile.address, profile.city, profile.state, profile.country]
                  .filter(Boolean)
                  .join(', ') || 'Not specified'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Service Radius</label>
              <p className="text-foreground">
                {profile.service_radius_km} km from base location
              </p>
            </div>
          </div>
        </div>

        {/* Cause Areas */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Cause Areas
          </h3>
          
          {profile.cause_areas && profile.cause_areas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.cause_areas.map((area, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                >
                  {area}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No cause areas specified</p>
          )}
        </div>

        {/* Status */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Status</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              profile.status === 'approved'
                ? 'bg-success/10 text-success border border-success/20'
                : profile.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}
          >
            {profile.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}