
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { EventCard } from '../components/EventCard';
import type { Event } from '../types';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Map<string, 'pending' | 'confirmed'>>(new Map());

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
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
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
