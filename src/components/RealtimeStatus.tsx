// components/RealtimeStatus.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const channel = supabase.channel('connection-status');
    
    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={`flex items-center text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
      {isConnected ? <Wifi className="w-4 h-4 mr-1" /> : <WifiOff className="w-4 h-4 mr-1" />}
      <span>{isConnected ? 'Live' : 'Disconnected'}</span>
    </div>
  );
}
