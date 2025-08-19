import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Users, Calendar, CheckCircle } from 'lucide-react';

interface NgoAnalyticsProps {
  ngoId: string;
}

export function NgoAnalytics({ ngoId }: NgoAnalyticsProps) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalVolunteers: 0,
    totalRegistrations: 0,
    confirmedRegistrations: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('🔍 Fetching analytics for NGO ID:', ngoId);
        
        // First get all events for this NGO
        const { data: eventsData } = await supabase
          .from('events')
          .select('id')
          .eq('ngo_id', ngoId);
        
        const eventIds = eventsData?.map(e => e.id) || [];
        
        const [
          eventsRes,
          volunteersRes,
          registrationsRes,
          confirmedRes,
        ] = await Promise.all([
          supabase.from('events').select('id', { count: 'exact' }).eq('ngo_id', ngoId),
          supabase.from('ngo_enrollments').select('id', { count: 'exact' }).eq('ngo_id', ngoId).eq('status', 'confirmed'),
          eventIds.length > 0 
            ? supabase.from('event_registrations').select('id', { count: 'exact' }).in('event_id', eventIds)
            : Promise.resolve({ count: 0, error: null }),
          eventIds.length > 0 
            ? supabase.from('event_registrations').select('id', { count: 'exact' }).in('event_id', eventIds).eq('status', 'confirmed')
            : Promise.resolve({ count: 0, error: null }),
        ]);

        console.log('📊 Analytics results:', {
          events: eventsRes.count,
          volunteers: volunteersRes.count,
          registrations: registrationsRes.count,
          confirmed: confirmedRes.count,
          volunteerError: volunteersRes.error,
          eventIds: eventIds
        });

        setStats({
          totalEvents: eventsRes.count || 0,
          totalVolunteers: volunteersRes.count || 0,
          totalRegistrations: registrationsRes.count || 0,
          confirmedRegistrations: confirmedRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchStats();
  }, [ngoId]);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">Analytics Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-rose-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-rose-600">{stats.totalEvents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-rose-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Active Volunteers</p>
              <p className="text-2xl font-bold text-rose-600">{stats.totalVolunteers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-rose-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-rose-600">{stats.totalRegistrations}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-rose-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-rose-600">{stats.confirmedRegistrations}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
