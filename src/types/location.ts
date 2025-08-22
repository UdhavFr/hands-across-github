// Location-related type definitions

export interface LocationData {
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
}

export interface LocationFilterData {
  searchLocation?: LocationData;
  useCurrentLocation: boolean;
  radius: number; // in kilometers
  cities: string[];
  states: string[];
  showNearbyOnly: boolean;
  sortByDistance: boolean;
}

export interface PlaceResult {
  placeId: string;
  description: string;
  location: LocationData;
}

export interface UseLocationReturn {
  location: GeolocationCoordinates | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
  locationPermission: 'granted' | 'denied' | 'prompt';
}