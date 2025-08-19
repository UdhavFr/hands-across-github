import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ChevronUp, ChevronDown, Users, Loader2 } from 'lucide-react';

interface VolunteerData {
  id: string;
  name: string;
  totalHours: number;
  eventsParticipated: number;
  joinDate: string | null;  // allow null for safety
  email: string;
}

export function TopVolunteersTable({ ngoId }: { ngoId: string }) {
  const [volunteers, setVolunteers] = useState<VolunteerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof VolunteerData>('eventsParticipated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchVolunteers = useCallback(async () => {
    if (!ngoId) return;
    setLoading(true);

    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('ngo_id', ngoId);

      const eventIds = eventsData?.map(e => e.id) || [];

      const { data: enrollments, error } = await supabase
        .from('ngo_enrollments')
        .select(`
          id, created_at, user_id,
          users!inner(id, full_name, email)
        `)
        .eq('ngo_id', ngoId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const volunteerList: VolunteerData[] = [];

      for (const enrollment of enrollments || []) {
        const { count: eventCount } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', enrollment.user_id)
          .eq('status', 'confirmed')
          .in('event_id', eventIds);

        volunteerList.push({
          id: enrollment.id,
          name: enrollment.users.full_name,
          email: enrollment.users.email ?? 'N/A',
          totalHours: (eventCount ?? 0) * 4,
          eventsParticipated: eventCount ?? 0,
          joinDate: enrollment.created_at ?? null,
        });
      }

      setVolunteers(volunteerList);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    } finally {
      setLoading(false);
    }
  }, [ngoId]);

  useEffect(() => {
    fetchVolunteers();

    if (!ngoId) return;

    const channel = supabase.channel(`volunteers_table_${ngoId}`);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ngo_enrollments', filter: `ngo_id=eq.${ngoId}` },
        fetchVolunteers
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, fetchVolunteers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ngoId, fetchVolunteers]);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [volunteers, searchTerm]);

  const sortedVolunteers = useMemo(() => {
    const sorted = [...filteredVolunteers];

    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'joinDate') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      // Null or undefined safety
      aVal ??= sortField === 'joinDate' ? '' : 0;
      bVal ??= sortField === 'joinDate' ? '' : 0;

      if (sortDirection === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return sorted;
  }, [filteredVolunteers, sortField, sortDirection]);

  const toggleSort = (field: keyof VolunteerData) => {
    if (field === sortField) setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
  };

  const getSortIcon = (field: keyof VolunteerData) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top Volunteers</h2>
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin h-10 w-10 text-rose-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4 relative">
        <h2 className="text-xl font-semibold">Top Volunteers</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:outline-none"
            aria-label="Search volunteers"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[24rem]">
        <table className="min-w-full divide-y divide-gray-200 table-auto text-left">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {['name', 'email', 'totalHours', 'eventsParticipated', 'joinDate'].map((field) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field as keyof VolunteerData)}
                  className="cursor-pointer px-6 py-3 text-xs font-semibold text-gray-500 uppercase select-none hover:bg-gray-100"
                  aria-sort={field === sortField ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  role="columnheader"
                  tabIndex={0}
                >
                  <div className="flex items-center space-x-1 select-none">
                    <span>
                      {field === 'totalHours'
                        ? 'Total Hours'
                        : field === 'eventsParticipated'
                        ? 'Events'
                        : field === 'joinDate'
                        ? 'Join Date'
                        : field.charAt(0).toUpperCase() + field.slice(1)}
                    </span>
                    {getSortIcon(field as keyof VolunteerData)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedVolunteers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  <Users className="mx-auto mb-3 w-12 h-12" />
                  No volunteers found
                </td>
              </tr>
            ) : (
              sortedVolunteers.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 cursor-default">
                  <td className="px-6 py-3 whitespace-nowrap max-w-xs overflow-hidden truncate">{v.name}</td>
                  <td className="px-6 py-3 whitespace-nowrap max-w-xs overflow-hidden truncate">{v.email}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{v.totalHours}h</td>
                  <td className="px-6 py-3 whitespace-nowrap">{v.eventsParticipated}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{formatDate(v.joinDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
