import { useEffect, useState, useCallback } from 'react';
import { Loader2, Users, Calendar, Check, X, ChevronDown, ChevronUp, MapPin, Clock, UserMinus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tables } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { RequireAuth } from '../components/RequireAuth';

type EventRegistrationWithDetails = Tables<'event_registrations'> & {
  events: { id: string; title: string; description: string; date: string; location: string };
  users: { id: string; full_name: string; email: string | null };
};

type NgoEnrollmentWithDetails = Tables<'ngo_enrollments'> & {
  users: { id: string; full_name: string; email: string | null };
};

// Add this new type for confirmed volunteers
type ConfirmedVolunteerWithDetails = Tables<'ngo_enrollments'> & {
  users: { id: string; full_name: string; email: string | null };
};

type EventWithParticipants = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image_url: string | null;
  slots_available: number;
  participants: {
    id: string;
    registration_id: string;
    full_name: string;
    email: string | null;
    user_id: string;
  }[];
};

export function NgoDashboard() {
  const [loading, setLoading] = useState(true);
  // Updated state to include confirmed volunteers
  const [requests, setRequests] = useState<{ 
    eventRegistrations: EventRegistrationWithDetails[]; 
    ngoEnrollments: NgoEnrollmentWithDetails[];
    confirmedVolunteers: ConfirmedVolunteerWithDetails[];
  }>({ 
    eventRegistrations: [], 
    ngoEnrollments: [],
    confirmedVolunteers: []
  });
  const [events, setEvents] = useState<EventWithParticipants[]>([]);
  // Updated currentTab type to include myvolunteers
  const [currentTab, setCurrentTab] = useState<'events' | 'registrations' | 'volunteers' | 'myvolunteers'>('events');
  const [hasNgoProfile, setHasNgoProfile] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);
  const [ngoId, setNgoId] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ngoProfile } = await supabase.from('ngo_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (!ngoProfile) {
        setHasNgoProfile(false);
        setRequests({ eventRegistrations: [], ngoEnrollments: [], confirmedVolunteers: [] });
        setEvents([]);
        setNgoId(null);
        return;
      }

      setHasNgoProfile(true);
      setNgoId(ngoProfile.id);

      // Updated Promise.all to include confirmed volunteers query
      const [eventsResult, eventRegsResult, ngoEnrollmentsResult, confirmedVolunteersResult] = await Promise.all([
        supabase.from('events').select('*').eq('ngo_id', ngoProfile.id).order('date', { ascending: true }),
        supabase.from('event_registrations').select(`
          id, user_id, event_id, status, created_at, updated_at,
          events!event_registrations_event_id_fkey(id, title, description, date, location, ngo_id),
          users(id, full_name, email)
        `).eq('status', 'pending').eq('events.ngo_id', ngoProfile.id),
        supabase.from('ngo_enrollments').select(`
          id, user_id, ngo_id, status, created_at, updated_at,
          users(id, full_name, email)
        `).eq('ngo_id', ngoProfile.id).eq('status', 'pending'),
        // New query for confirmed volunteers
        supabase.from('ngo_enrollments').select(`
          id, user_id, ngo_id, status, created_at, updated_at,
          users(id, full_name, email)
        `).eq('ngo_id', ngoProfile.id).eq('status', 'confirmed').order('created_at', { ascending: false })
      ]);

      const ngoEvents = eventsResult.data || [];
      const eventsWithParticipants: EventWithParticipants[] = [];

      for (const event of ngoEvents) {
        const { data: confirmed } = await supabase.from('event_registrations').select(`
          id, user_id, users!inner(id, full_name, email)
        `).eq('event_id', event.id).eq('status', 'confirmed');

        eventsWithParticipants.push({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          image_url: event.image_url,
          slots_available: event.slots_available,
          participants: confirmed?.map(reg => ({
            id: reg.users.id,
            registration_id: reg.id,
            full_name: reg.users.full_name,
            email: reg.users.email,
            user_id: reg.user_id
          })) || []
        });
      }

      setEvents(eventsWithParticipants);
      // Updated setRequests to include confirmed volunteers
      setRequests({
        eventRegistrations: eventRegsResult.data || [],
        ngoEnrollments: ngoEnrollmentsResult.data || [],
        confirmedVolunteers: confirmedVolunteersResult.data || []
      });

    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, (payload) => {
        if (ngoId && payload.new && 'event_id' in payload.new) {
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ngo_enrollments' }, (payload) => {
        if (ngoId && payload.new && 'ngo_id' in payload.new && payload.new.ngo_id === ngoId) {
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        if (ngoId && payload.new && 'ngo_id' in payload.new && payload.new.ngo_id === ngoId) {
          fetchData();
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, ngoId]);

  const handleRequest = async (type: 'event' | 'ngo', id: string, action: 'approve' | 'reject') => {
    const table = type === 'event' ? 'event_registrations' : 'ngo_enrollments';
    const { error } = await supabase.from(table).update({ status: action === 'approve' ? 'confirmed' : 'rejected' }).eq('id', id);
    if (error) toast.error(`Failed to ${action} request`);
    else toast.success(`Request ${action}d successfully`);
    fetchData();
  };

  // New function to handle volunteer removal
  const handleVolunteerAction = async (volunteerId: string, volunteerName: string) => {
    try {
      const { error } = await supabase
        .from('ngo_enrollments')
        .update({ status: 'rejected' })
        .eq('id', volunteerId);

      if (error) throw error;

      toast.success(`${volunteerName} has been removed from your volunteers`);
      fetchData();
    } catch (error) {
      console.error('Error removing volunteer:', error);
      toast.error('Failed to remove volunteer');
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      newSet.has(eventId) ? newSet.delete(eventId) : newSet.add(eventId);
      return newSet;
    });
  };

  const removeParticipant = async (registrationId: string, participantName: string) => {
    setRemovingParticipant(registrationId);
    const { error } = await supabase.from('event_registrations').update({ status: 'rejected' }).eq('id', registrationId);
    if (error) toast.error('Failed to remove participant');
    else toast.success(`${participantName} removed`);
    setRemovingParticipant(null);
    fetchData();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rose-600" /></div>;

  if (!hasNgoProfile) {
    return (
      <RequireAuth role="ngo">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">NGO Dashboard</h1>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-rose-800">
            You don't have an NGO profile yet. Create one to access your dashboard.
          </div>
        </div>
      </RequireAuth>
    );
  }

  const renderActionButtons = (type: 'event' | 'ngo', id: string) => (
    <div className="flex gap-2.5">
      <button 
        onClick={() => handleRequest(type, id, 'approve')} 
        className="px-2.5 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors flex items-center"
      >
        <Check className="h-3.5 w-3.5 mr-1" />
        Approve
      </button>
      <button 
        onClick={() => handleRequest(type, id, 'reject')} 
        className="px-2.5 py-1.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded transition-colors flex items-center"
      >
        <X className="h-3.5 w-3.5 mr-1" />
        Reject
      </button>
    </div>
  );

  return (
    <RequireAuth role="ngo">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">NGO Dashboard</h1>
          <div className="flex border-b mb-6">
            {[
              { key: 'events', icon: Calendar, label: `My Events (${events.length})` },
              { key: 'myvolunteers', icon: Users, label: `My Volunteers (${requests.confirmedVolunteers.length})` },
              { key: 'registrations', icon: Check, label: `Event Applications (${requests.eventRegistrations.length})` },
              { key: 'volunteers', icon: Users, label: `Volunteer Applications (${requests.ngoEnrollments.length})` }
            ].map(tab => (
              <button key={tab.key} className={`px-4 py-2 font-medium ${currentTab === tab.key ? 'border-b-2 border-rose-600 text-rose-600' : 'text-gray-500'}`} onClick={() => setCurrentTab(tab.key as any)}>
                <tab.icon className="inline mr-2" /> {tab.label}
              </button>
            ))}
          </div>

            
        {currentTab === 'events' && (
          <div className="space-y-4">{events.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No events created yet</p>
            </div>
          ) : events.map(event => (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border">
              <div onClick={() => toggleEventExpansion(event.id)} className="p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <div className="text-gray-600 flex items-center mt-1 text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="text-gray-600 flex items-center text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </div>
                  </div>
                  {expandedEvents.has(event.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              {expandedEvents.has(event.id) && (
                <div className="bg-gray-50 p-4 border-t">
                  <p className="text-sm text-gray-700 mb-3">{event.description}</p>
                  <h4 className="text-sm font-medium mb-2">Confirmed Participants ({event.participants.length})</h4>
                  {event.participants.length === 0 ? 
                    <p className="text-gray-500 text-sm">No confirmed participants yet</p> :
                    <div className="space-y-2">
                      {event.participants.map(p => (
                        <div key={p.registration_id} className="flex justify-between items-center bg-white p-2 border rounded text-sm">
                          <div>
                            <span className="font-medium">{p.full_name}</span>
                            <span className="text-gray-500 ml-2">{p.email}</span>
                          </div>
                          <button 
                            onClick={() => removeParticipant(p.registration_id, p.full_name)} 
                            disabled={removingParticipant === p.registration_id} 
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                          >
                            {removingParticipant === p.registration_id ? 
                              <Loader2 className="h-3 w-3 animate-spin" /> : 
                              <UserMinus className="h-3 w-3" />
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              )}
            </div>
          ))}</div>
        )}

        {currentTab === 'registrations' && (
          <div className="space-y-3">{requests.eventRegistrations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Check className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending registrations</p>
            </div>
          ) : requests.eventRegistrations.map(reg => (
            <div key={reg.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{reg.events?.title || 'Unknown Event'}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Volunteer:</span> {reg.users?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Email:</span> {reg.users?.email || 'No email'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Applied: {formatDate(reg.created_at)}</p>
                </div>
                <div className="flex-shrink-0">
                  {renderActionButtons('event', reg.id)}
                </div>
              </div>
            </div>
          ))}</div>
        )}

        {currentTab === 'volunteers' && (
          <div className="space-y-3">{requests.ngoEnrollments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending applications</p>
            </div>
          ) : requests.ngoEnrollments.map(enroll => (
            <div key={enroll.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-rose-400">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{enroll.users?.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{enroll.users?.email || 'No email'}</p>
                  <p className="text-xs text-gray-500 mt-1">Applied: {formatDate(enroll.created_at)}</p>
                </div>
                <div className="flex-shrink-0">
                  {renderActionButtons('ngo', enroll.id)}
                </div>
              </div>
            </div>
          ))}</div>
        )}

        {/* New My Volunteers Tab */}
        {currentTab === 'myvolunteers' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Volunteers</h2>
              <div className="text-sm text-gray-500">
                {requests.confirmedVolunteers.length} active volunteer{requests.confirmedVolunteers.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {requests.confirmedVolunteers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active volunteers yet</p>
                <p className="text-sm text-gray-400 mt-2">Approved volunteers will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.confirmedVolunteers.map(volunteer => (
                  <div key={volunteer.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{volunteer.users?.full_name || 'Unknown'}</h3>
                            <p className="text-sm text-gray-600">{volunteer.users?.email || 'No email'}</p>
                            <div className="flex items-center mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active Volunteer
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                Joined: {formatDate(volunteer.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleVolunteerAction(volunteer.id, volunteer.users?.full_name || 'Unknown')}
                          className="px-2.5 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center"
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1" />
                          Remove
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
