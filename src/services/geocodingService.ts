import type { LocationData, PlaceResult } from '../types/location';

// Geocoding service with fallback to OpenStreetMap Nominatim (free)
// For production, integrate with Google Places API or Mapbox
export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  
  // Cache for geocoded addresses to avoid repeated API calls
  private static cache = new Map<string, LocationData>();

  /**
   * Geocode an address to get coordinates
   */
  static async geocodeAddress(address: string): Promise<LocationData | null> {
    const cacheKey = `geocode_${address.toLowerCase()}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&q=${encodedAddress}&limit=1&countrycodes=in`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.length === 0) {
        return null;
      }

      const result = data[0];
      const locationData: LocationData = {
        address: result.display_name,
        city: this.extractCity(result),
        state: this.extractState(result),
        country: 'India',
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        postalCode: this.extractPostalCode(result)
      };

      this.cache.set(cacheKey, locationData);
      return locationData;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  static async reverseGeocode(lat: number, lng: number): Promise<LocationData | null> {
    const cacheKey = `reverse_${lat}_${lng}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data) {
        return null;
      }

      const locationData: LocationData = {
        address: data.display_name,
        city: this.extractCity(data),
        state: this.extractState(data),
        country: 'India',
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        postalCode: this.extractPostalCode(data)
      };

      this.cache.set(cacheKey, locationData);
      return locationData;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Search for places with autocomplete
   */
  static async searchPlaces(query: string, location?: LocationData): Promise<PlaceResult[]> {
    if (query.length < 3) return [];

    try {
      const encodedQuery = encodeURIComponent(query);
      let url = `${this.NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&q=${encodedQuery}&limit=5&countrycodes=in`;
      
      // Bias results towards a specific location if provided
      if (location) {
        url += `&viewbox=${location.longitude - 0.1},${location.latitude + 0.1},${location.longitude + 0.1},${location.latitude - 0.1}&bounded=1`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((item: any, index: number): PlaceResult => ({
        placeId: item.place_id?.toString() || `${item.lat}_${item.lon}_${index}`,
        description: item.display_name,
        location: {
          address: item.display_name,
          city: this.extractCity(item),
          state: this.extractState(item),
          country: 'India',
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          postalCode: this.extractPostalCode(item)
        }
      }));
    } catch (error) {
      console.error('Place search error:', error);
      return [];
    }
  }

  /**
   * Validate an address
   */
  static async validateAddress(address: LocationData): Promise<boolean> {
    try {
      const result = await this.geocodeAddress(address.address);
      return result !== null;
    } catch {
      return false;
    }
  }

  // Helper methods to extract location components from Nominatim response
  private static extractCity(data: any): string {
    return data.address?.city || 
           data.address?.town || 
           data.address?.village || 
           data.address?.municipality || 
           'Unknown';
  }

  private static extractState(data: any): string {
    return data.address?.state || 
           data.address?.region || 
           'Unknown';
  }

  private static extractPostalCode(data: any): string | undefined {
    return data.address?.postcode;
  }

  /**
   * Get popular Indian cities for autocomplete
   */
  static getPopularCities(): string[] {
    return [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
      'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
      'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
      'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
      'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli', 'Vasai-Virar',
      'Varanasi', 'Srinagar', 'Dhanbad', 'Jodhpur', 'Amritsar', 'Raipur'
    ];
  }

  /**
   * Get Indian states for dropdown
   */
  static getIndianStates(): string[] {
    return [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Lakshadweep', 'Delhi', 'Puducherry', 'Ladakh', 'Jammu and Kashmir'
    ];
  }
}