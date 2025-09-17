import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader2, Calendar, MapPin, FileText, Users, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { LocationInput } from './LocationInput';
import { useFormValidation } from '../hooks/useFormValidation';
import { useErrorHandler } from '../hooks/useErrorHandler';
import type { LocationData } from '../types/location';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  slots_available: number;
  image_url?: string;
  ngo_id: string;
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at?: string;
  updated_at?: string;
}

interface EventFormProps {
  mode: 'create' | 'edit';
  existingEvent?: Event | null;
  ngoId: string;
  userId: string;
  onSuccess: (event: Event) => void;
  onCancel?: () => void;
}

interface FormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  slots_available: number;
  image_url: string | null;
}

interface AutoSaveState {
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

// Validation schema for the form
const validationSchema = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  },
  description: {
    required: true,
    minLength: 20,
    maxLength: 1000,
  },
  date: {
    required: true,
    custom: (value: string, formData: FormData) => {
      const eventDateTime = new Date(`${value}T${formData.time || '00:00'}`);
      const now = new Date();
      const minDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      if (eventDateTime <= minDate) {
        return 'Event must be at least 1 hour in the future';
      }
      if (eventDateTime > maxDate) {
        return 'Event cannot be more than 1 year in the future';
      }
      return null;
    },
  },
  time: {
    required: true,
    pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  location: {
    required: true,
    minLength: 3,
    maxLength: 200,
  },
  slots_available: {
    required: true,
    min: 1,
    max: 1000,
    type: 'number',
  },
};

export function EventForm({ mode, existingEvent, ngoId, userId, onSuccess, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    address: null,
    city: null,
    latitude: null,
    longitude: null,
    slots_available: 10,
    image_url: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    isAutoSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialFormDataRef = useRef<FormData | null>(null);
  
  const { handleError, withErrorHandling } = useErrorHandler({
    component: 'EventForm',
    enableAutoRecovery: true,
  });

  const {
    errors: validationErrors,
    validateField,
    validateForm,
    clearErrors,
    setFieldError,
  } = useFormValidation(validationSchema);

  // Initialize form data for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingEvent) {
      const eventDate = new Date(existingEvent.date);
      const dateStr = eventDate.toISOString().split('T')[0];
      const timeStr = eventDate.toTimeString().slice(0, 5);

      const initialData = {
        title: existingEvent.title,
        description: existingEvent.description,
        date: dateStr,
        time: timeStr,
        location: existingEvent.location,
        address: existingEvent.address || null,
        city: existingEvent.city || null,
        latitude: existingEvent.latitude || null,
        longitude: existingEvent.longitude || null,
        slots_available: existingEvent.slots_available,
        image_url: existingEvent.image_url || null,
      };

      setFormData(initialData);
      initialFormDataRef.current = initialData;
    } else {
      // Set default time to next hour for new events
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const defaultTime = nextHour.toTimeString().slice(0, 5);
      const defaultDate = nextHour.toISOString().split('T')[0];

      const initialData = {
        ...formData,
        date: defaultDate,
        time: defaultTime,
      };

      setFormData(initialData);
      initialFormDataRef.current = initialData;
    }
  }, [mode, existingEvent]);

  // Auto-save functionality
  const autoSave = useCallback(
    withErrorHandling(async (data: FormData) => {
      if (mode !== 'edit' || !existingEvent) return;

      setAutoSaveState(prev => ({ ...prev, isAutoSaving: true }));

      try {
        const eventDateTime = new Date(`${data.date}T${data.time}`);

        const eventData = {
          title: data.title.trim(),
          description: data.description.trim(),
          date: eventDateTime.toISOString(),
          location: data.location.trim(),
          address: data.address,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          slots_available: data.slots_available,
          image_url: data.image_url,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (error) throw error;

        setAutoSaveState(prev => ({
          ...prev,
          isAutoSaving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
        }));
      } catch (error) {
        setAutoSaveState(prev => ({ ...prev, isAutoSaving: false }));
        handleError(error instanceof Error ? error : new Error('Auto-save failed'));
      }
    }, 'autoSave'),
    [mode, existingEvent, withErrorHandling, handleError]
  );

  // Debounced auto-save
  const debouncedAutoSave = useCallback((data: FormData) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (mode === 'edit' && hasFormChanged(data)) {
        autoSave(data);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [mode, autoSave]);

  // Check if form has changed from initial state
  const hasFormChanged = useCallback((data: FormData): boolean => {
    if (!initialFormDataRef.current) return false;
    
    return JSON.stringify(data) !== JSON.stringify(initialFormDataRef.current);
  }, []);

  // Handle form data changes with validation and auto-save
  const handleFormDataChange = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Mark as having unsaved changes
      setAutoSaveState(prevState => ({
        ...prevState,
        hasUnsavedChanges: hasFormChanged(newData),
      }));

      // Trigger debounced auto-save
      debouncedAutoSave(newData);

      return newData;
    });
  }, [hasFormChanged, debouncedAutoSave]);

  // Real-time field validation
  const handleFieldChange = useCallback((field: keyof FormData, value: any) => {
    handleFormDataChange({ [field]: value });
    
    // Validate field after a short delay
    setTimeout(() => {
      validateField(field, value, formData);
    }, 300);
  }, [handleFormDataChange, validateField, formData]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced validation with better error messages
  const validateFormData = (): boolean => {
    const isValid = validateForm(formData);
    
    // Additional custom validations
    if (formData.title.trim() && !/^[a-zA-Z0-9\s\-_.,!?()]+$/.test(formData.title)) {
      setFieldError('title', 'Title contains invalid characters');
      return false;
    }

    if (formData.description.trim() && formData.description.length > 1000) {
      setFieldError('description', 'Description cannot exceed 1000 characters');
      return false;
    }

    // Check for duplicate event titles (for create mode)
    if (mode === 'create' && formData.title.trim()) {
      // This would typically be an async check, but for now we'll skip it
      // to avoid making the validation async
    }

    return isValid;
  };

  const handleLocationChange = useCallback((location: LocationData | null) => {
    if (location) {
      handleFormDataChange({
        location: location.address,
        address: location.address,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      clearErrors(['location']);
    } else {
      handleFormDataChange({
        location: '',
        address: null,
        city: null,
        latitude: null,
        longitude: null,
      });
    }
  }, [handleFormDataChange, clearErrors]);

  const handleSubmit = withErrorHandling(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormData()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventDateTime = new Date(`${formData.date}T${formData.time}`);

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: eventDateTime.toISOString(),
        location: formData.location.trim(),
        address: formData.address,
        city: formData.city,
        latitude: formData.latitude,
        longitude: formData.longitude,
        slots_available: formData.slots_available,
        image_url: formData.image_url,
        updated_at: new Date().toISOString(),
      };

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('events')
          .insert([{
            ...eventData,
            ngo_id: ngoId,
          }])
          .select()
          .single();

        if (error) throw error;
        
        toast.success('Event created successfully!');
        onSuccess(data as Event);
      } else {
        if (!existingEvent) {
          throw new Error('No existing event to update');
        }

        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', existingEvent.id)
          .select()
          .single();

        if (error) throw error;

        toast.success('Event updated successfully!');
        onSuccess(data as Event);
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to save event'));
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  }, 'handleSubmit');

  const currentLocation: LocationData | null = formData.latitude && formData.longitude ? {
    address: formData.address || formData.location,
    city: formData.city || '',
    state: '',
    country: 'India',
    latitude: formData.latitude,
    longitude: formData.longitude,
  } : null;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-foreground">
            {mode === 'create' ? 'Create New Event' : 'Edit Event'}
          </h2>
          
          {/* Auto-save Status Indicator */}
          {mode === 'edit' && (
            <div className="flex items-center space-x-2 text-sm">
              {autoSaveState.isAutoSaving ? (
                <div className="flex items-center text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  <span>Saving...</span>
                </div>
              ) : autoSaveState.hasUnsavedChanges ? (
                <div className="flex items-center text-amber-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Unsaved changes</span>
                </div>
              ) : autoSaveState.lastSaved ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Saved {autoSaveState.lastSaved.toLocaleTimeString()}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        <p className="text-muted-foreground">
          {mode === 'create' 
            ? 'Create a volunteer opportunity for your organization.'
            : 'Update the event information and details. Changes are automatically saved.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Image */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            <ImageIcon className="h-4 w-4 inline mr-2" />
            Event Image
          </label>
          <ImageUpload
            currentImageUrl={formData.image_url}
            userId={userId}
            bucket="event-images"
            onImageUpdate={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
            placeholder="Upload an event image to attract volunteers"
            aspectRatio="landscape"
            maxSizeMB={5}
          />
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Event Title *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter event title"
                className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  validationErrors.title 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-border focus:ring-primary'
                }`}
                required
                maxLength={100}
              />
              {formData.title && !validationErrors.title && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {validationErrors.title && (
              <p className="text-destructive text-sm mt-1">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Event Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                validationErrors.date 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-border focus:ring-primary'
              }`}
              required
              min={new Date().toISOString().split('T')[0]}
            />
            {validationErrors.date && (
              <p className="text-destructive text-sm mt-1">{validationErrors.date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Event Time *
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => handleFieldChange('time', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                validationErrors.time 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-border focus:ring-primary'
              }`}
              required
            />
            {validationErrors.time && (
              <p className="text-destructive text-sm mt-1">{validationErrors.time}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Event Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe the event, what volunteers will do, requirements, etc."
            rows={4}
            className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors ${
              validationErrors.description 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-border focus:ring-primary'
            }`}
            required
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1">
            {validationErrors.description && (
              <p className="text-destructive text-sm">{validationErrors.description}</p>
            )}
            <p className="text-xs text-muted-foreground ml-auto">
              {formData.description.length}/1000 characters
            </p>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Event Location *
          </label>
          <LocationInput
            value={currentLocation}
            onChange={handleLocationChange}
            placeholder="Search for event location..."
            showCurrentLocation={true}
          />
          {validationErrors.location && (
            <p className="text-destructive text-sm mt-1">{validationErrors.location}</p>
          )}
        </div>

        {/* Available Slots */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <Users className="h-4 w-4 inline mr-2" />
            Available Volunteer Slots *
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={formData.slots_available}
            onChange={(e) => handleFieldChange('slots_available', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
              validationErrors.slots_available 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-border focus:ring-primary'
            }`}
            required
          />
          {validationErrors.slots_available && (
            <p className="text-destructive text-sm mt-1">{validationErrors.slots_available}</p>
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
                {mode === 'create' ? 'Create Event' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}