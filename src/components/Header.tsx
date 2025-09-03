
// src/components/Header.tsx
import { useState, useEffect } from 'react';
import { Menu, Heart, LogIn, User, Clipboard, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import { supabase } from '../lib/supabase';
import type { AppUser } from '../types';
import toast from 'react-hot-toast';

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          setUser(null);
          return;
        }

        const { data: publicUser, error: profileError } = await supabase
          .from('users')       // ← make sure this matches your actual table!
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) throw profileError;

        setUser({
          id: authUser.id,
          email: publicUser.email || authUser.email || '',
          full_name: publicUser.full_name || authUser.user_metadata?.full_name || '',
          user_type: publicUser.user_type || authUser.user_metadata?.user_type || 'volunteer',
          username: publicUser.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || '',
          created_at: publicUser.created_at || authUser.created_at
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // v2 onAuthStateChange returns { data: { subscription } }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    fetchUserData();
    return () => subscription.unsubscribe();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    try {
      console.log('Attempting sign out…');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      setUser(null);
      setShowMobileMenu(false);
      setShowUserMenu(false);
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-rose-600" aria-label="JoinHands logo" />
            <Link to="/" className="ml-2 text-2xl font-bold hover:text-rose-600 transition-colors" onClick={() => setShowMobileMenu(false)}>
              JoinHands
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/events" className={`hover:text-rose-600 transition-colors ${isActive('/events') ? 'text-rose-600 font-medium' : ''}`}>
              Events
            </Link>
            <Link to="/ngos" className={`hover:text-rose-600 transition-colors ${isActive('/ngos') ? 'text-rose-600 font-medium' : ''}`}>
              NGOs
            </Link>

            {user ? (
              <div className="flex items-center gap-4 user-menu-container">
                {user.user_type === 'ngo' && (
                  <Link to="/ngo-dashboard" className={`flex items-center hover:text-rose-600 transition-colors ${isActive('/ngo-dashboard') ? 'text-rose-600 font-medium' : ''}`}>
                    <Clipboard className="h-5 w-5 mr-1" /> Dashboard
                  </Link>
                )}
                                 <div className="relative">
                   <button onClick={() => setShowUserMenu(v => !v)} className="flex items-center space-x-1 hover:text-rose-600 transition-colors">
                     <span>{user.full_name || user.email?.split('@')[0]}</span>
                     <User className="h-5 w-5" />
                   </button>
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                        <Link 
                          to="/profile" 
                          className="block px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setShowUserMenu(false)}
                        >
                          View Profile
                        </Link>
                        <Link 
                          to="/settings" 
                          className="block px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Account Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 flex items-center transition-colors">
                <LogIn className="h-5 w-5 mr-2" /> Sign In
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden">
            <button className="p-2 hover:text-rose-600 transition-colors" onClick={() => setShowMobileMenu(!showMobileMenu)} aria-label="Toggle menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white shadow-lg">
          {/* … your mobile links … */}
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => { setShowAuthModal(false); setShowMobileMenu(false); }} />}
    </header>
  );
}
