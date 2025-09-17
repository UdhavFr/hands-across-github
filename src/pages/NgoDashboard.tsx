import { useEffect, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import {
  Loader2, Users, Calendar, Check, X, ChevronDown, ChevronUp, MapPin, Clock, UserMinus, TrendingUp, User as UserIcon, Edit3
} from 'lucide-react';
import { Clipboard as ClipboardIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tables } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { RequireAuth } from '../components/RequireAuth';
import { ActivityFeed } from '../components/ActivityFeed';
import { TopVolunteersTable } from '../components/TopVolunteersTable';
import { EventMetricsTable } from '../components/EventMetricsTable';
import { RealtimeStatus } from '../components/RealtimeStatus';
import { NgoProfileForm } from '../components/NgoProfileForm';
import { EventForm } from '../components/EventForm';

// Loading spinner for lazy-loaded components
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-600"></div>
  </div>
);

// Lazy load heavy components
const CertificateGeneratorUI = lazy(() => import('../components/CertificateGeneratorUI'));
const BulkCertificateGenerator = lazy(() => import('../components/BulkCertificateGenerator'));
const NgoAnalytics = lazy(() => import('../components/NgoAnalytics'));
const VolunteerStatusDonut = lazy(() => import('../components/VolunteerStatusDonut'));
const EventParticipationBarChart = lazy(() => import('../components/EventCategoryBarChart'));
const ProfileTab = lazy(() => import('../components/ProfileTab'));

// Types for joined results
type EventRegistrationWithDetails = Tables<'event_registrations'> & {
  events?: {
    id: string; title: string; description: string; date: string; location: string; ngo_id: string;
  };
  users?: { id: string; full_name: string; email: string | null; };
};

type NgoEnrollmentWithDetails = Tables<'ngo_enrollments'> & {
  users?: { id: string; full_name: string; email: string | null; };
};

function NgoDashboard() {
  // State
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [templateConfig, setTemplateConfig] = useState<{
    backdropDataUrl: string;
    nameBoxPx: { x: number; y: number; width: number; height: number };
    nameBoxMm?: { xMm: number; yMm: number; widthMm: number; heightMm: number };
    canvasPxSize: { widthPx: number; heightPx: number };
  } | null>(null);
  const [requests, setRequests] = useState<{
    eventRegistrations: EventRegistrationWithDetails[];
    ngoEnrollments: NgoEnrollmentWithDetails[];
    confirmedVolunteers: NgoEnrollmentWithDetails[];
  }>({ eventRegistrations: [], ngoEnrollments: [], confirmedVolunteers: [] });

  const [events, setEvents] = useState<Array<{
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
  }>>([]);

  const [currentTab, setCurrentTab] = useState<'events' | 'registrations' | 'volunteers' | 'myvolunteers' | 'certificates' | 'analytics' | 'profile'>('events');
  const [hasNgoProfile, setHasNgoProfile] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);
  const [ngoId, setNgoId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showEventForm, setShowEventForm] = useState<{ mode: 'create' | 'edit'; event: any } | null>(null);

  // Format date utility
  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid';
    return d.toLocaleDateString();
  }, []);

  // Fetch data (clean, sequential, robust)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: ngoProfile, error: ngoError } = await supabase
        .from('ngo_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ngoError || !ngoProfile) {
        setHasNgoProfile(false);
        setRequests({ eventRegistrations: [], ngoEnrollments: [], confirmedVolunteers: [] });
        setEvents([]);
        setNgoId(null);
        setLoading(false);
        return;
      }

      setHasNgoProfile(true);
      setNgoId(ngoProfile.id);

      // 1) fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('ngo_id', ngoProfile.id)
        .order('date');

      if (eventsError) {
        throw eventsError;
      }

      const eventList = eventsData ?? [];

      // 2) fetch pending registrations only if we have event ids
      const eventIds = eventList.map((e: any) => e.id);
      let regResData: EventRegistrationWithDetails[] = [];
      if (eventIds.length > 0) {
        const { data: regData, error: regError } = await supabase
          .from('event_registrations')
          .select(`
            id, user_id, event_id, status, created_at, updated_at,
            events!event_registrations_event_id_fkey(id, title, description, date, location, ngo_id),
            users(id, full_name, email)
          `)
          .eq('status', 'pending')
          .in('event_id', eventIds);

        if (regError) throw regError;
        regResData = regData ?? [];
      }

      // 3) pending enrollments
      const { data: enrollData, error: enrollError } = await supabase
        .from('ngo_enrollments')
        .select(`id, user_id, ngo_id, status, created_at, updated_at, users(id, full_name, email)`)
        .eq('ngo_id', ngoProfile.id)
        .eq('status', 'pending');

      if (enrollError) throw enrollError;

      // 4) confirmed volunteers
      const { data: confirmedData, error: confirmedError } = await supabase
        .from('ngo_enrollments')
        .select(`id, user_id, ngo_id, status, created_at, updated_at, users(id, full_name, email)`)
        .eq('ngo_id', ngoProfile.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (confirmedError) throw confirmedError;

      // 5) build processed events with confirmed participants for each event
      const processedEvents: typeof events = [];
      for (const ev of eventList) {
        const { data: participantsData } = await supabase
          .from('event_registrations')
          .select(`id, user_id, users!inner(id, full_name, email)`)
          .eq('event_id', ev.id)
          .eq('status', 'confirmed');

        const participants = (participantsData ?? []).map((p: any) => ({
          id: p?.users?.id ?? p.user_id ?? '',
          registration_id: p?.id ?? '',
          full_name: p?.users?.full_name ?? 'Unknown',
          email: p?.users?.email ?? null,
          user_id: p?.user_id ?? '',
        }));

        processedEvents.push({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          date: ev.date,
          location: ev.location,
          image_url: ev.image_url ?? null,
          slots_available: ev.slots_available ?? 0,
          participants,
        });
      }

      setEvents(processedEvents);
      setRequests({
        eventRegistrations: regResData ?? [],
        ngoEnrollments: enrollData ?? [],
        confirmedVolunteers: confirmedData ?? [],
      });

      setLastUpdate(Date.now());
    } catch (err) {
      console.error('fetchData error', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle profile creation success
  const handleProfileSuccess = useCallback(() => {
    toast.success('NGO profile created successfully!');
    setCurrentTab('profile');
    // Refetch data to update hasNgoProfile state
    fetchData();
  }, [fetchData]);

  // Initialize selectedEvent when events load or when selectedEvent is missing from events
  useEffect(() => {
    if (events.length === 0) {
      setSelectedEvent(null);
      return;
    }
    if (!selectedEvent || !events.some(e => e.id === selectedEvent?.id)) {
      setSelectedEvent(events[0]);
    }
  }, [events, selectedEvent]);

  // Memoize dashboard tabs (avoid recreating functions/arrays every render)
  const dashboardTabs = useMemo(() => ([
    { key: 'events', icon: Calendar, label: `My Events (${events.length})` },
    { key: 'profile', icon: UserIcon, label: 'Organization Profile' },
    { key: 'myvolunteers', icon: Users, label: `My Volunteers (${requests.confirmedVolunteers.length})` },
    { key: 'registrations', icon: Check, label: `Event Applications (${requests.eventRegistrations.length})` },
    { key: 'volunteers', icon: Users, label: `Volunteer Applications (${requests.ngoEnrollments.length})` },
    { key: 'analytics', icon: TrendingUp, label: 'Analytics' },
    { key: 'certificates', icon: ClipboardIcon, label: 'Certificates' },
  ]), [events.length, requests.confirmedVolunteers.length, requests.eventRegistrations.length, requests.ngoEnrollments.length]);

  // Event expansion toggle
  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEvents(es => {
      const newSet = new Set(es);
      if (newSet.has(eventId)) newSet.delete(eventId);
      else newSet.add(eventId);
      return newSet;
    });
  }, []);

  // Participant removal
  const removeParticipant = useCallback(async (registrationId: string, participantName: string) => {
    setRemovingParticipant(registrationId);
    try {
      const { error } = await supabase.from('event_registrations').update({ status: 'rejected' }).eq('id', registrationId);
      if (error) throw error;
      toast.success(`${participantName} removed`);
      await fetchData();
    } catch {
      toast.error('Failed to remove participant');
    } finally {
      setRemovingParticipant(null);
    }
  }, [fetchData]);

  const handleAction = useCallback(async (table: 'event_registrations' | 'ngo_enrollments', id: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase.from(table).update({ status: action === 'approve' ? 'confirmed' : 'rejected' }).eq('id', id);
      if (error) throw error;
      toast.success(`Request ${action}d successfully`);
      await fetchData();
    } catch {
      toast.error(`Failed to ${action} request`);
    }
  }, [fetchData]);

  const handleRemoveVolunteer = useCallback(async (id: string, name: string) => {
    try {
      const { error } = await supabase.from('ngo_enrollments').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      toast.success(`${name} has been removed`);
      await fetchData();
    } catch {
      toast.error('Failed to remove volunteer');
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render action buttons
  const renderActionButtons = useCallback((type: 'event' | 'ngo', id: string) => {
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
  }, [handleAction]);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  // No NGO profile
  if (!hasNgoProfile) {
    return (
      <RequireAuth role="ngo">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Welcome to NGO Dashboard</h1>
            <p className="text-muted-foreground">
              Create your organization profile to start managing events and connecting with volunteers.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <NgoProfileForm
              mode="create"
              onSuccess={handleProfileSuccess}
            />
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth role="ngo">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">NGO Dashboard</h1>
          <RealtimeStatus />
        </div>

        <div className="border-b mb-6 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-2 pb-px">
            {dashboardTabs.map(({ key, icon: Icon, label }) => {
              // Create mobile-friendly abbreviated labels
              const mobileLabel = label
                .replace('My Events', 'Events')
                .replace('Organization Profile', 'Profile')
                .replace('My Volunteers', 'Volunteers')
                .replace('Event Applications', 'Event Apps')
                .replace('Volunteer Applications', 'Vol Apps');
              
              return (
                <button
                  key={key}
                  className={`
                    flex-shrink-0 flex items-center px-3 sm:px-4 py-2 
                    text-xs sm:text-sm font-medium transition-colors
                    min-w-[80px] sm:min-w-[120px] justify-center
                    ${currentTab === key 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                  onClick={() => setCurrentTab(key as any)}
                >
                  {Icon && <Icon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />}
                  <span className="hidden sm:inline whitespace-nowrap">{label}</span>
                  <span className="sm:hidden whitespace-nowrap">{mobileLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {currentTab === 'certificates' && (
          <div className="space-y-8">
            <h2 className="text-xl font-semibold">Certificate Generator</h2>

            <div className="mb-4">
              <label className="block font-medium mb-1">Select Event</label>
              <select
                className="border rounded px-3 py-2 w-full md:w-96"
                value={selectedEvent?.id ?? (events[0]?.id ?? '')}
                onChange={e => {
                  const ev = events.find(ev => ev.id === e.target.value) ?? null;
                  setSelectedEvent(ev);
                }}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <Suspense fallback={<ComponentLoader />}>
                <CertificateGeneratorUI
                  event={selectedEvent}
                  participants={(selectedEvent.participants || []).map((p: any) => ({
                    id: p.id,
                    name: p.full_name,
                    email: p.email ?? ''
                  }))}
                  ngo={hasNgoProfile ? { name: ngoId ?? '' } : undefined}
                  onConfirmPlacement={(config) => {
                    setTemplateConfig({
                      backdropDataUrl: config.backdropDataUrl,
                      nameBoxPx: config.nameBoxPx,
                      nameBoxMm: config.nameBoxMm,
                      canvasPxSize: config.canvasPxSize
                    });
                    setShowBulkGenerator(true);
                  }}
                />
              </Suspense>
            )}
          </div>
        )}

        {currentTab === 'events' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Events</h2>
              <button
                onClick={() => setShowEventForm({ mode: 'create', event: null })}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Create Event
              </button>
            </div>
            
            {events.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No events yet</p>
                <p className="text-sm text-gray-400 mt-2">Create your first event to get started</p>
              </div>
            ) : (
              events.map(event => (
                <div key={event.id} className="bg-white rounded-lg shadow-sm border">
                    <div onClick={() => toggleEventExpansion(event.id)} className="p-4 cursor-pointer hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowEventForm({ mode: 'edit', event });
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit Event"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
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
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {showBulkGenerator && selectedEvent && templateConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
              <Suspense fallback={<ComponentLoader />}>
                <BulkCertificateGenerator
                  event={selectedEvent}
                  ngo={{ name: 'NGO' }}
                  participants={selectedEvent.participants || []}
                  template={templateConfig}
                  onClose={() => setShowBulkGenerator(false)}
                />
              </Suspense>
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

        {currentTab === 'profile' && ngoId && (
          <Suspense fallback={<ComponentLoader />}>
            <ProfileTab ngoId={ngoId} />
          </Suspense>
        )}

        {currentTab === 'analytics' && ngoId && (
          <div className="space-y-6">
            <Suspense fallback={<ComponentLoader />}>
              <NgoAnalytics ngoId={ngoId} key={`analytics-${lastUpdate}`} />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <EventMetricsTable ngoId={ngoId} key={`events-table-${lastUpdate}`} />
                <Suspense fallback={<ComponentLoader />}>
                  <EventParticipationBarChart ngoId={ngoId} key={`chart-${lastUpdate}`} />
                </Suspense>
              </div>
              <div className="space-y-6">
                <Suspense fallback={<ComponentLoader />}>
                  <VolunteerStatusDonut ngoId={ngoId} key={`donut-${lastUpdate}`} />
                </Suspense>
                <ActivityFeed ngoId={ngoId} key={`feed-${lastUpdate}`} />
                <TopVolunteersTable ngoId={ngoId} key={`volunteers-${lastUpdate}`} />
              </div>
            </div>
          </div>
        )}

        {/* Event Form Modal */}
        {showEventForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto w-full mx-4">
              <EventForm
                mode={showEventForm.mode}
                existingEvent={showEventForm.event}
                ngoId={ngoId!}
                userId={ngoId!}
                onSuccess={() => {
                  toast.success(`Event ${showEventForm.mode === 'create' ? 'created' : 'updated'} successfully!`);
                  setShowEventForm(null);
                  fetchData();
                }}
                onCancel={() => setShowEventForm(null)}
              />
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

export default NgoDashboard;
