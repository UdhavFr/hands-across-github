
// components/RequireAuth.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { AppUser } from '../types';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children, role }: { 
  children: JSX.Element;
  role?: 'volunteer' | 'ngo';
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser ? transformUser(authUser) : null);
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const transformUser = (supabaseUser: any): AppUser => ({
    id: supabaseUser.id,
    email: supabaseUser.email!,
    full_name: supabaseUser.user_metadata?.full_name || '',
    user_type: supabaseUser.user_metadata?.user_type || 'volunteer',
    created_at: supabaseUser.created_at
  });

  if (loading) {
    return <div className="flex justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
    </div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role && user.user_type !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
