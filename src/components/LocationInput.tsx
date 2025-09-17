import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { GeocodingService } from '../services/geocodingService';
import { ErrorService, ErrorUtils } from '../services/errorService';
import type { LocationData, PlaceResult } from '../types/location';
import { toast } from 'react-hot-toast';

interface LocationInputProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  showCurrentLocation?: boolean;
  required?: boolean;
  className?: string;
  onError?: (error: string) => void;
  enableOfflineMode?: boolean;
  showNetworkStatus?: boolean;
}

interface LocationInputState {
  inputValue: string;
  suggestions: PlaceResult[];
  isLoading: boolean;
  showSuggestions: boolean;
  geocodingLocation: boolean;
  error: string | null;
  isOnline: boolean;
  retryCount: number;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Enter location...",
  showCurrentLocation = true,
  required = false,
  className = "",
  onError,
  enableOfflineMode = true,
  showNetworkStatus = true
}: LocationInputProps) {
  const [state, setState] = useState<LocationInputState>({
    inputValue: value?.address || '',
    suggestions: [],
    isLoading: false,
    showSuggestions: false,
    geocodingLocation: false,
    error: null,
    isOnline: navigator.onLine,
    retryCount: 0,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { 
    location: userLocation, 
    loading: locationLoading, 
    requestLocation, 
    error: locationError 
  } = useLocation();

  /**
   * Handles network status changes
   */
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, error: null }));
      if (showNetworkStatus) {
        toast.success('Connection restored');
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      if (showNetworkStatus) {
        toast.error('Connection lost - offline mode enabled');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showNetworkStatus]);

  /**
   * Update input when value prop changes
   */
  useEffect(() => {
    if (value?.address && value.address !== state.inputValue) {
      setState(prev => ({ ...prev, inputValue: value.address || '' }));
    }
  }, [value, state.inputValue]);

  /**
   * Debounced search for suggestions with error handling
   */
  const searchSuggestions = useCallback(
    ErrorUtils.withErrorHandling(
      async (query: string) => {
        if (!state.isOnline && !enableOfflineMode) {
          throw new Error('No internet connection available');
        }

        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        const results = await GeocodingService.searchPlaces(query, value || undefined);
        
        setState(prev => ({
          ...prev,
          suggestions: results,
          showSuggestions: true,
          error: null,
          retryCount: 0,
        }));
      },
      'LocationInput.searchSuggestions',
      (error) => {
        const errorMessage = ErrorService.getUserFriendlyMessage(error);
        setState(prev => ({ 
          ...prev, 
          error: errorMessage,
          suggestions: enableOfflineMode ? getOfflineSuggestions(state.inputValue) : [],
          showSuggestions: enableOfflineMode,
        }));
        onError?.(errorMessage);
      }
    ),
    [state.isOnline, enableOfflineMode, value, onError, state.inputValue]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (state.inputValue.length >= 3) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      debounceRef.current = setTimeout(async () => {
        await searchSuggestions(state.inputValue);
        setState(prev => ({ ...prev, isLoading: false }));
      }, 300);
    } else {
      setState(prev => ({
        ...prev,
        suggestions: [],
        showSuggestions: false,
        error: null,
      }));
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state.inputValue, searchSuggestions]);

  /**
   * Handle clicking outside to close suggestions
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setState(prev => ({ ...prev, showSuggestions: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handles input value changes
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setState(prev => ({ ...prev, inputValue: newValue, error: null }));
    
    if (!newValue) {
      onChange(null);
      setState(prev => ({
        ...prev,
        suggestions: [],
        showSuggestions: false,
      }));
    }
  }, [onChange]);

  /**
   * Handles suggestion selection
   */
  const handleSuggestionSelect = useCallback((suggestion: PlaceResult) => {
    setState(prev => ({
      ...prev,
      inputValue: suggestion.description,
      showSuggestions: false,
      error: null,
    }));
    onChange(suggestion.location);
    inputRef.current?.blur();
  }, [onChange]);

  /**
   * Retries the last failed operation
   */
  const handleRetry = useCallback(async () => {
    if (state.inputValue.length >= 3) {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        retryCount: prev.retryCount + 1,
      }));
      
      await searchSuggestions(state.inputValue);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.inputValue, searchSuggestions]);

  /**
   * Handles using current location with enhanced error handling
   */
  const handleUseCurrentLocation = useCallback(
    ErrorUtils.withErrorHandling(
      async () => {
        if (userLocation) {
          // Already have location, reverse geocode it
          setState(prev => ({ ...prev, geocodingLocation: true, error: null }));
          
          try {
            const locationData = await GeocodingService.reverseGeocode(
              userLocation.latitude,
              userLocation.longitude
            );
            
            if (locationData) {
              setState(prev => ({ ...prev, inputValue: locationData.address }));
              onChange(locationData);
              toast.success('Current location detected');
            } else {
              throw new Error('Unable to determine address from coordinates');
            }
          } finally {
            setState(prev => ({ ...prev, geocodingLocation: false }));
          }
        } else {
          // Request location permission and get coordinates
          await requestLocation();
        }
      },
      'LocationInput.handleUseCurrentLocation',
      (error) => {
        const errorMessage = ErrorService.getUserFriendlyMessage(error);
        setState(prev => ({ 
          ...prev, 
          error: errorMessage,
          geocodingLocation: false,
        }));
        onError?.(errorMessage);
        toast.error(errorMessage);
      }
    ),
    [userLocation, onChange, requestLocation, onError]
  );

  /**
   * Effect to handle when user location is obtained
   */
  useEffect(() => {
    if (userLocation && !value && !state.inputValue) {
      handleUseCurrentLocation();
    }
  }, [userLocation, value, state.inputValue, handleUseCurrentLocation]);

  /**
   * Handles keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state.suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionSelect(state.suggestions[0]);
    } else if (e.key === 'Escape') {
      setState(prev => ({ ...prev, showSuggestions: false }));
    }
  }, [state.suggestions, handleSuggestionSelect]);

  /**
   * Gets offline suggestions based on popular Indian cities
   */
  const getOfflineSuggestions = useCallback((query: string): PlaceResult[] => {
    if (!enableOfflineMode || query.length < 2) return [];

    const popularCities = GeocodingService.getPopularCities();
    const matchingCities = popularCities
      .filter(city => city.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return matchingCities.map((city, index) => ({
      placeId: `offline_${city}_${index}`,
      description: `${city}, India (Offline)`,
      location: {
        address: `${city}, India`,
        city,
        state: 'Unknown',
        country: 'India',
        latitude: 0, // Would need actual coordinates
        longitude: 0,
      },
    }));
  }, [enableOfflineMode]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={state.inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => state.suggestions.length > 0 && setState(prev => ({ ...prev, showSuggestions: true }))}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-16 py-2 border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            state.error ? 'border-red-300' : 'border-input'
          }`}
        />
        
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {showNetworkStatus && (
            <div className="p-1" title={state.isOnline ? 'Online' : 'Offline'}>
              {state.isOnline ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
            </div>
          )}
          
          {showCurrentLocation && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading || state.geocodingLocation}
              className="p-1 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              title="Use current location"
            >
              {locationLoading || state.geocodingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {(locationError || state.error) && (
        <div className="mt-1 flex items-start">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
          <div className="text-sm text-red-600">
            <p>{locationError || state.error}</p>
            {state.error && state.retryCount < 3 && state.isOnline && (
              <button
                onClick={handleRetry}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Try again ({3 - state.retryCount} attempts left)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Offline Mode Notice */}
      {!state.isOnline && enableOfflineMode && (
        <div className="mt-1 flex items-center text-xs text-yellow-600">
          <WifiOff className="h-3 w-3 mr-1" />
          <span>Offline mode - showing popular cities only</span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {state.showSuggestions && (state.suggestions.length > 0 || state.isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {state.isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">
                {state.isOnline ? 'Searching...' : 'Loading offline suggestions...'}
              </span>
            </div>
          ) : (
            <>
              {state.suggestions.length === 0 && state.error && (
                <div className="px-4 py-3 text-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-600 mb-2">{state.error}</p>
                  {state.retryCount < 3 && state.isOnline && (
                    <button
                      onClick={handleRetry}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Retry search
                    </button>
                  )}
                </div>
              )}
              
              {state.suggestions.map((suggestion) => (
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
                        {suggestion.description.includes('Offline') && (
                          <span className="ml-2 text-xs text-yellow-600">(Offline)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {!state.isOnline && enableOfflineMode && state.suggestions.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-yellow-50">
                  <p className="text-xs text-yellow-700">
                    Limited offline results. Connect to internet for full search.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}