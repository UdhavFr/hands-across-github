export interface AppUser {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url?: string | null;
  user_type: 'volunteer' | 'ngo';
  username: string;
  status?: string;
  created_at: string | null;
  updated_at?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  social_links?: Record<string, string> | null;
  location?: string | null;
  website?: string | null;
  profile_completion_score?: number | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  ngo_id: string;
  image_url?: string | null;
  slots_available: number;
  created_at: string | null;
  updated_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'pending' | 'confirmed';
  created_at: string;
  updated_at: string;
}

export interface EventCardProps {
  event: Event;
  onRegister: (eventId: string) => Promise<void>;
  isRegistering: boolean;
  registrationStatus?: 'pending' | 'confirmed';
  isDisabled: boolean;
}

export interface NGOProfile {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  website?: string;
  cause_areas: string[];
  user_id: string;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}
