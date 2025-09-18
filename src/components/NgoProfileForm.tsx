import { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Loader2, Building, FileText, Globe, MapPin, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { LocationInput } from './LocationInput';
import { CauseAreasInput } from './CauseAreasInput';
import { useFormValidation } from '../hooks/useFormValidation';
import { useErrorHandler } from '../hooks/useErrorHandler';
import type { NGOProfile } from '../types';
import type { LocationData } from '../types/location';
import toast from 'react-hot-toast';

interface NgoProfileFormProps {
  mode: 'create' | 'edit';
  existingProfile?: NGOProfile | null;
  onSuccess: (profile: NGOProfile) => void;
  onCancel?: () => void;
  showSuccessToast?: boolean;
}

interface FormData {
  name: string;
  description: string;
  website: string;
  cause_areas: string[];
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number;
}

interface ProfileCompletionScore {
  score: number;
  maxScore: number;
  percentage: number;
  missingFields: string[];
  suggestions: string[];
}

// Validation schema for NGO profile
const validationSchema = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,()&]+$/,
  },
  description: {
    required: true,
    minLength: 50,
    maxLength: 2000,
  },
  website: {
    required: false,
    pattern: /^https?:\/\/.+\..+/,
  },
  cause_areas: {
    required: true,
    minItems: 1,
  },
  service_radius_km: {
    required: true,
    min: 1,
    max: 1000,
    type: 'number',
  },
};

export function NgoProfileForm({ mode, existingProfile, onSuccess, onCancel, showSuccessToast = true }: NgoProfileFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    website: '',
    cause_areas: [],
    logo_url: null,
    address: null,
    city: null,
    state: null,
    country: 'India',
    postal_code: null,
    latitude: null,
    longitude: null,
    service_radius_km: 50
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    errors: validationErrors,
    validateField,
    validateForm,
    clearErrors,
    setFieldError,
  } = useFormValidation({
    initialValues: formData,
    validationRules: validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Initialize form data for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingProfile) {
      setFormData({
        name: existingProfile.name,
        description: existingProfile.description,
        website: existingProfile.website || '',
        cause_areas: existingProfile.cause_areas || [],
        logo_url: existingProfile.logo_url || null,
        address: (existingProfile as any).address || null,
        city: (existingProfile as any).city || null,
        state: (existingProfile as any).state || null,
        country: (existingProfile as any).country || 'India',
        postal_code: (existingProfile as any).postal_code || null,
        latitude: (existingProfile as any).latitude || null,
        longitude: (existingProfile as any).longitude || null,
        service_radius_km: (existingProfile as any).service_radius_km || 50
      });
    }
  }, [mode, existingProfile]);

  // Calculate profile completion score
  const completionScore = useMemo((): ProfileCompletionScore => {
    const fields = [
      { key: 'name', label: 'Organization Name', weight: 20, required: true },
      { key: 'description', label: 'Description', weight: 15, required: true },
      { key: 'logo_url', label: 'Logo', weight: 10, required: false },
      { key: 'website', label: 'Website', weight: 10, required: false },
      { key: 'cause_areas', label: 'Cause Areas', weight: 15, required: true },
      { key: 'address', label: 'Address', weight: 10, required: false },
      { key: 'city', label: 'City', weight: 10, required: false },
      { key: 'state', label: 'State', weight: 5, required: false },
      { key: 'postal_code', label: 'Postal Code', weight: 5, required: false },
    ];

    let score = 0;
    let maxScore = 0;
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    fields.forEach(field => {
      maxScore += field.weight;
      const value = formData[field.key as keyof FormData];
      
      let hasValue = false;
      if (Array.isArray(value)) {
        hasValue = value.length > 0;
      } else if (typeof value === 'string') {
        hasValue = value.trim().length > 0;
      } else {
        hasValue = value !== null && value !== undefined;
      }

      if (hasValue) {
        score += field.weight;
      } else {
        if (field.required) {
          missingFields.push(field.label);
        } else {
          suggestions.push(`Add ${field.label.toLowerCase()} to improve your profile`);
        }
      }
    });

    const percentage = Math.round((score / maxScore) * 100);

    return {
      score,
      maxScore,
      percentage,
      missingFields,
      suggestions,
    };
  }, [formData]);

  // Real-time field validation
  const handleFieldChange = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate field after a short delay
    setTimeout(() => {
      validateField(field, value, formData);
    }, 300);
  }, [validateField, formData]);

  // Enhanced validation
  const validateFormData = (): boolean => {
    const isValid = validateForm(formData);

    // Additional custom validations
    if (formData.website && !formData.website.startsWith('http')) {
      setFieldError('website', 'Website URL must start with http:// or https://');
      return false;
    }

    return isValid;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleLocationChange = (location: LocationData | null) => {
    if (location) {
      setFormData(prev => ({
        ...prev,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        postal_code: location.postalCode || null,
        latitude: location.latitude,
        longitude: location.longitude
      }));
      clearErrors(['address', 'city', 'state']);
    } else {
      setFormData(prev => ({
        ...prev,
        address: null,
        city: null,
        state: null,
        postal_code: null,
        latitude: null,
        longitude: null
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(formData)) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const profileData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        website: formData.website.trim() || null,
        cause_areas: formData.cause_areas,
        logo_url: formData.logo_url,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postal_code,
        latitude: formData.latitude,
        longitude: formData.longitude,
        service_radius_km: formData.service_radius_km,
        updated_at: new Date().toISOString()
      };

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('ngo_profiles')
          .insert([{
            ...profileData,
            user_id: user.id
          }])
          .select()
          .single();

        if (error) throw error;
        
        if (showSuccessToast) {
          toast.success('NGO profile created successfully!');
        }
        onSuccess(data as NGOProfile);
      } else {
        if (!existingProfile) {
          throw new Error('No existing profile to update');
        }

        const { data, error } = await supabase
          .from('ngo_profiles')
          .update(profileData)
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (error) throw error;

        if (showSuccessToast) {
          toast.success('NGO profile updated successfully!');
        }
        onSuccess(data as NGOProfile);
      }
    } catch (error) {
      console.error('Profile submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLocation: LocationData | null = formData.latitude && formData.longitude ? {
    address: formData.address || '',
    city: formData.city || '',
    state: formData.state || '',
    country: formData.country,
    latitude: formData.latitude,
    longitude: formData.longitude,
    postalCode: formData.postal_code || undefined
  } : null;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {mode === 'create' ? 'Create NGO Profile' : 'Edit NGO Profile'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'create' 
            ? 'Set up your organization\'s profile to start creating events and connecting with volunteers.'
            : 'Update your organization\'s information and settings.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Organization Logo
          </label>
          <ImageUpload
            currentImageUrl={formData.logo_url}
            userId={existingProfile?.user_id || ''}
            bucket="ngo-logos"
            onImageUpdate={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
            placeholder="Upload your organization's logo"
            aspectRatio="square"
            maxSizeMB={3}
          />
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Building className="h-4 w-4 inline mr-2" />
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            {validationErrors.name && (
              <p className="text-destructive text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Globe className="h-4 w-4 inline mr-2" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://yourorganization.org"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {validationErrors.website && (
              <p className="text-destructive text-sm mt-1">{validationErrors.website}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Tell people about your organization's mission, goals, and impact..."
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            required
          />
          <div className="flex justify-between items-center mt-1">
            {validationErrors.description && (
              <p className="text-destructive text-sm">{validationErrors.description}</p>
            )}
            <p className="text-xs text-muted-foreground ml-auto">
              {formData.description.length}/500 characters
            </p>
          </div>
        </div>

        {/* Cause Areas */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <Tag className="h-4 w-4 inline mr-2" />
            Cause Areas *
          </label>
          <CauseAreasInput
            causeAreas={formData.cause_areas}
            onChange={(areas) => setFormData(prev => ({ ...prev, cause_areas: areas }))}
            placeholder="Add cause areas that your organization focuses on"
          />
          {validationErrors.cause_areas && (
            <p className="text-destructive text-sm mt-1">{validationErrors.cause_areas}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Organization Location
          </label>
          <LocationInput
            value={currentLocation}
            onChange={handleLocationChange}
            placeholder="Search for your organization's address..."
            showCurrentLocation={true}
            autoDetectOnMount={false}
            className="mb-4"
          />
          
          {/* Service Radius */}
          {formData.latitude && formData.longitude && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Service Radius (km)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={formData.service_radius_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_radius_km: Number(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-16">
                  {formData.service_radius_km} km
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How far from your location do you typically organize events?
              </p>
              {validationErrors.service_radius_km && (
                <p className="text-destructive text-sm mt-1">{validationErrors.service_radius_km}</p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t border-border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-border text-foreground bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors inline-flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create Profile' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}