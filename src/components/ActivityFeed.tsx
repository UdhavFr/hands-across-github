import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Calendar, Star, UserCheck, Clock, Users } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'volunteer_approved' | 'event_registration' | 'event_completion' | 'milestone';
  title: string;
  description: string;
  user_name: string;
  user_avatar?: string;
  event_name?: string;
  timestamp: string;
  ngo_id: string;
}

interface Enrollment {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  status: string;
  ngo_id: string;
  users: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Registration {
  id: string;
  created_at: string;
  status: string;
  users: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  events: {
    id: string;
    title: string;
    ngo_id: string;
  };
}

export function ActivityFeed({ ngoId }: { ngoId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Transform db data to ActivityItem - memoized for stable reference
  const createActivityFromEnrollment = useCallback((enrollment: Enrollment, type: 'approved' | 'applied'): ActivityItem => {
    return {
      id: `enrollment-${enrollment.id}`,
      type: type === 'approved' ? 'volunteer_approved' : 'event_registration',
      title: type === 'approved' ? 'New Volunteer Approved' : 'Volunteer Application',
      description: type === 'approved'
        ? `${enrollment.users?.full_name || 'Someone'} joined as a volunteer`
        : `${enrollment.users?.full_name || 'Someone'} applied to volunteer`,
      user_name: enrollment.users?.full_name || 'Unknown User',
      user_avatar: enrollment.users?.avatar_url || undefined,
      timestamp: enrollment.created_at || enrollment.updated_at || new Date().toISOString(),
      ngo_id: enrollment.ngo_id,
    };
  }, []);

  const createActivityFromRegistration = useCallback((registration: any): ActivityItem => {
    return {
      id: `registration-${registration.id}`,
      type: 'event_registration',
      title: 'Event Registration',
      description: `${registration.users?.full_name || 'Someone'} registered for ${registration.events?.title || 'an event'}`,
      user_name: registration.users?.full_name || 'Unknown User',
      user_avatar: registration.users?.avatar_url,
      event_name: registration.events?.title,
      timestamp: registration.created_at,
      ngo_id: registration.events?.ngo_id,
    };
  }, []);

  // Fetch initial activities
  const fetchInitialActivities = useCallback(async () => {
    if (!ngoId) return;

    setLoading(true);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const { data: approvals } = await supabase
        .from('ngo_enrollments')
        .select(`
          id, created_at, updated_at, status, ngo_id,
          users(id, full_name, avatar_url)
        `)
        .eq('ngo_id', ngoId)
        .eq('status', 'confirmed')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(20);

      const { data: registrations } = await supabase
        .from('event_registrations')
        .select(`
          id, created_at, status,
          users(id, full_name, avatar_url),
          events!inner(id, title, ngo_id)
        `)
        .eq('events.ngo_id', ngoId)
        .eq('status', 'confirmed')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      const allActivities: ActivityItem[] = [];

      if (approvals) {
        approvals.forEach(approval => {
          allActivities.push(createActivityFromEnrollment(approval, 'approved'));
        });
      }

      if (registrations) {
        registrations.forEach(registration => {
          allActivities.push(createActivityFromRegistration(registration));
        });
      }

      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(allActivities.slice(0, 30));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [ngoId, createActivityFromEnrollment, createActivityFromRegistration]);

  // Setup realtime subscriptions
  useEffect(() => {
    fetchInitialActivities();

    if (!ngoId) return;

    const channel = supabase
      .channel(`activity-feed-${ngoId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ngo_enrollments',
          filter: `ngo_id=eq.${ngoId}`,
        },
        async (payload) => {
          if (payload.new?.status === 'confirmed') {
            const { data: enrollment } = await supabase
              .from('ngo_enrollments')
              .select(`
                id, created_at, updated_at, status, ngo_id,
                users(id, full_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (enrollment) {
              const newActivity = createActivityFromEnrollment(enrollment, 'approved');
              setActivities(prev => [newActivity, ...prev].slice(0, 30));
            }
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_registrations',
        },
        async (payload) => {
          if (payload.new?.status === 'confirmed') {
            const { data: registration } = await supabase
              .from('event_registrations')
              .select(`
                id, created_at, status,
                users(id, full_name, avatar_url),
                events!inner(id, title, ngo_id)
              `)
              .eq('id', payload.new.id)
              .eq('events.ngo_id', ngoId)
              .single();

            if (registration) {
              const newActivity = createActivityFromRegistration(registration);
              setActivities(prev => [newActivity, ...prev].slice(0, 30));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ngoId, fetchInitialActivities, createActivityFromEnrollment, createActivityFromRegistration]);

  // Icons for activity types
  const getActivityIcon = (type: ActivityItem['type']) => {
    const baseClasses = "w-10 h-10 rounded-full p-2 text-white flex items-center justify-center shadow-md";
    
    switch (type) {
      case 'volunteer_approved':
        return <div className={`${baseClasses} bg-rose-600`}><UserCheck className="w-6 h-6" /></div>;
      case 'event_registration':
        return <div className={`${baseClasses} bg-rose-500`}><Calendar className="w-6 h-6" /></div>;
      case 'event_completion':
        return <div className={`${baseClasses} bg-rose-700`}><Check className="w-6 h-6" /></div>;
      case 'milestone':
        return <div className={`${baseClasses} bg-amber-500`}><Star className="w-6 h-6" /></div>;
      default:
        return <div className={`${baseClasses} bg-gray-400`}><Users className="w-6 h-6" /></div>;
    }
  };

  // Format timestamps into relative time like "5m ago"
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-rose-600">
          <Clock className="w-5 h-5 mr-2" />
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-h-[24rem] overflow-y-auto">
      <h3 className="text-xl font-semibold mb-6 flex items-center text-rose-600">
        <Clock className="w-6 h-6 mr-3" />
        Recent Activities
      </h3>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-400 space-y-2 py-20">
          <Users className="w-14 h-14" />
          <p>No recent activity yet</p>
          <p className="text-xs text-gray-400">Activities you’ll see here will update in real-time.</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex space-x-4 p-3 rounded-lg hover:bg-rose-50 transition-colors cursor-default"
            role="listitem"
            aria-label={`${activity.title}: ${activity.description}`}
          >
            {getActivityIcon(activity.type)}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
              <p className="text-sm text-gray-700 mt-1 truncate">{activity.description}</p>
              {activity.event_name && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full select-none">
                  {activity.event_name}
                </span>
              )}
              <p className="text-xs text-gray-400 mt-1 select-none">{formatTimeAgo(activity.timestamp)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
