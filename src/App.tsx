// src/App.tsx
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { EventsPage } from './pages/EventsPage';
import { NGOsPage } from './pages/NGOsPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { NgoDashboard } from './pages/NgoDashboard';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { RequireAuth } from './components/RequireAuth';

function App() {
  const [userType, setUserType] = useState<'volunteer' | 'ngo' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserType(user?.user_metadata?.user_type || null);
      setLoading(false);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserType(session?.user?.user_metadata?.user_type || null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 relative">
        <Toaster position="top-right" />
        <Header />
        
        <Routes>
          <Route 
            path="/" 
            element={
              <>
                <Hero />
                <EventsPage />
                <NGOsPage />
              </>
            } 
          />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/ngos" element={<NGOsPage />} />
          <Route 
            path="/auth/callback" 
            element={<AuthCallbackPage />} 
          />
          <Route 
            path="/ngo-dashboard" 
            element={
              <RequireAuth role="ngo">
                <NgoDashboard />
              </RequireAuth>
            } 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;