import React from 'react';
import { Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import type { Event } from '../types';

interface EventCardProps {
  event: Event;
  onRegister: (eventId: string) => Promise<void>;
  isRegistering: boolean;
  registrationStatus?: 'pending' | 'confirmed';
  isDisabled: boolean;
}

export function EventCard({ 
  event, 
  onRegister,
  isRegistering,
  registrationStatus,
  isDisabled
}: EventCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img
        className="h-48 w-full object-cover"
        src={event.image_url || 'https://images.unsplash.com/photo-1559024020-89fd9f22f6d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80'}
        alt={event.title}
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
        <p className="mt-2 text-gray-600 line-clamp-2">{event.description}</p>
        
        <div className="mt-4 flex items-center text-gray-500">
          <Calendar className="h-5 w-5 mr-2" />
          <span>{new Date(event.date).toLocaleDateString()}</span>
        </div>
        
        <div className="mt-2 flex items-center text-gray-500">
          <MapPin className="h-5 w-5 mr-2" />
          <span>{event.location}</span>
        </div>
        
        <div className="mt-2 flex items-center text-gray-500">
          <Users className="h-5 w-5 mr-2" />
          <span>{event.slots_available} slots available</span>
        </div>
        
        <button
          onClick={() => onRegister(event.id)}
          disabled={isDisabled || isRegistering}
          className={`mt-4 w-full py-2 px-4 rounded-md ${
            isDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white'
          } transition-colors`}
        >
          {isRegistering ? (
            <Loader2 className="animate-spin h-5 w-5 mx-auto" />
          ) : registrationStatus === 'pending' ? (
            'Pending Approval'
          ) : registrationStatus === 'confirmed' ? (
            'Confirmed ✅'
          ) : (
            'Join Event'
          )}
        </button>
      </div>
    </div>
  );
}