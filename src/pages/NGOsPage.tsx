import { useEffect, useState } from 'react';
import { Globe, Users, Heart, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { LocationFilter } from '../components/LocationFilter';
import { DistanceDisplay } from '../components/DistanceDisplay';
import { useLocation } from '../hooks/useLocation';
import type { NGOProfile } from '../types';
import type { LocationFilterData, LocationData } from '../types/location';

export function NGOsPage() {
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [filteredNgos, setFilteredNgos] = useState<NGOProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [locationFilters, setLocationFilters] = useState<LocationFilterData>({
    useCurrentLocation: false,
    radius: 50,
    cities: [],
    states: [],
    showNearbyOnly: false,
    sortByDistance: false
  });
  
  const { location: userLocation } = useLocation();

  useEffect(() => {
    fetchNGOs();
  }, []);

  // Filter and sort NGOs based on location filters
  useEffect(() => {
    applyLocationFilters();
  }, [ngos, locationFilters, userLocation]);

  async function fetchNGOs() {
    try {
      const { data, error } = await supabase
        .from('ngo_profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Convert nullable fields to the expected types
      const formattedData = data.map((ngo) => ({
        ...ngo,
        logo_url: ngo.logo_url ?? undefined,
        website: ngo.website ?? undefined,
        created_at: ngo.created_at ?? "", // Convert null to an empty string
        updated_at: ngo.updated_at ?? "", // Convert null to an empty string
      }));

      setNgos(formattedData);
    } catch (error) {
      console.error('Error fetching NGOs:', error);
      toast.error('Failed to load NGOs');
    } finally {
      setLoading(false);
    }
  }

  async function applyLocationFilters() {
    let filtered = [...ngos];
    
    // Apply location-based filtering
    if (locationFilters.useCurrentLocation && userLocation) {
      // Filter by radius if using current location
      if (locationFilters.radius < 1000) {
        filtered = filtered.filter(ngo => {
          if (!(ngo as any).latitude || !(ngo as any).longitude) return false;
          
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number((ngo as any).latitude),
            Number((ngo as any).longitude)
          );
          
          return distance <= locationFilters.radius;
        });
      }
    }

    // Filter by selected cities
    if (locationFilters.cities.length > 0) {
      filtered = filtered.filter(ngo => 
        locationFilters.cities.includes((ngo as any).city || 'Unknown')
      );
    }

    // Filter by selected states
    if (locationFilters.states.length > 0) {
      filtered = filtered.filter(ngo => 
        locationFilters.states.includes((ngo as any).state || 'Unknown')
      );
    }

    // Sort by distance if requested
    if (locationFilters.sortByDistance && userLocation) {
      filtered.sort((a, b) => {
        const aLat = Number((a as any).latitude);
        const aLng = Number((a as any).longitude);
        const bLat = Number((b as any).latitude);
        const bLng = Number((b as any).longitude);
        
        if (!aLat || !aLng) return 1;
        if (!bLat || !bLng) return -1;
        
        const distanceA = calculateDistance(userLocation.latitude, userLocation.longitude, aLat, aLng);
        const distanceB = calculateDistance(userLocation.latitude, userLocation.longitude, bLat, bLng);
        
        return distanceA - distanceB;
      });
    }

    setFilteredNgos(filtered);
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async function handleEnroll(ngoId: string) {
    try {
      setEnrolling(ngoId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to enroll in NGOs');
        return;
      }

      const { error } = await supabase
        .from('ngo_enrollments')
        .insert([{ ngo_id: ngoId, user_id: user.id }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already enrolled in this NGO');
        } else {
          throw error;
        }
      } else {
        toast.success('Enrollment request sent successfully!');
      }
    } catch (error) {
      console.error('Error enrolling in NGO:', error);
      toast.error('Failed to enroll in NGO');
    } finally {
      setEnrolling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div id="ngos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Partner NGOs</h2>
          <p className="mt-2 text-lg text-gray-600">
            Join hands with these amazing organizations making a difference in our community.
          </p>
        </div>

        {/* Location Filters */}
        <LocationFilter
          onLocationFilter={setLocationFilters}
          currentFilters={locationFilters}
          className="mb-6"
        />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredNgos.map((ngo) => {
            const ngoLocation: LocationData | null = (ngo as any).latitude && (ngo as any).longitude ? {
              address: (ngo as any).address || 'Unknown',
              city: (ngo as any).city || 'Unknown',
              state: (ngo as any).state || 'Unknown',
              country: 'India',
              latitude: Number((ngo as any).latitude),
              longitude: Number((ngo as any).longitude)
            } : null;

            return (
              <div key={ngo.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={ngo.logo_url || 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80'}
                    alt={ngo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900">{ngo.name}</h3>
                  <p className="mt-2 text-gray-600 line-clamp-3">{ngo.description}</p>
                  
                  <div className="mt-4 space-y-2">
                    {/* Location Display */}
                    {ngoLocation ? (
                      <DistanceDisplay 
                        targetLocation={ngoLocation} 
                        userLocation={userLocation || undefined}
                        showDirection={false}
                        compact={true}
                      />
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <Heart className="h-4 w-4 mr-2" />
                        <span className="text-sm">Location not specified</span>
                      </div>
                    )}
                    
                    {ngo.website && (
                      <a
                        href={ngo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-gray-500 hover:text-rose-600 transition-colors"
                      >
                        <Globe className="h-5 w-5 mr-2" />
                        <span>Visit Website</span>
                      </a>
                    )}
                    
                    <div className="flex items-center text-gray-500">
                      <Heart className="h-5 w-5 mr-2" />
                      <span>{ngo.cause_areas.join(', ')}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleEnroll(ngo.id)}
                    disabled={enrolling === ngo.id}
                    className="mt-6 w-full py-2 px-4 rounded-md text-white font-medium
                      bg-rose-600 hover:bg-rose-700 disabled:opacity-50
                      transition-colors flex items-center justify-center"
                  >
                    {enrolling === ngo.id ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5 mr-2" />
                        Join Organization
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredNgos.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {locationFilters.useCurrentLocation || locationFilters.cities.length > 0 || locationFilters.states.length > 0
                ? 'No NGOs found matching your location criteria.'
                : 'No NGOs found.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}