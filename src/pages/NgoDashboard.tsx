import { useEffect, useState, useCallback } from 'react';
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
  const [hasNgoProfile, setHasNgoProfile] = useState(false);

  // Extract fetchData as a useCallback to avoid recreation on every render
  const fetchData = useCallback(async () => {
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

      // Get NGO profile with proper error handling
      console.log('🔍 Querying NGO profile for user_id:', user.id);
      const { data: ngoProfile, error: ngoError } = await supabase
        .from('ngo_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single()

      console.log('🏢 NGO Profile query result:', { ngoProfile, ngoError });

      if (ngoError) {
        console.error('❌ NGO profile error:', ngoError);
        throw ngoError;
      }

      if (!ngoProfile) {
        console.log('⚠️ No NGO profile found for user');
        setHasNgoProfile(false);
        setRequests({ eventRegistrations: [], ngoEnrollments: [] });
        setLoading(false);
        return;
      }

      setHasNgoProfile(true);
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

      // Get event registrations with detailed info
      let eventRegistrations: EventRegistrationWithDetails[] = [];
      if (eventIds.length > 0) {
        console.log('🔍 Querying event registrations for event_ids:', eventIds);
        
        // Get basic registrations first
        const { data: simpleRegistrations, error: simpleError } = await supabase
          .from('event_registrations')
          .select('*')
          .in('event_id', eventIds)
          .eq('status', 'pending');
        
        console.log('📝 Simple registrations query result:', { simpleRegistrations, simpleError });

        if (simpleError) {
          console.error('❌ Simple registrations error:', simpleError);
          eventRegistrations = [];
        } else if (simpleRegistrations && simpleRegistrations.length > 0) {
          // Now try to get the related data separately
          const enrichedRegistrations = await Promise.all(
            simpleRegistrations.map(async (reg) => {
              // Get event details
              const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('id, title, description, date, location')
                .eq('id', reg.event_id)
                .single();
              
              // Get user details
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('id', reg.user_id)
                .single();
              
              console.log('📝 Event and user data for registration:', { 
                registrationId: reg.id,
                eventData, 
                eventError,
                userData, 
                userError 
              });

              return {
                ...reg,
                events: eventData || { 
                  id: reg.event_id, 
                  title: 'Unknown Event', 
                  description: '', 
                  date: '', 
                  location: '' 
                },
                users: userData || { 
                  id: reg.user_id, 
                  full_name: 'Unknown User', 
                  email: null 
                }
              };
            })
          );
          
          eventRegistrations = enrichedRegistrations;
        }
      } else {
        console.log('⚠️ No events found for NGO, skipping event registrations query');
      }

      // Get NGO enrollments with detailed logging
      console.log('🔍 Querying NGO enrollments for ngo_id:', ngoProfile.id);
      
      // Get basic enrollments first
      const { data: simpleEnrollments, error: simpleEnrollError } = await supabase
        .from('ngo_enrollments')
        .select('*')
        .eq('ngo_id', ngoProfile.id)
        .eq('status', 'pending');
      
      console.log('👥 Simple enrollments query result:', { simpleEnrollments, simpleEnrollError });

      let ngoEnrollments: NgoEnrollmentWithDetails[] = [];
      
      if (simpleEnrollError) {
        console.error('❌ Simple enrollments error:', simpleEnrollError);
        ngoEnrollments = [];
      } else if (simpleEnrollments && simpleEnrollments.length > 0) {
        // Get user details separately for each enrollment
        const enrichedEnrollments = await Promise.all(
          simpleEnrollments.map(async (enroll) => {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, full_name, email')
              .eq('id', enroll.user_id)
              .single();
            
            console.log('👥 User data for enrollment:', { 
              enrollmentId: enroll.id,
              userData, 
              userError 
            });

            return {
              ...enroll,
              users: userData || { 
                id: enroll.user_id, 
                full_name: 'Unknown User', 
                email: null 
              }
            };
          })
        );
        
        ngoEnrollments = enrichedEnrollments;
      }

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
      // Only show toast error for unexpected errors, not missing data
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116') {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      console.log('✅ NGO Dashboard data fetch completed');
    }
  }, []);

  useEffect(() => {
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
  }, [fetchData]);

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
      // Refetch data to update the UI and remove the processed card
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  // Show message if user doesn't have an NGO profile
  if (!hasNgoProfile) {
    return (
      <RequireAuth role="ngo">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">NGO Dashboard</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                You don't have an NGO profile set up yet. Please create an NGO profile to access the dashboard.
              </p>
            </div>
          </div>
        </div>
      </RequireAuth>
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