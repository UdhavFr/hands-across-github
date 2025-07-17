import { useEffect, useState } from 'react';
import { Loader2, Users, Calendar, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tables } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { RequireAuth } from '../components/RequireAuth';

type EventRegistrationWithDetails = Tables<'event_registrations'> & {
  events: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
  };
  users: {
    id: string;
    full_name: string;
    email: string | null;
  };
};

type NgoEnrollmentWithDetails = Tables<'ngo_enrollments'> & {
  users: {
    id: string;
    full_name: string;
    email: string | null;
  };
};

export function NgoDashboard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<{
    eventRegistrations: EventRegistrationWithDetails[];
    ngoEnrollments: NgoEnrollmentWithDetails[];
  }>({ eventRegistrations: [], ngoEnrollments: [] });
  const [currentTab, setCurrentTab] = useState<'events' | 'volunteers'>('events');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Starting NGO Dashboard data fetch...');

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('👤 User data:', user);
        
        if (userError) {
          console.error('❌ User error:', userError);
          throw userError;
        }
        
        if (!user) {
          console.log('⚠️ No user found');
          return;
        }

        // Get NGO profile with detailed logging
        console.log('🔍 Querying NGO profile for user_id:', user.id);
        const { data: ngoProfile, error: ngoError } = await supabase
          .from('ngo_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        console.log('🏢 NGO Profile query result:', { ngoProfile, ngoError });

        if (ngoError) {
          console.error('❌ NGO profile error:', ngoError);
          // Let's also check if there are ANY NGO profiles
          const { data: allNgos, error: allNgosError } = await supabase
            .from('ngo_profiles')
            .select('*');
          console.log('📋 All NGO profiles in database:', { allNgos, allNgosError });
          throw ngoError;
        }

        if (!ngoProfile) {
          console.log('⚠️ No NGO profile found for user');
          // Let's check what NGO profiles exist
          const { data: allNgos, error: allNgosError } = await supabase
            .from('ngo_profiles')
            .select('*');
          console.log('📋 All NGO profiles in database:', { allNgos, allNgosError });
          setRequests({ eventRegistrations: [], ngoEnrollments: [] });
          setLoading(false);
          return;
        }

        console.log('✅ NGO Profile found:', ngoProfile);

        // Get events for this NGO with detailed logging
        console.log('🔍 Querying events for ngo_id:', ngoProfile.id);
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('ngo_id', ngoProfile.id);

        console.log('📅 Events query result:', { events, eventsError });

        if (eventsError) {
          console.error('❌ Events error:', eventsError);
          throw eventsError;
        }

        const eventIds = events?.map(event => event.id) || [];
        console.log('📋 Event IDs for NGO:', eventIds);

        // Let's also check ALL events in the database
        const { data: allEvents, error: allEventsError } = await supabase
          .from('events')
          .select('*');
        console.log('📊 All events in database:', { allEvents, allEventsError });

        // Get event registrations with detailed info
        let eventRegistrations: EventRegistrationWithDetails[] = [];
        if (eventIds.length > 0) {
          console.log('🔍 Querying event registrations for event_ids:', eventIds);
          const { data: registrations, error: registrationsError } = await supabase
            .from('event_registrations')
            .select(`
              *,
              events (
                id,
                title,
                description,
                date,
                location
              ),
              users (
                id,
                full_name,
                email
              )
            `)
            .in('event_id', eventIds)
            .eq('status', 'pending');

          console.log('📝 Event registrations query result:', { registrations, registrationsError });

          if (registrationsError) {
            console.error('❌ Event registrations error:', registrationsError);
            throw registrationsError;
          }

          eventRegistrations = registrations || [];
        } else {
          console.log('⚠️ No events found for NGO, skipping event registrations query');
        }

        // Let's also check ALL event registrations in the database
        const { data: allRegistrations, error: allRegistrationsError } = await supabase
          .from('event_registrations')
          .select('*');
        console.log('📊 All event registrations in database:', { allRegistrations, allRegistrationsError });

        // Get NGO enrollments with detailed logging
        console.log('🔍 Querying NGO enrollments for ngo_id:', ngoProfile.id);
        const { data: ngoEnrollments, error: enrollmentsError } = await supabase
          .from('ngo_enrollments')
          .select(`
            *,
            users (
              id,
              full_name,
              email
            )
          `)
          .eq('ngo_id', ngoProfile.id)
          .eq('status', 'pending');

        console.log('👥 NGO enrollments query result:', { ngoEnrollments, enrollmentsError });

        if (enrollmentsError) {
          console.error('❌ NGO enrollments error:', enrollmentsError);
          throw enrollmentsError;
        }

        // Let's also check ALL NGO enrollments in the database
        const { data: allEnrollments, error: allEnrollmentsError } = await supabase
          .from('ngo_enrollments')
          .select('*');
        console.log('📊 All NGO enrollments in database:', { allEnrollments, allEnrollmentsError });

        console.log('📊 Final data summary:', {
          userId: user.id,
          ngoProfileId: ngoProfile.id,
          ngoProfileName: ngoProfile.name,
          eventsCount: events?.length || 0,
          eventIds: eventIds,
          eventRegistrationsCount: eventRegistrations.length,
          ngoEnrollmentsCount: ngoEnrollments?.length || 0,
          eventRegistrations: eventRegistrations,
          ngoEnrollments: ngoEnrollments
        });

        setRequests({
          eventRegistrations,
          ngoEnrollments: ngoEnrollments || []
        });

      } catch (error) {
        console.error('💥 Error fetching NGO dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
        console.log('✅ NGO Dashboard data fetch completed');
      }
    };

    fetchData();

    // Subscribe to real-time changes with detailed logging
    console.log('🔔 Setting up real-time subscriptions...');
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_registrations' },
        (payload) => {
          console.log('🔄 Event registration change:', payload);
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ngo_enrollments' },
        (payload) => {
          console.log('🔄 NGO enrollment change:', payload);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up subscriptions...');
      supabase.removeChannel(channel);
    };
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
