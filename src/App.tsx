
// src/App.tsx

import { Helmet } from 'react-helmet';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { EventsPage } from './pages/EventsPage';
import { NGOsPage } from './pages/NGOsPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { NgoDashboard } from './pages/NgoDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { RequireAuth } from './components/RequireAuth';


function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await supabase.auth.getUser();
      setLoading(false);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Auth state changed
    });
    
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
    <>
      <Helmet>
        <title>JoinHands</title>
        <link
          rel="icon"
          href={`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>❤️</text></svg>`}
        />
      </Helmet>
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
            <Route 
              path="/profile" 
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              } 
            />
            {/* Removed /certificate-generator route: CertificateGeneratorUI is NGO-only and accessible via dashboard */}
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
