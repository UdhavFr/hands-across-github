import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Payload = {
  new?: Record<string, any>;
  old?: Record<string, any>;
};

function hasKey<T extends object>(obj: T | undefined, key: PropertyKey): obj is T & Record<PropertyKey, unknown> {
  return !!obj && typeof obj === 'object' && key in obj;
}

export function useRealtimeSubscriptions(ngoId: string, onDataChange: () => void) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!ngoId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`ngo-realtime-${ngoId}`);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `ngo_id=eq.${ngoId}` },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_registrations' },
        async (payload: Payload) => {
          if (payload.new && hasKey(payload.new, 'event_id')) {
            const { data } = await supabase
              .from('events')
              .select('ngo_id')
              .eq('id', payload.new['event_id'] as string)
              .single();
            if (data?.ngo_id === ngoId) onDataChange();
          } else if (payload.old && hasKey(payload.old, 'event_id')) {
            const { data } = await supabase
              .from('events')
              .select('ngo_id')
              .eq('id', payload.old['event_id'] as string)
              .single();
            if (data?.ngo_id === ngoId) onDataChange();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ngo_enrollments', filter: `ngo_id=eq.${ngoId}` },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => onDataChange()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [ngoId, onDataChange]);
}
