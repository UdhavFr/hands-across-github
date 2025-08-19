import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ChevronUp, ChevronDown, Calendar } from 'lucide-react';

interface EventMetric {
  id: string;
  eventName: string;
  date: string;
  participants: number;
  fillRate: number;
  status: 'upcoming' | 'completed' | 'in-progress';
  slotsAvailable: number;
}

export function EventMetricsTable({ ngoId }: { ngoId: string }) {
  const [events, setEvents] = useState<EventMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof EventMetric>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchEventMetrics = useCallback(async () => {
    if (!ngoId) return;
    
    setLoading(true);
    try {
      // Get all events for this NGO
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date, slots_available')
        .eq('ngo_id', ngoId)
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;

      const eventMetrics: EventMetric[] = [];
      const now = new Date();

      for (const event of eventsData || []) {
        // Count confirmed participants
        const { count: participantCount } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'confirmed');

        const eventDate = new Date(event.date);
        const participants = participantCount || 0;
        const fillRate = event.slots_available > 0 ? (participants / event.slots_available) * 100 : 0;
        
        // Determine status based on date
        let status: 'upcoming' | 'completed' | 'in-progress' = 'upcoming';
        if (eventDate < now) {
          // Check if event was today (could be in-progress)
          const isToday = eventDate.toDateString() === now.toDateString();
          status = isToday ? 'in-progress' : 'completed';
        }

        eventMetrics.push({
          id: event.id,
          eventName: event.title,
          date: event.date,
          participants,
          fillRate: Math.round(fillRate),
          status,
          slotsAvailable: event.slots_available,
        });
      }

      setEvents(eventMetrics);
    } catch (error) {
      console.error('Error fetching event metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [ngoId]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchEventMetrics();

    if (!ngoId) return;

    const channel = supabase
      .channel(`events-table-${ngoId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events', filter: `ngo_id=eq.${ngoId}` },
        fetchEventMetrics
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_registrations' },
        fetchEventMetrics
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEventMetrics, ngoId]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events.filter(event =>
      event.eventName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [events, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof EventMetric) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-rose-100 text-rose-800';
      case 'in-progress':
        return 'bg-amber-100 text-amber-800';
      case 'upcoming':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSortIcon = (field: keyof EventMetric) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Event Metrics</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Event Metrics</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('eventName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Event</span>
                  {getSortIcon('eventName')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('participants')}
              >
                <div className="flex items-center space-x-1">
                  <span>Participants</span>
                  {getSortIcon('participants')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('fillRate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Fill Rate</span>
                  {getSortIcon('fillRate')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No events found</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(event.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.participants} / {event.slotsAvailable}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-rose-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(event.fillRate, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{event.fillRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
