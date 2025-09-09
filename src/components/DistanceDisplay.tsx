import { MapPin, Navigation } from 'lucide-react';
import type { LocationData } from '../types/location';

interface DistanceDisplayProps {
  targetLocation: LocationData | null;
  userLocation?: GeolocationCoordinates;
  showDirection?: boolean;
  compact?: boolean;
  className?: string;
}

export function DistanceDisplay({
  targetLocation,
  userLocation,
  showDirection = false,
  compact = false,
  className = ""
}: DistanceDisplayProps) {
  if (!targetLocation || !targetLocation.latitude || !targetLocation.longitude) {
    return (
      <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
        <MapPin className="h-3 w-3" />
        <span className="text-xs">{targetLocation?.city || 'Unknown'}</span>
      </div>
    );
  }

  // Calculate distance if user location is available
  let distance: number | null = null;
  let direction: string | null = null;

  if (userLocation) {
    // Haversine formula to calculate distance
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(targetLocation.latitude - userLocation.latitude);
    const dLon = toRadians(targetLocation.longitude - userLocation.longitude);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(userLocation.latitude)) * Math.cos(toRadians(targetLocation.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;

    // Calculate direction if requested
    if (showDirection) {
      const bearing = calculateBearing(
        userLocation.latitude,
        userLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );
      direction = getDirectionFromBearing(bearing);
    }
  }

  function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = toRadians(lng2 - lng1);
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
  }

  function getDirectionFromBearing(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  function formatDistance(dist: number): string {
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    } else if (dist < 10) {
      return `${dist.toFixed(1)}km`;
    } else {
      return `${Math.round(dist)}km`;
    }
  }

  function openInMaps() {
    if (!targetLocation) return;
    
    const url = `https://www.google.com/maps/search/?api=1&query=${targetLocation.latitude},${targetLocation.longitude}`;
    window.open(url, '_blank');
  }

  const isNearby = distance !== null && distance < 10;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <MapPin className="h-3 w-3 text-muted-foreground" />
      
      {compact ? (
        <button
          onClick={openInMaps}
          className="text-xs hover:text-primary transition-colors"
          title={`${targetLocation.city}${distance ? ` • ${formatDistance(distance)} away` : ''}`}
        >
          {distance ? (
            <span className={isNearby ? 'text-green-600' : 'text-muted-foreground'}>
              {formatDistance(distance)}
              {direction && ` ${direction}`}
            </span>
          ) : (
            <span className="text-muted-foreground">{targetLocation.city}</span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{targetLocation.city}</span>
          
          {distance && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className={`text-sm ${isNearby ? 'text-green-600' : 'text-muted-foreground'}`}>
                {formatDistance(distance)} away
                {direction && ` ${direction}`}
              </span>
              {isNearby && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Nearby
                </span>
              )}
            </>
          )}

          <button
            onClick={openInMaps}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Open in maps"
          >
            <Navigation className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}