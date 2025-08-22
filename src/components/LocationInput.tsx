import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { GeocodingService } from '../services/geocodingService';
import type { LocationData, PlaceResult } from '../types/location';

interface LocationInputProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  showCurrentLocation?: boolean;
  required?: boolean;
  className?: string;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Enter location...",
  showCurrentLocation = true,
  required = false,
  className = ""
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const { 
    location: userLocation, 
    loading: locationLoading, 
    requestLocation, 
    error: locationError 
  } = useLocation();

  // Update input when value prop changes
  useEffect(() => {
    if (value?.address && value.address !== inputValue) {
      setInputValue(value.address);
    }
  }, [value]);

  // Debounced search for suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (inputValue.length >= 3) {
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await GeocodingService.searchPlaces(inputValue, value || undefined);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, value]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (!newValue) {
      onChange(null);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: PlaceResult) => {
    setInputValue(suggestion.description);
    onChange(suggestion.location);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleUseCurrentLocation = async () => {
    if (userLocation) {
      // Already have location, reverse geocode it
      setGeocodingLocation(true);
      try {
        const locationData = await GeocodingService.reverseGeocode(
          userLocation.latitude,
          userLocation.longitude
        );
        if (locationData) {
          setInputValue(locationData.address);
          onChange(locationData);
        }
      } catch (error) {
        console.error('Error reverse geocoding:', error);
      } finally {
        setGeocodingLocation(false);
      }
    } else {
      // Request location permission and get coordinates
      await requestLocation();
    }
  };

  // Effect to handle when user location is obtained
  useEffect(() => {
    if (userLocation && !value) {
      handleUseCurrentLocation();
    }
  }, [userLocation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-12 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        {showCurrentLocation && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locationLoading || geocodingLocation}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Use current location"
          >
            {locationLoading || geocodingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {locationError && (
        <p className="mt-1 text-sm text-destructive">{locationError}</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : (
            <>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mt-0.5 mr-3 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {suggestion.location.city}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}