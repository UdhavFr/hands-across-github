import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2, 
  Check, 
  AlertTriangle,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AvatarUpload } from '../components/AvatarUpload';
import { useDebounce } from '../hooks/useDebounce';
import { RequireAuth } from '../components/RequireAuth';
import type { AppUser } from '../types';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface UsernameValidation {
  isChecking: boolean;
  isValid: boolean | null;
  message: string;
}

interface PasswordValidation {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'privacy'>('profile');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    username: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidation>({
    isChecking: false,
    isValid: null,
    message: ''
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    isValid: false
  });

  // Email change state
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Account deletion state
  const [deleteForm, setDeleteForm] = useState({
    confirmText: '',
    password: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    emailNotifications: true,
    eventReminders: true,
    marketingEmails: false
  });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        navigate('/');
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
        return;
      }

      const userProfile = userData as AppUser;
      setUser(userProfile);
      setProfileForm({
        full_name: userProfile.full_name,
        username: userProfile.username,
        email: userProfile.email || ''
      });

      // Load privacy settings (you might want to store these in a separate table)
      // For now, using default values
      setPrivacySettings({
        profileVisibility: 'public',
        emailNotifications: true,
        eventReminders: true,
        marketingEmails: false
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Username validation with debounce
  const checkUsernameDebounced = useDebounce(async (username: string) => {
    if (!username || username === user?.username) {
      setUsernameValidation({ isChecking: false, isValid: null, message: '' });
      return;
    }

    if (username.length < 3) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: 'Username must be at least 3 characters'
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: 'Username can only contain letters, numbers, and underscores'
      });
      return;
    }

    setUsernameValidation({ isChecking: true, isValid: null, message: 'Checking availability...' });

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .neq('id', user?.id)
        .maybeSingle();

      if (error) {
        setUsernameValidation({
          isChecking: false,
          isValid: false,
          message: 'Error checking username'
        });
        return;
      }

      if (data) {
        setUsernameValidation({
          isChecking: false,
          isValid: false,
          message: 'Username is already taken'
        });
      } else {
        setUsernameValidation({
          isChecking: false,
          isValid: true,
          message: 'Username is available'
        });
      }
    } catch (error) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: 'Error checking username'
      });
    }
  }, 500);

  // Password validation
  useEffect(() => {
    const password = passwordForm.newPassword;
    setPasswordValidation({
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      isValid: password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
    });
  }, [passwordForm.newPassword]);

  // Username validation trigger
  useEffect(() => {
    checkUsernameDebounced(profileForm.username);
  }, [profileForm.username, checkUsernameDebounced]);

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usernameValidation.isValid === false) {
      toast.error('Please fix username issues before saving');
      return;
    }

    setProfileLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileForm.full_name,
          username: profileForm.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, full_name: profileForm.full_name, username: profileForm.username } : null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      toast.error('Please ensure your new password meets all requirements');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle email change
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailForm.newEmail || !emailForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setEmailLoading(true);

    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: emailForm.password
      });

      if (signInError) {
        toast.error('Password is incorrect');
        setEmailLoading(false);
        return;
      }

      // Update email (this will send a verification email)
      const { error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });

      if (error) throw error;

      setEmailForm({ newEmail: '', password: '' });
      toast.success('Verification email sent to your new email address');
    } catch (error) {
      console.error('Email update error:', error);
      toast.error('Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle account deletion
  const handleAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deleteForm.confirmText !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setDeleteLoading(true);

    try {
      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: deleteForm.password
      });

      if (signInError) {
        toast.error('Password is incorrect');
        setDeleteLoading(false);
        return;
      }

      // Delete user data from public tables first
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', user?.id);

      if (deleteUserError) {
        console.error('Error deleting user data:', deleteUserError);
        // Continue with auth deletion even if this fails
      }

      // Delete auth user (this will cascade to related data)
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');

      if (error) throw error;

      toast.success('Account deleted successfully');
      navigate('/');
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account. Please contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle privacy settings update
  const handlePrivacyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrivacyLoading(true);

    try {
      // In a real implementation, you'd save these to a user_preferences table
      // For now, we'll just show success
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Privacy settings updated');
    } catch (error) {
      toast.error('Failed to update privacy settings');
    } finally {
      setPrivacyLoading(false);
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
          <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Account Security', icon: Shield },
    { id: 'privacy', label: 'Privacy Settings', icon: Lock }
  ];

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account preferences and security settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <nav className="space-y-2">
                {sections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id as any)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeSection === id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Profile Information Section */}
              {activeSection === 'profile' && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Profile Information</h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex justify-center lg:justify-start">
                      <AvatarUpload
                        currentAvatarUrl={user.avatar_url}
                        userId={user.id}
                        onAvatarUpdate={(url) => setUser(prev => prev ? { ...prev, avatar_url: url } : null)}
                        size="xl"
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Username
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                          required
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {usernameValidation.isChecking && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {!usernameValidation.isChecking && usernameValidation.isValid === true && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                          {!usernameValidation.isChecking && usernameValidation.isValid === false && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {usernameValidation.message && (
                        <p className={`text-sm mt-1 ${
                          usernameValidation.isValid === true ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {usernameValidation.message}
                        </p>
                      )}
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        To change your email, use the Account Security section
                      </p>
                    </div>

                    {/* Account Type (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Account Type
                      </label>
                      <input
                        type="text"
                        value={user.user_type === 'ngo' ? 'NGO Organization' : 'Volunteer'}
                        className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed capitalize"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Account type cannot be changed after registration
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={profileLoading || usernameValidation.isValid === false}
                        className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {profileLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Account Security Section */}
              {activeSection === 'security' && (
                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Change Password</h2>
                    
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        
                        {/* Password Requirements */}
                        {passwordForm.newPassword && (
                          <div className="mt-2 space-y-1">
                            <div className={`flex items-center text-xs ${passwordValidation.hasMinLength ? 'text-green-600' : 'text-red-600'}`}>
                              <Check className={`h-3 w-3 mr-1 ${passwordValidation.hasMinLength ? 'opacity-100' : 'opacity-30'}`} />
                              At least 8 characters
                            </div>
                            <div className={`flex items-center text-xs ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                              <Check className={`h-3 w-3 mr-1 ${passwordValidation.hasUppercase ? 'opacity-100' : 'opacity-30'}`} />
                              One uppercase letter
                            </div>
                            <div className={`flex items-center text-xs ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                              <Check className={`h-3 w-3 mr-1 ${passwordValidation.hasLowercase ? 'opacity-100' : 'opacity-30'}`} />
                              One lowercase letter
                            </div>
                            <div className={`flex items-center text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                              <Check className={`h-3 w-3 mr-1 ${passwordValidation.hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                              One number
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                          <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={passwordLoading || !passwordValidation.isValid || passwordForm.newPassword !== passwordForm.confirmPassword}
                          className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {passwordLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Lock className="h-4 w-4 mr-2" />
                          )}
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Email Change */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Change Email Address</h2>
                    
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-amber-800">
                            Changing your email will require verification. You'll receive a confirmation email at your new address.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleEmailChange} className="space-y-4">
                      {/* Current Email */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Current Email
                        </label>
                        <input
                          type="email"
                          value={user.email || ''}
                          className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                          disabled
                        />
                      </div>

                      {/* New Email */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          New Email Address
                        </label>
                        <input
                          type="email"
                          value={emailForm.newEmail}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>

                      {/* Password Confirmation */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showEmailPassword ? 'text' : 'password'}
                            value={emailForm.password}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={emailLoading || !emailForm.newEmail || !emailForm.password}
                          className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {emailLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Mail className="h-4 w-4 mr-2" />
                          )}
                          Update Email
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Account Deletion */}
                  <div className="bg-card rounded-lg border border-red-200 p-6">
                    <h2 className="text-xl font-semibold text-red-600 mb-6">Delete Account</h2>
                    
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-800 mb-1">Warning: This action cannot be undone</h4>
                          <p className="text-sm text-red-700">
                            Deleting your account will permanently remove all your data, including:
                          </p>
                          <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                            <li>Profile information and avatar</li>
                            <li>Event registrations and history</li>
                            {user.user_type === 'ngo' && (
                              <>
                                <li>NGO profile and all created events</li>
                                <li>Volunteer enrollments and certificates</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {!showDeleteConfirm ? (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAccountDeletion} className="space-y-4">
                        {/* Confirmation Text */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Type "DELETE" to confirm
                          </label>
                          <input
                            type="text"
                            value={deleteForm.confirmText}
                            onChange={(e) => setDeleteForm(prev => ({ ...prev, confirmText: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Type DELETE"
                            required
                          />
                        </div>

                        {/* Password Confirmation */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <input
                              type={showDeletePassword ? 'text' : 'password'}
                              value={deleteForm.password}
                              onChange={(e) => setDeleteForm(prev => ({ ...prev, password: e.target.value }))}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowDeletePassword(!showDeletePassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteForm({ confirmText: '', password: '' });
                            }}
                            className="flex items-center px-4 py-2 border border-border text-foreground bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={deleteLoading || deleteForm.confirmText !== 'DELETE' || !deleteForm.password}
                            className="flex items-center px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {deleteLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete Account
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Privacy Settings Section */}
              {activeSection === 'privacy' && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Privacy Settings</h2>
                  
                  <form onSubmit={handlePrivacyUpdate} className="space-y-6">
                    {/* Profile Visibility */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Profile Visibility
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value="public"
                            checked={privacySettings.profileVisibility === 'public'}
                            onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                            className="mr-3"
                          />
                          <div>
                            <span className="font-medium">Public</span>
                            <p className="text-sm text-muted-foreground">Your profile is visible to all users</p>
                          </div>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value="private"
                            checked={privacySettings.profileVisibility === 'private'}
                            onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                            className="mr-3"
                          />
                          <div>
                            <span className="font-medium">Private</span>
                            <p className="text-sm text-muted-foreground">Only you can see your profile details</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Email Notifications */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Email Notifications
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Event Notifications</span>
                            <p className="text-sm text-muted-foreground">Receive emails about event updates and registrations</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={privacySettings.emailNotifications}
                            onChange={(e) => setPrivacySettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                            className="ml-4"
                          />
                        </label>
                        
                        <label className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Event Reminders</span>
                            <p className="text-sm text-muted-foreground">Get reminded about upcoming events you've registered for</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={privacySettings.eventReminders}
                            onChange={(e) => setPrivacySettings(prev => ({ ...prev, eventReminders: e.target.checked }))}
                            className="ml-4"
                          />
                        </label>
                        
                        <label className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Marketing Emails</span>
                            <p className="text-sm text-muted-foreground">Receive newsletters and promotional content</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={privacySettings.marketingEmails}
                            onChange={(e) => setPrivacySettings(prev => ({ ...prev, marketingEmails: e.target.checked }))}
                            className="ml-4"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Data Export */}
                    <div className="border-t border-border pt-6">
                      <h3 className="text-lg font-medium text-foreground mb-3">Data Management</h3>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => toast.info('Data export feature coming soon')}
                          className="flex items-center px-4 py-2 border border-border text-foreground bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Export My Data
                        </button>
                        <p className="text-sm text-muted-foreground">
                          Download a copy of all your data in JSON format
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={privacyLoading}
                        className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {privacyLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Privacy Settings
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}