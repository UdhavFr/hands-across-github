import { Heart, Facebook, Twitter, Instagram, Linkedin, Mail, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppUser } from '../types';

export function Footer() {
  const location = useLocation();
  const [user, setUser] = useState<AppUser | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (userData) {
          setUser(userData as AppUser);
        }
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const quickLinks = [
    { name: 'Events', href: '/events' },
    { name: 'NGOs', href: '/ngos' },
    ...(user ? [
      { name: 'Profile', href: '/profile' },
      { name: 'Settings', href: '/settings' },
      ...(user.user_type === 'ngo' ? [{ name: 'Dashboard', href: '/ngo-dashboard' }] : [])
    ] : [])
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'MIT License', href: 'https://opensource.org/licenses/MIT', external: true },
    { name: 'Contact Us', href: 'mailto:support@joinhands.org', external: true }
  ];

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/joinhands', color: 'hover:text-blue-600' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/joinhands', color: 'hover:text-blue-400' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/joinhands', color: 'hover:text-pink-600' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/joinhands', color: 'hover:text-blue-700' }
  ];

  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-rose-600" aria-label="JoinHands logo" />
              <span className="ml-2 text-2xl font-bold text-gray-900">JoinHands</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
              Connecting volunteers with NGOs to create meaningful change in communities. 
              Join hands today and make a difference that matters.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Mail className="h-4 w-4" />
              <span>support@joinhands.org</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
            <nav className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`block text-sm transition-colors ${
                    isActive(link.href)
                      ? 'text-rose-600 font-medium'
                      : 'text-gray-600 hover:text-rose-600'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal & Connect */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Legal & Support</h3>
            <nav className="space-y-2">
              {legalLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-rose-600 transition-colors"
                  >
                    {link.name}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="block text-sm text-gray-600 hover:text-rose-600 transition-colors"
                  >
                    {link.name}
                  </Link>
                )
              ))}
            </nav>

            {/* Social Media */}
            <div className="pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Connect With Us</h4>
              <div className="flex space-x-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-gray-400 ${social.color} transition-colors`}
                      aria-label={`Follow us on ${social.name}`}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-500">
              © {currentYear} JoinHands. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Made with ❤️ for community impact</span>
              <div className="flex items-center space-x-1">
                <span>Powered by</span>
                <a 
                  href="https://supabase.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  Supabase
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}