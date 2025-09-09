import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { EventsPage } from './pages/EventsPage';
import { NGOsPage } from './pages/NGOsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import NgoDashboard from './pages/NgoDashboard';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { RequireAuth } from './components/RequireAuth';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/ngos" element={<NGOsPage />} />
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
              path="/ngo-dashboard" 
              element={
                <RequireAuth>
                  <NgoDashboard />
                </RequireAuth>
              } 
            />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
        </main>
        <Footer />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;