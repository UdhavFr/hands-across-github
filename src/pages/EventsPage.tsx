
import { useEffect, useState } from 'react';
import { LocationFilter } from '../components/LocationFilter';
import { useLocation } from '../hooks/useLocation';
import type { LocationFilterData } from '../types/location';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { EventCard } from '../components/EventCard';
import type { Event } from '../types';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Map<string, 'pending' | 'confirmed'>>(new Map());
  const [locationFilters, setLocationFilters] = useState<LocationFilterData>({
    useCurrentLocation: false,
    radius: 50,
    cities: [],
    states: [],
    showNearbyOnly: false,
    sortByDistance: false
  });
  const { location: userLocation } = useLocation();

  const fetchData = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
  
      if (eventsError) throw eventsError;
  
      // Convert null image_url to undefined
      const formattedEvents = eventsData?.map(event => ({
        ...event,
        image_url: event.image_url || undefined
      })) || [];
  
  setEvents(formattedEvents);
  setFilteredEvents(formattedEvents);
  
      // Rest of the fetch logic...
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const eventsChannel = supabase
      .channel('realtime-events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
    };
  }, []);

  // Filtering logic (similar to NGOsPage)
  useEffect(() => {
    let filtered = [...events];
    // Location-based filtering
    if (locationFilters.useCurrentLocation && userLocation) {
      if (locationFilters.radius < 1000) {
        filtered = filtered.filter(event => {
          if (!(event as any).latitude || !(event as any).longitude) return false;
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number((event as any).latitude),
            Number((event as any).longitude)
          );
          return distance <= locationFilters.radius;
        });
      }
    }
    if (locationFilters.cities.length > 0) {
      filtered = filtered.filter(event =>
        locationFilters.cities.includes((event as any).city || 'Unknown')
      );
    }
    if (locationFilters.states.length > 0) {
      filtered = filtered.filter(event =>
        locationFilters.states.includes((event as any).state || 'Unknown')
      );
    }
    if (locationFilters.sortByDistance && userLocation) {
      filtered.sort((a, b) => {
        const aLat = Number((a as any).latitude);
        const aLng = Number((a as any).longitude);
        const bLat = Number((b as any).latitude);
        const bLng = Number((b as any).longitude);
        if (!aLat || !aLng) return 1;
        if (!bLat || !bLng) return -1;
        const distanceA = calculateDistance(userLocation.latitude, userLocation.longitude, aLat, aLng);
        const distanceB = calculateDistance(userLocation.latitude, userLocation.longitude, bLat, bLng);
        return distanceA - distanceB;
      });
    }
    setFilteredEvents(filtered);
  }, [events, locationFilters, userLocation]);

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  const handleRegister = async (eventId: string) => {
    try {
      setRegistering(eventId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to register for events');
        return;
      }

      // Create registration with pending status
      const { error: registrationError } = await supabase
        .from('event_registrations')
        .insert([{ 
          event_id: eventId, 
          user_id: user.id,
          status: 'pending'
        }]);

      if (registrationError) {
        if (registrationError.code === '23505') {
          throw new Error('Registration request already submitted');
        }
        throw registrationError;
      }

      // Update local state
      setUserRegistrations(new Map(userRegistrations.set(eventId, 'pending')));
      toast.success('Registration request submitted for admin approval!');

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setRegistering(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div id="events" className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Upcoming Events</h1>
      <div className="mb-8">
        <LocationFilter
          onLocationFilter={setLocationFilters}
          currentFilters={locationFilters}
          userLocation={userLocation || undefined}
        />
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <EventCard 
            key={event.id} 
            event={event}
            onRegister={handleRegister}
            isRegistering={registering === event.id}
            registrationStatus={userRegistrations.get(event.id)}
            isDisabled={userRegistrations.has(event.id)}
          />
        ))}
      </div>
    </div>
  );
}
