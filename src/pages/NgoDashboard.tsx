import { useEffect, useState } from 'react';
import { Loader2, Users, Calendar, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tables } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { RequireAuth } from '../components/RequireAuth';

type EventRegistrationWithDetails = Tables<'event_registrations'> & {
  events: Tables<'events'>;
  users: Tables<'users'>;
};

type NgoEnrollmentWithDetails = Tables<'ngo_enrollments'> & {
  users: Tables<'users'>;
};

export function NgoDashboard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<{
    eventRegistrations: EventRegistrationWithDetails[];
    ngoEnrollments: NgoEnrollmentWithDetails[];
  }>({ eventRegistrations: [], ngoEnrollments: [] });
  const [currentTab, setCurrentTab] = useState<'events' | 'volunteers'>('events');

  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the NGO profile for the current user
      const { data: ngoProfile, error: ngoProfileError } = await supabase
        .from('ngo_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (ngoProfileError || !ngoProfile) {
        console.log('No NGO profile found for user:', user.id, ngoProfileError);
        setRequests({ eventRegistrations: [], ngoEnrollments: [] });
        setLoading(false);
        return;
      }

      console.log('NGO Profile found:', ngoProfile.id);

      // First, get all events for this NGO
      const { data: ngoEvents, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('ngo_id', ngoProfile.id);

      if (eventsError) {
        console.error('Error fetching NGO events:', eventsError);
        setRequests({ eventRegistrations: [], ngoEnrollments: [] });
        setLoading(false);
        return;
      }

      console.log('NGO Events found:', ngoEvents);

      const eventIds = ngoEvents?.map(event => event.id) || [];

      // Now fetch event registrations for these events
      let eventRegistrations: EventRegistrationWithDetails[] = [];
      if (eventIds.length > 0) {
        const { data: registrations, error: registrationsError } = await supabase
          .from('event_registrations')
          .select(`*, events (*), users (*)`)
          .eq('status', 'pending')
          .in('event_id', eventIds)
          .returns<EventRegistrationWithDetails[]>();

        if (registrationsError) {
          console.error('Error fetching event registrations:', registrationsError);
        } else {
          eventRegistrations = registrations || [];
          console.log('Event registrations found:', eventRegistrations.length);
        }
      }

      // Fetch NGO enrollments
      const { data: ngoEnrollments, error: enrollmentsError } = await supabase
        .from('ngo_enrollments')
        .select(`*, users (*)`)
        .eq('status', 'pending')
        .eq('ngo_id', ngoProfile.id)
        .returns<NgoEnrollmentWithDetails[]>();

      if (enrollmentsError) {
        console.error('Error fetching NGO enrollments:', enrollmentsError);
      }

      console.log('NGO enrollments found:', ngoEnrollments?.length || 0);

      setRequests({
        eventRegistrations,
        ngoEnrollments: ngoEnrollments || []
      });
      setLoading(false);
    };

    fetchRequests();

    const channel = supabase.channel('ngo-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_registrations'
      }, fetchRequests)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ngo_enrollments'
      }, fetchRequests)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const handleRequest = async (
    type: 'event' | 'ngo',
    id: string,
    action: 'approve' | 'reject'
  ) => {
    const table = type === 'event' ? 'event_registrations' : 'ngo_enrollments';
    
    const { error } = await supabase
      .from(table)
      .update({ status: action === 'approve' ? 'confirmed' : 'rejected' })
      .eq('id', id);

    if (error) {
      toast.error(`Failed to ${action} request`);
    } else {
      toast.success(`Request ${action}d successfully`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <RequireAuth role="ngo">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">NGO Dashboard</h1>
        
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${currentTab === 'events' ? 'border-b-2 border-rose-600 text-rose-600' : 'text-gray-500'}`}
            onClick={() => setCurrentTab('events')}
          >
            <Calendar className="inline mr-2" />
            Event Registrations ({requests.eventRegistrations.length})
          </button>
          <button
            className={`px-4 py-2 font-medium ${currentTab === 'volunteers' ? 'border-b-2 border-rose-600 text-rose-600' : 'text-gray-500'}`}
            onClick={() => setCurrentTab('volunteers')}
          >
            <Users className="inline mr-2" />
            Volunteer Applications ({requests.ngoEnrollments.length})
          </button>
        </div>

        {currentTab === 'events' ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Event Registrations</h2>
            {requests.eventRegistrations.length === 0 ? (
              <p className="text-gray-500">No pending registrations</p>
            ) : (
              <div className="space-y-4">
                {requests.eventRegistrations.map((reg) => (
                  <div key={reg.id} className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{reg.events.title}</h3>
                        <p className="text-sm text-gray-600">
                          Volunteer: {reg.users.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Email: {reg.users.email || 'No email'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRequest('event', reg.id, 'approve')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRequest('event', reg.id, 'reject')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Volunteer Applications</h2>
            {requests.ngoEnrollments.length === 0 ? (
              <p className="text-gray-500">No pending applications</p>
            ) : (
              <div className="space-y-4">
                {requests.ngoEnrollments.map((enroll) => (
                  <div key={enroll.id} className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{enroll.users.full_name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-600">
                          {enroll.users.email || 'No email'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRequest('ngo', enroll.id, 'approve')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRequest('ngo', enroll.id, 'reject')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
