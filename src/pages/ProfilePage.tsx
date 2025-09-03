import { useEffect, useState } from 'react';
import { User, Mail, Calendar, Type, Loader2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { Avatar } from '../components/Avatar';
import type { AppUser } from '../types';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        toast.error('Please log in to view your profile');
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      setUser(userData as AppUser);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Profile Not Found</h2>
          <p className="text-muted-foreground">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar 
                  src={user.avatar_url} 
                  alt={user.full_name} 
                  size="lg" 
                />
                <div>
                <h1 className="text-2xl font-semibold text-foreground">{user.full_name}</h1>
                <p className="text-muted-foreground capitalize">{user.user_type}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="text-foreground">{user.full_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Type className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="text-foreground">@{user.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">Account Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Type className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <p className="text-foreground capitalize">{user.user_type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                   <p className="text-foreground">
                     {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                       year: 'numeric',
                       month: 'long',
                       day: 'numeric'
                     }) : 'Unknown'}
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats (placeholder for future enhancement) */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mt-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Activity Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg border border-border">
              <p className="text-2xl font-semibold text-primary">0</p>
              <p className="text-sm text-muted-foreground">
                {user.user_type === 'ngo' ? 'Events Created' : 'Events Attended'}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border border-border">
              <p className="text-2xl font-semibold text-primary">0</p>
              <p className="text-sm text-muted-foreground">
                {user.user_type === 'ngo' ? 'Total Volunteers' : 'Hours Volunteered'}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border border-border">
              <p className="text-2xl font-semibold text-primary">0</p>
              <p className="text-sm text-muted-foreground">
                {user.user_type === 'ngo' ? 'Certificates Issued' : 'Registrations'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Edit Modal */}
        {user && (
          <ProfileEditModal
            user={user}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onUserUpdate={setUser}
          />
        )}
      </div>
    </div>
  );
}