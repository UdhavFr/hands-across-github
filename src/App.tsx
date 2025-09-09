
// src/App.tsx

import { Helmet } from 'react-helmet';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
<<<<<<< HEAD
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { useEffect, useState, Suspense, lazy } from 'react';
=======
import { Footer } from './components/Footer';
import { EventsPage } from './pages/EventsPage';
import { NGOsPage } from './pages/NGOsPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { NgoDashboard } from './pages/NgoDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { useEffect, useState } from 'react';
>>>>>>> 0f568fa3b1dc88ea40884eacfda6253d599980e1
import { supabase } from './lib/supabase';
import { RequireAuth } from './components/RequireAuth';

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
  </div>
);

// Lazy load pages and heavy components
const EventsPage = lazy(() => import('./pages/EventsPage'));
const NGOsPage = lazy(() => import('./pages/NGOsPage'));
const NgoDashboard = lazy(() => import('./pages/NgoDashboard'));


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
<<<<<<< HEAD
          <Routes>
            <Route 
              path="/" 
              element={
                <>
                  <Hero />
                  <Suspense fallback={<PageLoader />}>
                    <EventsPage />
                    <NGOsPage />
                  </Suspense>
                </>
              } 
            />
            <Route 
              path="/events" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <EventsPage />
                </Suspense>
              } 
            />
            <Route 
              path="/ngos" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <NGOsPage />
                </Suspense>
              } 
            />
            <Route 
              path="/auth/callback" 
              element={<AuthCallbackPage />} 
            />
            <Route 
              path="/ngo-dashboard" 
              element={
                <RequireAuth role="ngo">
                  <Suspense fallback={<PageLoader />}>
                    <NgoDashboard />
                  </Suspense>
                </RequireAuth>
              } 
            />
          </Routes>
=======
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
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
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
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
                <Route 
                  path="/settings" 
                  element={
                    <RequireAuth>
                      <SettingsPage />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <RequireAuth>
                      <SettingsPage />
                    </RequireAuth>
                  } 
                />
              </Routes>
            </main>
            <Footer />
          </div>
>>>>>>> 0f568fa3b1dc88ea40884eacfda6253d599980e1
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
