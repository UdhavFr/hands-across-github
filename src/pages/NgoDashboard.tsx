import { useEffect, useState, useCallback } from 'react';
import { BulkCertificateGenerator } from '../components/BulkCertificateGenerator';
import { CertificateGeneratorUI } from '../components/CertificateGeneratorUI';
import { Loader2, Users, Calendar, Check, X, ChevronDown, ChevronUp, MapPin, Clock, UserMinus, TrendingUp } from 'lucide-react';
import { Clipboard as ClipboardIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tables } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { RequireAuth } from '../components/RequireAuth';
import { NgoAnalytics } from '../components/NgoAnalytics';
import { VolunteerStatusDonut } from '../components/VolunteerStatusDonut';
import { EventParticipationBarChart } from '../components/EventCategoryBarChart';
import { ActivityFeed } from '../components/AvtivityFeed';
import { TopVolunteersTable } from '../components/TopVolunteersTable';
import { EventMetricsTable } from '../components/EventMetricsTable';
import { RealtimeStatus } from '../components/RealtimeStatus';

// Type definitions for joined data
type EventRegistrationWithDetails = Tables<'event_registrations'> & {
  events: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    ngo_id: string;
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

// Type guard helper for safe property access

export function NgoDashboard() {
  // ...existing code...

  // Debug authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Current authenticated user:', user);
      console.log('User ID:', user?.id);
      console.log('User type:', user?.user_metadata?.user_type);
    };
    checkAuth();
  }, []);

  // State for certificate generator modal (must be inside the component)
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<{
    eventRegistrations: EventRegistrationWithDetails[];
    ngoEnrollments: NgoEnrollmentWithDetails[];
    confirmedVolunteers: NgoEnrollmentWithDetails[];
  }>({ eventRegistrations: [], ngoEnrollments: [], confirmedVolunteers: [] });
  const [events, setEvents] = useState<
    {
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
    }[]
  >([]);
  const [currentTab, setCurrentTab] = useState<'events' | 'registrations' | 'volunteers' | 'myvolunteers' | 'certificates' | 'analytics'>('events');
  const [hasNgoProfile, setHasNgoProfile] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);
  const [ngoId, setNgoId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Tab definitions for dashboard navigation (must be after state)
  const dashboardTabs = [
  { key: 'events', icon: Calendar, label: `My Events (${events.length})` },
  { key: 'myvolunteers', icon: Users, label: `My Volunteers (${requests.confirmedVolunteers.length})` },
  { key: 'registrations', icon: Check, label: `Pending Registrations (${requests.eventRegistrations.length})` },
  { key: 'volunteers', icon: Users, label: `Volunteer Applications (${requests.eventRegistrations.length})` },
  { key: 'certificates', icon: ClipboardIcon, label: 'Certificates' },
  { key: 'analytics', icon: TrendingUp, label: 'Analytics' }
  ];

  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid';
    return d.toLocaleDateString();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ngoProfile } = await supabase
        .from('ngo_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!ngoProfile) {
        setHasNgoProfile(false);
        setRequests({ eventRegistrations: [], ngoEnrollments: [], confirmedVolunteers: [] });
        setEvents([]);
        setNgoId(null);
        return;
      }

      setHasNgoProfile(true);
      setNgoId(ngoProfile.id);

      const [
        eventsRes,
        regRes,
        enrollRes,
        confirmedVolRes,
      ] = await Promise.all([
        supabase.from('events').select('*').eq('ngo_id', ngoProfile.id).order('date'),
        supabase.from('event_registrations')
          .select(`
            id, user_id, event_id, status, created_at, updated_at,
            events!inner(id, title, description, date, location, ngo_id),
            users(id, full_name, email)
          `)
          .eq('status', 'pending')
          .eq('events.ngo_id', ngoProfile.id),
        supabase.from('ngo_enrollments')
          .select(`id, user_id, ngo_id, status, created_at, updated_at, users(id, full_name, email)`)
          .eq('ngo_id', ngoProfile.id)
          .eq('status', 'pending'),
        supabase.from('ngo_enrollments')
          .select(`id, user_id, ngo_id, status, created_at, updated_at, users(id, full_name, email)`)
          .eq('ngo_id', ngoProfile.id)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false }),
      ]);

      // Build events with participants
      const eventList = eventsRes.data ?? [];
      const processedEvents: {
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
      }[] = [];
      for (const event of eventList) {
        const { data: participants } = await supabase
          .from('event_registrations')
          .select(`id, user_id, users!inner(id, full_name, email)`)
          .eq('event_id', event.id)
          .eq('status', 'confirmed');

        processedEvents.push({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          image_url: event.image_url,
          slots_available: event.slots_available,
          participants: participants?.map(p => ({
            id: p.users.id,
            registration_id: p.id,
            full_name: p.users.full_name,
            email: p.users.email,
            user_id: p.user_id,
          })) ?? [],
        });
      }

      setEvents(processedEvents);
      setRequests({
        eventRegistrations: (regRes.data as EventRegistrationWithDetails[]) ?? [],
        ngoEnrollments: (enrollRes.data as NgoEnrollmentWithDetails[]) ?? [],
        confirmedVolunteers: (confirmedVolRes.data as NgoEnrollmentWithDetails[]) ?? [],
      });
      setLastUpdate(Date.now());
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(es => {
      const newSet = new Set(es);
      if (newSet.has(eventId)) newSet.delete(eventId);
      else newSet.add(eventId);
      return newSet;
    });
  };

  const removeParticipant = async (registrationId: string, participantName: string) => {
    setRemovingParticipant(registrationId);
    const { error } = await supabase.from('event_registrations').update({ status: 'rejected' }).eq('id', registrationId);
    if (error) toast.error('Failed to remove participant');
    else {
      toast.success(`${participantName} removed`);
      fetchData();
    }
    setRemovingParticipant(null);
  };

  const handleAction = async (table: 'event_registrations' | 'ngo_enrollments', id: string, action: 'approve' | 'reject') => {
    const { error } = await supabase.from(table).update({ status: action === 'approve' ? 'confirmed' : 'rejected' }).eq('id', id);
    if (error) toast.error(`Failed to ${action} request`);
    else {
      toast.success(`Request ${action}d successfully`);
      fetchData();
    }
  };

  const handleRemoveVolunteer = async (id: string, name: string) => {
    try {
      await supabase.from('ngo_enrollments').update({ status: 'rejected' }).eq('id', id);
      toast.success(`${name} has been removed`);
      fetchData();
    } catch {
      toast.error('Failed to remove volunteer');
    }
  };

  // Render action buttons for approve/reject
  const renderActionButtons = (type: 'event' | 'ngo', id: string) => {
    const table = type === 'event' ? 'event_registrations' : 'ngo_enrollments';
    return (
      <div className="flex space-x-2">
        <button
          onClick={() => handleAction(table, id, 'approve')}
          className="p-2 text-green-600 hover:bg-green-50 rounded"
          title="Approve"
        >
          <Check className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleAction(table, id, 'reject')}
          className="p-2 text-red-600 hover:bg-red-50 rounded"
          title="Reject"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );

  if (!hasNgoProfile)
    return (
      <RequireAuth role="ngo">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">NGO Dashboard</h1>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-rose-800">
            You don't have an NGO profile yet. Create one to access the dashboard.
          </div>
        </div>
      </RequireAuth>
    );

  return (
    <RequireAuth role="ngo">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">NGO Dashboard</h1>
          <RealtimeStatus />
        </div>

        <div className="flex border-b mb-6 space-x-4">
          {dashboardTabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              className={`px-4 py-2 font-medium ${currentTab === key ? 'border-b-2 border-rose-600 text-rose-600' : 'text-gray-500'}`}
              onClick={() => setCurrentTab(key as any)}
            >
              {Icon ? <Icon className="inline mr-2" /> : null} {label}
            </button>
          ))}
        </div>
        {currentTab === 'certificates' && (
          <div className="space-y-8">
            <h2 className="text-xl font-semibold">Certificate Generator</h2>
            {/* Event selection dropdown */}
            <div className="mb-4">
              <label className="block font-medium mb-1">Select Event</label>
              <select
                className="border rounded px-3 py-2"
                value={selectedEvent?.id || events[0]?.id || ''}
                onChange={e => {
                  const ev = events.find(ev => ev.id === e.target.value);
                  setSelectedEvent(ev);
                }}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({new Date(ev.date).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
            {/* Certificate Generator UI for Admins */}
            {events.length > 0 && (
              <CertificateGeneratorUI
                event={selectedEvent || events[0]}
                participants={((selectedEvent || events[0]).participants || []).map((p: any) => ({
                  id: p.id,
                  name: p.full_name,
                  email: p.email || ''
                }))}
                ngo={hasNgoProfile ? { name: ngoId || '' } : undefined}
              />
            )}
          </div>
        )}

        {currentTab === 'events' && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No events yet</p>
              </div>
            ) : (
              events.map(event => (
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
                      {event.participants.length === 0 ? (
                        <p className="text-gray-500 text-sm">No confirmed participants</p>
                      ) : (
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
                                {removingParticipant === p.registration_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Certificate generation button is now only in the Certificates tab */}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        {/* Certificate Generator Modal for NGO Admin */}
        {showBulkGenerator && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
              <BulkCertificateGenerator
                event={selectedEvent}
                ngo={{ name: 'NGO' }}
                participants={selectedEvent.participants || []}
                onClose={() => setShowBulkGenerator(false)}
              />
            </div>
          </div>
        )}

        {currentTab === 'registrations' && (
          <div className="space-y-3">
            {requests.eventRegistrations.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Check className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No registrations pending</p>
              </div>
            ) : (
              requests.eventRegistrations.map(reg => (
                <div key={reg.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-rose-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{reg.events?.title ?? 'Unknown Event'}</h3>
                      <p className="text-sm text-gray-600">Volunteer: {reg.users?.full_name ?? 'Unknown'}</p>
                      <p className="text-sm text-gray-600">Email: {reg.users?.email ?? 'No email'}</p>
                      <p className="text-xs text-gray-500">Applied: {formatDate(reg.created_at)}</p>
                    </div>
                    <div>{renderActionButtons('event', reg.id)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {currentTab === 'volunteers' && (
          <div className="space-y-3">
            {requests.ngoEnrollments.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No volunteer applications</p>
              </div>
            ) : (
              requests.ngoEnrollments.map(enroll => (
                <div key={enroll.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-rose-400">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{enroll.users?.full_name ?? 'Unknown'}</h3>
                      <p className="text-sm text-gray-600">{enroll.users?.email ?? 'No email'}</p>
                      <p className="text-xs text-gray-500">Applied: {formatDate(enroll.created_at)}</p>
                    </div>
                    <div>{renderActionButtons('ngo', enroll.id)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {currentTab === 'myvolunteers' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Volunteers</h2>
              <div className="text-sm text-gray-500">{requests.confirmedVolunteers.length} active volunteer{requests.confirmedVolunteers.length !== 1 ? 's' : ''}</div>
            </div>
            {requests.confirmedVolunteers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active volunteers</p>
                <p className="text-sm text-gray-400">Approved volunteers will appear here</p>
              </div>
            ) : (
              requests.confirmedVolunteers.map(vol => (
                <div key={vol.id} className="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-green-500">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full bg-green-100 p-2 flex items-center justify-center">
                        <Users className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{vol.users?.full_name ?? 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{vol.users?.email ?? 'No email'}</p>
                        <p className="text-xs text-gray-500">Joined: {formatDate(vol.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveVolunteer(vol.id, vol.users?.full_name ?? 'Unknown')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <UserMinus />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {currentTab === 'analytics' && ngoId && (
          <div className="space-y-6">
            <NgoAnalytics ngoId={ngoId} key={`analytics-${lastUpdate}`} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <EventMetricsTable ngoId={ngoId} key={`events-table-${lastUpdate}`} />
                <EventParticipationBarChart ngoId={ngoId} key={`chart-${lastUpdate}`} />
              </div>
              <div className="space-y-6">
                <VolunteerStatusDonut ngoId={ngoId} key={`donut-${lastUpdate}`} />
                <ActivityFeed ngoId={ngoId} key={`feed-${lastUpdate}`} />
                <TopVolunteersTable ngoId={ngoId} key={`volunteers-${lastUpdate}`} />
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
