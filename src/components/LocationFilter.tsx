import { useState, useEffect } from 'react';
import { MapPin, Filter, Navigation, X } from 'lucide-react';
import { LocationInput } from './LocationInput';
import { GeocodingService } from '../services/geocodingService';
import { useLocation } from '../hooks/useLocation';
import type { LocationFilterData, LocationData } from '../types/location';

interface LocationFilterProps {
  onLocationFilter: (filter: LocationFilterData) => void;
  currentFilters: LocationFilterData;
  userLocation?: GeolocationCoordinates;
  className?: string;
}

const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 1000, label: 'Any distance' }
];

export function LocationFilter({
  onLocationFilter,
  currentFilters,
  className = ""
}: LocationFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<LocationFilterData>(currentFilters);
  const [selectedCities, setSelectedCities] = useState<string[]>(currentFilters.cities);
  const [selectedStates, setSelectedStates] = useState<string[]>(currentFilters.states);
  
  const { location: userLocation, requestLocation, locationPermission } = useLocation();

  useEffect(() => {
    setLocalFilters(currentFilters);
    setSelectedCities(currentFilters.cities);
    setSelectedStates(currentFilters.states);
  }, [currentFilters]);

  const handleFilterChange = (updates: Partial<LocationFilterData>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onLocationFilter(newFilters);
  };

  const handleLocationChange = (location: LocationData | null) => {
    handleFilterChange({
      searchLocation: location || undefined,
      useCurrentLocation: false
    });
  };

  const handleUseCurrentLocation = async () => {
    if (!userLocation && locationPermission !== 'denied') {
      await requestLocation();
    }
    
    handleFilterChange({
      useCurrentLocation: true,
      searchLocation: undefined
    });
  };

  const handleRadiusChange = (radius: number) => {
    handleFilterChange({ radius });
  };

  const handleCityToggle = (city: string) => {
    const newCities = selectedCities.includes(city)
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city];
    
    setSelectedCities(newCities);
    handleFilterChange({ cities: newCities });
  };

  const handleStateToggle = (state: string) => {
    const newStates = selectedStates.includes(state)
      ? selectedStates.filter(s => s !== state)
      : [...selectedStates, state];
    
    setSelectedStates(newStates);
    handleFilterChange({ states: newStates });
  };

  const clearAllFilters = () => {
    const clearedFilters: LocationFilterData = {
      useCurrentLocation: false,
      radius: 50,
      cities: [],
      states: [],
      showNearbyOnly: false,
      sortByDistance: false
    };
    
    setLocalFilters(clearedFilters);
    setSelectedCities([]);
    setSelectedStates([]);
    onLocationFilter(clearedFilters);
  };

  const hasActiveFilters = localFilters.useCurrentLocation || 
    localFilters.searchLocation || 
    localFilters.cities.length > 0 || 
    localFilters.states.length > 0 ||
    localFilters.showNearbyOnly ||
    localFilters.sortByDistance;

  const popularCities = GeocodingService.getPopularCities().slice(0, 12);
  const states = GeocodingService.getIndianStates().slice(0, 10);

  return (
    <div className={`bg-background border border-border rounded-lg ${className}`}>
      {/* Filter Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Location Filters</h3>
            {hasActiveFilters && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                Active
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-accent rounded"
            >
              <Filter className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Location Search */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Search Location</label>
            <LocationInput
              value={localFilters.searchLocation || null}
              onChange={handleLocationChange}
              placeholder="Search for a city or address..."
              showCurrentLocation={false}
            />
            
            {/* Current Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 border rounded-md transition-colors ${
                localFilters.useCurrentLocation
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Navigation className="h-4 w-4" />
              {localFilters.useCurrentLocation ? 'Using Current Location' : 'Use Current Location'}
            </button>
          </div>

          {/* Radius Selection */}
          {(localFilters.useCurrentLocation || localFilters.searchLocation) && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Search Radius</label>
              <div className="grid grid-cols-3 gap-2">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRadiusChange(option.value)}
                    className={`py-2 px-3 text-sm border rounded-md transition-colors ${
                      localFilters.radius === option.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Cities */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Popular Cities</label>
            <div className="flex flex-wrap gap-2">
              {popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityToggle(city)}
                  className={`py-1 px-3 text-sm border rounded-full transition-colors ${
                    selectedCities.includes(city)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* States */}
          <div className="space-y-3">
            <label className="text-sm font-medium">States</label>
            <div className="flex flex-wrap gap-2">
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => handleStateToggle(state)}
                  className={`py-1 px-3 text-sm border rounded-full transition-colors ${
                    selectedStates.includes(state)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Sort Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.sortByDistance}
                  onChange={(e) => handleFilterChange({ sortByDistance: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Sort by distance (nearest first)</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.showNearbyOnly}
                  onChange={(e) => handleFilterChange({ showNearbyOnly: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Show only nearby opportunities</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}