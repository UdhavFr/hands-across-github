import { useState, useEffect } from 'react';
import { Save, Loader2, Calendar, MapPin, FileText, Users, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { LocationInput } from './LocationInput';
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingEvent) {
      const eventDate = new Date(existingEvent.date);
      const dateStr = eventDate.toISOString().split('T')[0];
      const timeStr = eventDate.toTimeString().slice(0, 5);

      setFormData({
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
      });
    }
  }, [mode, existingEvent]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Event title is required';
    } else if (formData.title.length < 3) {
      errors.title = 'Event title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Event description is required';
    } else if (formData.description.length < 20) {
      errors.description = 'Event description must be at least 20 characters';
    }

    if (!formData.date) {
      errors.date = 'Event date is required';
    } else {
      const eventDateTime = new Date(`${formData.date}T${formData.time || '00:00'}`);
      if (eventDateTime <= new Date()) {
        errors.date = 'Event date must be in the future';
      }
    }

    if (!formData.time) {
      errors.time = 'Event time is required';
    }

    if (!formData.location.trim()) {
      errors.location = 'Event location is required';
    }

    if (formData.slots_available < 1 || formData.slots_available > 1000) {
      errors.slots_available = 'Available slots must be between 1 and 1000';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLocationChange = (location: LocationData | null) => {
    if (location) {
      setFormData(prev => ({
        ...prev,
        location: location.address,
        address: location.address,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location: '',
        address: null,
        city: null,
        latitude: null,
        longitude: null,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
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
      console.error('Event submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {mode === 'create' ? 'Create New Event' : 'Edit Event'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'create' 
            ? 'Create a volunteer opportunity for your organization.'
            : 'Update the event information and details.'
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
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
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
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
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
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the event, what volunteers will do, requirements, etc."
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            required
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
            onChange={(e) => setFormData(prev => ({ ...prev, slots_available: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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