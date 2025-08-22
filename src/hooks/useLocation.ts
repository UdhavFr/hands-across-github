import { useState, useCallback, useEffect } from 'react';
import type { UseLocationReturn } from '../types/location';

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check current permission state
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          }
        );
      });

      setLocation(position.coords);
      setLocationPermission('granted');
      
      // Cache location in localStorage for session
      localStorage.setItem('userLocation', JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now()
      }));
    } catch (err: any) {
      let errorMessage = 'Failed to get location';
      
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        errorMessage = 'Location access denied by user';
        setLocationPermission('denied');
      } else if (err.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
        errorMessage = 'Location information is unavailable';
      } else if (err.code === GeolocationPositionError.TIMEOUT) {
        errorMessage = 'Location request timed out';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    localStorage.removeItem('userLocation');
  }, []);

  // Load cached location on mount
  useEffect(() => {
    const cachedLocation = localStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        // Use cached location if less than 1 hour old
        if (Date.now() - parsed.timestamp < 3600000) {
          setLocation({
            latitude: parsed.latitude,
            longitude: parsed.longitude
          } as GeolocationCoordinates);
        }
      } catch {
        localStorage.removeItem('userLocation');
      }
    }
  }, []);

  return {
    location,
    error,
    loading,
    requestLocation,
    clearLocation,
    locationPermission
  };
}