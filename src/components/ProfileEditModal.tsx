import { useState, useEffect } from 'react';
import { X, User, Mail, Type, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
import { AvatarUpload } from './AvatarUpload';
import type { AppUser } from '../types';
import toast from 'react-hot-toast';

interface ProfileEditModalProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (updatedUser: AppUser) => void;
}

interface UsernameValidation {
  isChecking: boolean;
  isValid: boolean | null;
  message: string;
}

export function ProfileEditModal({ user, isOpen, onClose, onUserUpdate }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    username: user.username,
    email: user.email || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidation>({
    isChecking: false,
    isValid: null,
    message: '',
  });

  // Debounced username validation
  const checkUsernameDebounced = useDebounce(async () => {
    if (!formData.username || formData.username === user.username) {
      setUsernameValidation({ isChecking: false, isValid: null, message: '' });
      return;
    }

    if (formData.username.length < 3) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: 'Username must be at least 3 characters',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: 'Username can only contain letters, numbers, and underscores',
      });
      return;
    }

    setUsernameValidation({ isChecking: true, isValid: null, message: 'Checking availability...' });

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username)
        .neq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Username check error:', error);
        setUsernameValidation({
          isChecking: false,
          isValid: false,
          message: 'Error checking username',
        });
        return;
      }

      if (data) {
        setUsernameValidation({
          isChecking: false,
          isValid: false,
          message: 'Username is already taken',
        });
      } else {
        setUsernameValidation({
          isChecking: false,
          isValid: true,
          message: 'Username is available',
        });
      }
    } catch (error) {
      console.error('Username validation error:', error);
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: 'Error checking username',
      });
    }
  }, 500);

  useEffect(() => {
    checkUsernameDebounced();
  }, [formData.username, checkUsernameDebounced]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usernameValidation.isValid === false) {
      toast.error('Please fix username issues before saving');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          email: formData.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        toast.error('Failed to update profile');
        return;
      }

      const updatedUser = { ...user, ...data } as AppUser;
      onUserUpdate(updatedUser);
      toast.success('Profile updated successfully');
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <AvatarUpload
              currentAvatarUrl={user.avatar_url}
              userId={user.id}
              onAvatarUpdate={(url) => {
                const updatedUser = { ...user, avatar_url: url };
                onUserUpdate(updatedUser);
              }}
              size="lg"
            />
          </div>

          <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Type className="h-4 w-4 inline mr-2" />
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
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
                  <AlertCircle className="h-4 w-4 text-red-500" />
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

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || usernameValidation.isValid === false}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors inline-flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}