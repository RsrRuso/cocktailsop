import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin, Settings2, Navigation, Users, ArrowLeft, UtensilsCrossed, Wine, Store, List, Globe, Award, Star, X, ExternalLink, MapPinned, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NEARBY_RADIUS_KM = 5;
const CITY_RADIUS_KM = 25;

const createUserIcon = (label: string, avatarUrl?: string, isCurrentUser = false) => {
  const sizeClass = isCurrentUser ? 'w-10 h-10 border-4' : 'w-8 h-8 border-2';
  const bgClass = isCurrentUser ? 'bg-primary' : 'bg-blue-500';

  return L.divIcon({
    html: `
      <div class="${sizeClass} ${bgClass} rounded-full border-white shadow-lg flex items-center justify-center text-white text-xs font-bold overflow-hidden"
        style="${avatarUrl ? `background-image:url(${avatarUrl});background-size:cover;background-position:center;` : ''}"
      >
        ${avatarUrl ? '' : label}
      </div>
    `,
    className: '',
    iconSize: isCurrentUser ? [40, 40] : [32, 32],
    iconAnchor: isCurrentUser ? [20, 20] : [16, 16],
  });
};

const createPlaceIcon = (type: 'bar' | 'restaurant' | 'cafe', hasAward = false) => {
  const colors = {
    bar: 'bg-purple-500',
    restaurant: 'bg-orange-500',
    cafe: 'bg-amber-500'
  };
  const icons = {
    bar: '🍺',
    restaurant: '🍽️',
    cafe: '☕'
  };

  return L.divIcon({
    html: `
      <div class="relative">
        <div class="w-8 h-8 ${colors[type]} rounded-lg shadow-lg flex items-center justify-center text-white text-sm border-2 border-white cursor-pointer hover:scale-110 transition-transform">
          ${icons[type]}
        </div>
        ${hasAward ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px]">🏆</div>' : ''}
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Award-granting organizations with details
const AWARD_ORGANIZATIONS = [
  { id: 'michelin', name: 'Michelin Guide', icon: '⭐', color: 'bg-red-500', description: 'World\'s most prestigious restaurant rating', awards: ['Michelin Star', 'Michelin 2 Stars', 'Michelin 3 Stars', 'Bib Gourmand'] },
  { id: 'worlds50best', name: 'World\'s 50 Best', icon: '🌍', color: 'bg-blue-500', description: 'Annual ranking of the world\'s best restaurants & bars', awards: ['World\'s 50 Best Restaurants', 'World\'s 50 Best Bars', 'Asia\'s 50 Best'] },
  { id: 'jamesbeard', name: 'James Beard Foundation', icon: '🏆', color: 'bg-amber-600', description: 'Premier culinary awards in America', awards: ['James Beard Award', 'Outstanding Restaurant', 'Rising Star Chef'] },
  { id: 'aaa', name: 'AAA Diamond', icon: '💎', color: 'bg-purple-500', description: 'North American hospitality rating', awards: ['AAA Five Diamond', 'AAA Four Diamond'] },
  { id: 'spirited', name: 'Tales of the Cocktail', icon: '🍸', color: 'bg-teal-500', description: 'Cocktail industry\'s top awards', awards: ['Spirited Award', 'Best American Cocktail Bar', 'Best International Bar'] },
  { id: 'winespectator', name: 'Wine Spectator', icon: '🍷', color: 'bg-rose-600', description: 'Premier wine awards', awards: ['Wine Spectator Award', 'Grand Award', 'Best of Award'] },
  { id: 'zagat', name: 'Zagat', icon: '📖', color: 'bg-orange-500', description: 'Consumer-driven reviews and ratings', awards: ['Zagat Rated', 'Zagat Top Pick'] },
  { id: 'forbes', name: 'Forbes Travel Guide', icon: '🌟', color: 'bg-slate-700', description: 'Luxury hospitality ratings', awards: ['Forbes Five-Star', 'Forbes Four-Star'] },
  { id: 'tripadvisor', name: 'TripAdvisor', icon: '🦉', color: 'bg-green-500', description: 'Traveler\'s choice awards', awards: ['Travelers\' Choice', 'Best of the Best'] },
  { id: 'timeout', name: 'Time Out', icon: '⏱️', color: 'bg-pink-500', description: 'City lifestyle awards', awards: ['Time Out Love Local', 'Best Bar Award'] },
];

const ALL_AWARDS = AWARD_ORGANIZATIONS.flatMap(org => org.awards);

const generateMockAwards = (placeId: number): { award: string; organization: string }[] => {
  const seed = placeId % 100;
  if (seed > 60) {
    const numAwards = Math.floor(seed % 3) + 1;
    const awards: { award: string; organization: string }[] = [];
    for (let i = 0; i < numAwards; i++) {
      const orgIndex = (placeId + i) % AWARD_ORGANIZATIONS.length;
      const org = AWARD_ORGANIZATIONS[orgIndex];
      const awardIndex = (placeId + i) % org.awards.length;
      awards.push({ award: org.awards[awardIndex], organization: org.id });
    }
    return awards;
  }
  return [];
};

interface PlaceAward {
  award: string;
  organization: string;
}

interface Place {
  id: number;
  name: string;
  type: 'bar' | 'restaurant' | 'cafe';
  lat: number;
  lon: number;
  rating?: number;
  cuisine?: string;
  awards?: PlaceAward[];
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
}

const LiveMap = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const placeMarkersRef = useRef<L.Marker[]>([]);

  const [ghostMode, setGhostMode] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlacesList, setShowPlacesList] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [viewMode, setViewMode] = useState<'nearby' | 'city'>('nearby');
  const [placesFilter, setPlacesFilter] = useState<'all' | 'bar' | 'restaurant' | 'cafe' | 'awarded'>('all');
  const [showAwardsOrgs, setShowAwardsOrgs] = useState(false);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [placesFetched, setPlacesFetched] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const { position, isTracking, toggleGhostMode } = useGPSTracking(!ghostMode);
  const { toast } = useToast();

  // Calculate distance between two coordinates in km
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Fetch nearby bars and restaurants from OpenStreetMap Overpass API - with deduplication
  const fetchNearbyPlaces = useCallback(async (lat: number, lon: number, radiusKm: number = NEARBY_RADIUS_KM, force = false) => {
    if (!showPlaces) {
      setLoadingPlaces(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    // Only fetch if position changed significantly (500m) or forced
    if (!force && lastFetchPositionRef.current) {
      const dist = Math.sqrt(
        Math.pow(lat - lastFetchPositionRef.current.lat, 2) +
        Math.pow(lon - lastFetchPositionRef.current.lon, 2)
      ) * 111000; // rough meters
      if (dist < 500 && placesFetched) {
        setLoadingPlaces(false);
        return;
      }
    }

    fetchingRef.current = true;
    setLoadingPlaces(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      fetchingRef.current = false;
      setLoadingPlaces(false);
    }, 8000);
    
    try {
      const radiusMeters = radiusKm * 1000;
      const query = `
        [out:json][timeout:15];
        (
          node["amenity"="bar"](around:${radiusMeters},${lat},${lon});
          node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
          node["amenity"="pub"](around:${radiusMeters},${lat},${lon});
          node["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
        );
        out body 150;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setPlaces([]);
        setLoadingPlaces(false);
        fetchingRef.current = false;
        return;
      }

      const data = await response.json();
      
      const fetchedPlaces: Place[] = data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          let type: 'bar' | 'restaurant' | 'cafe' = 'restaurant';
          if (el.tags.amenity === 'bar' || el.tags.amenity === 'pub') type = 'bar';
          else if (el.tags.amenity === 'cafe') type = 'cafe';
          
          const awards = generateMockAwards(el.id);
          
          return {
            id: el.id,
            name: el.tags.name,
            type,
            lat: el.lat,
            lon: el.lon,
            cuisine: el.tags.cuisine,
            rating: el.tags['rating'] ? parseFloat(el.tags['rating']) : (3 + Math.random() * 2),
            awards,
            address: el.tags['addr:street'] ? `${el.tags['addr:housenumber'] || ''} ${el.tags['addr:street']}` : undefined,
            phone: el.tags.phone,
            website: el.tags.website,
            openingHours: el.tags.opening_hours
          };
        });

      setPlaces(fetchedPlaces);
      setPlacesFetched(true);
      lastFetchPositionRef.current = { lat, lon };
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching places:', error);
      }
      // Keep existing places on error
    } finally {
      clearTimeout(timeoutId);
      setLoadingPlaces(false);
      fetchingRef.current = false;
    }
  }, [showPlaces, placesFetched]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const initialCenter: [number, number] = position
        ? [position.latitude, position.longitude]
        : [40, -74.5];

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: true,
        zoomControl: false,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
      }).setView(initialCenter, 14);

      // Neon glowing night map - CARTO Dark Matter (free, no API key needed)
      const darkLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      );

      // Satellite layer for toggle
      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 20,
        }
      );

      (satelliteMode ? satelliteLayer : darkLayer).addTo(map);
      
      // Add zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      
      mapRef.current = map;
      
      // Mark map as loaded
      setLoadingPlaces(false);
    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      setMapError('Failed to initialize map');
      setLoadingPlaces(false);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteMode]);

  // Fetch places once when map is ready and position is available
  useEffect(() => {
    if (!mapRef.current || !position || placesFetched) return;
    const radius = viewMode === 'city' ? CITY_RADIUS_KM : NEARBY_RADIUS_KM;
    fetchNearbyPlaces(position.latitude, position.longitude, radius, true);
  }, [position, viewMode, placesFetched, fetchNearbyPlaces]);

  // Center map and update current user marker when GPS position changes
  useEffect(() => {
    if (!mapRef.current || !position) return;

    const map = mapRef.current;
    const userKey = 'current-user';

    if (autoCenter) {
      map.flyTo([position.latitude, position.longitude], viewMode === 'city' ? 11 : 14);
    }

    if (ghostMode) {
      if (markersRef.current[userKey]) {
        markersRef.current[userKey].remove();
        delete markersRef.current[userKey];
      }
      return;
    }

    if (markersRef.current[userKey]) {
      markersRef.current[userKey].setLatLng([position.latitude, position.longitude]);
    } else {
      const marker = L.marker([position.latitude, position.longitude], {
        icon: createUserIcon('You', undefined, true),
      }).bindPopup('<div class="font-bold text-primary">📍 You are here</div>');

      marker.addTo(map);
      markersRef.current[userKey] = marker;
    }
  }, [position, ghostMode, autoCenter, fetchNearbyPlaces, viewMode]);

  // Filter places based on current filter and search query
  const filteredPlaces = places.filter(place => {
    // First apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = place.name.toLowerCase().includes(query);
      const typeMatch = place.type.toLowerCase().includes(query);
      const cuisineMatch = place.cuisine?.toLowerCase().includes(query);
      const awardMatch = place.awards?.some(a => 
        a.award.toLowerCase().includes(query) || 
        AWARD_ORGANIZATIONS.find(o => o.id === a.organization)?.name.toLowerCase().includes(query)
      );
      if (!nameMatch && !typeMatch && !cuisineMatch && !awardMatch) return false;
    }
    // Then apply org filter if set
    if (selectedOrgFilter) {
      if (!place.awards?.some(a => a.organization === selectedOrgFilter)) return false;
    }
    if (placesFilter === 'all') return true;
    if (placesFilter === 'awarded') return place.awards && place.awards.length > 0;
    return place.type === placesFilter;
  });

  // Get venues by organization
  const getVenuesByOrg = (orgId: string) => {
    return places.filter(p => p.awards?.some(a => a.organization === orgId));
  };

  // Add place markers to map
  useEffect(() => {
    if (!mapRef.current || !showPlaces) return;

    // Clear old place markers
    placeMarkersRef.current.forEach(marker => marker.remove());
    placeMarkersRef.current = [];

    filteredPlaces.forEach(place => {
      const hasAward = place.awards && place.awards.length > 0;
      const marker = L.marker([place.lat, place.lon], {
        icon: createPlaceIcon(place.type, hasAward),
      });

      marker.on('click', () => {
        setSelectedPlace(place);
      });

      marker.addTo(mapRef.current!);
      placeMarkersRef.current.push(marker);
    });
  }, [filteredPlaces, showPlaces]);

  const fetchLocations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: follows } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

    if (!follows || follows.length === 0) {
      setLocations([]);
      setNearbyFriends([]);
      return;
    }

    const friendIds = new Set<string>();
    follows.forEach(follow => {
      if (follow.follower_id === user.id) friendIds.add(follow.following_id);
      if (follow.following_id === user.id) friendIds.add(follow.follower_id);
    });

    const { data: locationRows, error } = await supabase
      .from('user_locations')
      .select('user_id, latitude, longitude, ghost_mode, last_updated')
      .in('user_id', Array.from(friendIds))
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      console.error('Error fetching locations:', error);
      setMapError('Failed to load locations');
      return;
    }

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', Array.from(friendIds));

    const profileById: Record<string, { username: string; avatar_url: string | null }> = {};
    profileRows?.forEach((p: any) => {
      if (p?.id) profileById[p.id] = p;
    });

    if (locationRows) {
      setLocations(locationRows as any);

      if (mapRef.current && position) {
        const map = mapRef.current;

        // Clear old markers except current user and places
        Object.keys(markersRef.current).forEach((key) => {
          if (key !== 'current-user') {
            markersRef.current[key].remove();
            delete markersRef.current[key];
          }
        });

        // Filter friends within radius
        const nearby: any[] = [];
        
        locationRows.forEach((location: any) => {
          if (!location.user_id || location.latitude == null || location.longitude == null) return;

          const distance = calculateDistance(
            position.latitude,
            position.longitude,
            location.latitude,
            location.longitude
          );

          // Only show friends within radius
          if (distance <= NEARBY_RADIUS_KM) {
            const profile = profileById[location.user_id];
            const username = profile?.username || 'Friend';
            const avatarUrl = profile?.avatar_url || undefined;
            
            nearby.push({
              ...location,
              username,
              avatarUrl,
              distance: distance.toFixed(1)
            });

            const marker = L.marker([location.latitude, location.longitude], {
              icon: createUserIcon(username[0]?.toUpperCase() || 'F', avatarUrl),
            }).bindPopup(`
              <div class="p-2">
                <div class="font-bold text-sm">${username}</div>
                <div class="text-xs text-gray-500">${distance.toFixed(1)} km away</div>
                ${location.ghost_mode ? '<div class="text-xs text-purple-500">👻 Ghost Mode</div>' : ''}
              </div>
            `);

            marker.addTo(map);
            markersRef.current[location.user_id] = marker;
          }
        });

        setNearbyFriends(nearby);
      }
    }
  };

  // Subscribe to realtime location updates
  useEffect(() => {
    const channel = supabase
      .channel('user-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        () => fetchLocations()
      )
      .subscribe();

    fetchLocations();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const handleToggleGhostMode = async () => {
    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);
    await toggleGhostMode(newGhostMode);

    toast({
      title: newGhostMode ? '👻 Ghost Mode Enabled' : '📍 Ghost Mode Disabled',
      description: newGhostMode
        ? 'You\'re hidden from the map. Others can\'t see your location.'
        : 'You\'re visible on the map. Friends can see your location.',
    });
  };

  const handleCenterOnUser = () => {
    if (mapRef.current && position) {
      mapRef.current.flyTo([position.latitude, position.longitude], viewMode === 'city' ? 11 : 15);
      toast({
        title: 'Centered on your location',
        description: 'Map view updated',
      });
    }
  };

  const handleToggleViewMode = () => {
    const newMode = viewMode === 'nearby' ? 'city' : 'nearby';
    setViewMode(newMode);
    setPlacesFetched(false); // Reset to force re-fetch
    
    if (mapRef.current && position) {
      const zoom = newMode === 'city' ? 11 : 14;
      mapRef.current.flyTo([position.latitude, position.longitude], zoom);
      // Force re-fetch with new radius
      setTimeout(() => {
        fetchNearbyPlaces(position.latitude, position.longitude, newMode === 'city' ? CITY_RADIUS_KM : NEARBY_RADIUS_KM, true);
      }, 300);
    }
    
    toast({
      title: newMode === 'city' ? '🌆 City View' : '📍 Nearby View',
      description: newMode === 'city' ? `Showing venues within ${CITY_RADIUS_KM}km` : `Showing venues within ${NEARBY_RADIUS_KM}km`,
    });
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setShowPlacesList(false);
    setShowAwardsOrgs(false);
    
    if (mapRef.current) {
      // Fly to place with animation
      mapRef.current.flyTo([place.lat, place.lon], 17, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  };

  const awardedPlaces = places.filter(p => p.awards && p.awards.length > 0);

  if (mapError) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <div className="text-center space-y-4 p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Map Loading Failed</h3>
            <p className="text-sm text-muted-foreground">{mapError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 bg-muted" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background/30" />

      {/* Top Bar - Back Button & Compact Stats */}
      <motion.div 
        className="absolute top-3 left-3 right-3 flex items-start justify-between z-[1000]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Back Button & Search */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/home')}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Search Bar */}
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <Input
                    placeholder="Search venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 h-10 w-48 sm:w-64 bg-black/50 backdrop-blur-xl border-white/20 text-white placeholder:text-white/40 rounded-full"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>
            ) : (
              <Button
                onClick={() => setShowSearch(true)}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
          </AnimatePresence>
        </div>

        {/* Compact Stats Panel */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl px-3 py-2 border border-white/10 max-w-[180px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/80">
                <span className="font-bold text-white">{nearbyFriends.length}</span> friends nearby
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-white/80">
                {loadingPlaces ? 'Loading...' : <><span className="font-bold text-white">{places.length}</span> venues</>}
              </span>
            </div>
            {awardedPlaces.length > 0 && (
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-white/80">
                  <span className="font-bold text-white">{awardedPlaces.length}</span> awarded
                </span>
              </div>
            )}
          </div>
          
          {/* Filter Pills */}
          {places.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
              <Badge 
                className={`text-[10px] cursor-pointer px-1.5 py-0 ${
                  placesFilter === 'bar' 
                    ? 'bg-purple-500/80 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setPlacesFilter(placesFilter === 'bar' ? 'all' : 'bar')}
              >
                🍺 {places.filter(p => p.type === 'bar').length}
              </Badge>
              <Badge 
                className={`text-[10px] cursor-pointer px-1.5 py-0 ${
                  placesFilter === 'restaurant' 
                    ? 'bg-orange-500/80 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setPlacesFilter(placesFilter === 'restaurant' ? 'all' : 'restaurant')}
              >
                🍽️ {places.filter(p => p.type === 'restaurant').length}
              </Badge>
              <Badge 
                className={`text-[10px] cursor-pointer px-1.5 py-0 ${
                  placesFilter === 'cafe' 
                    ? 'bg-amber-500/80 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setPlacesFilter(placesFilter === 'cafe' ? 'all' : 'cafe')}
              >
                ☕ {places.filter(p => p.type === 'cafe').length}
              </Badge>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating Action Buttons - Right Side */}
      <motion.div 
        className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[1000]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {position && (
          <Button
            onClick={handleCenterOnUser}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-blue-400 hover:bg-black/50"
          >
            <Navigation className="w-5 h-5" />
          </Button>
        )}
        <Button
          onClick={() => setShowSettings(true)}
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50"
        >
          <Settings2 className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Bottom Action Bar */}
      <motion.div 
        className="absolute bottom-20 sm:bottom-6 left-3 right-3 z-[1000]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-2 border border-white/10">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Status */}
            <div className="flex items-center gap-2 px-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-white/80 font-medium">
                {ghostMode ? '👻' : viewMode === 'city' ? '🌆' : '📍'}
              </span>
            </div>

            {/* Center: Main Actions */}
            <div className="flex items-center gap-1">
              <Button
                onClick={handleToggleGhostMode}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 rounded-xl ${
                  ghostMode 
                    ? 'bg-purple-500/30 text-purple-300' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {ghostMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>

              <Button
                onClick={handleToggleViewMode}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 rounded-xl ${
                  viewMode === 'city' 
                    ? 'bg-green-500/30 text-green-300' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <Globe className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setShowPlacesList(true)}
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20"
              >
                <List className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setShowAwardsOrgs(true)}
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-xl bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
              >
                <Award className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setSatelliteMode(!satelliteMode)}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 rounded-xl ${
                  satelliteMode 
                    ? 'bg-teal-500/30 text-teal-300' 
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>

            {/* Right: View label */}
            <span className="text-[10px] text-white/50 px-2 hidden sm:block">
              {viewMode === 'city' ? `${CITY_RADIUS_KM}km` : `${NEARBY_RADIUS_KM}km`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Nearby Friends Floating Card */}
      {nearbyFriends.length > 0 && (
        <motion.div 
          className="absolute bottom-36 sm:bottom-24 left-3 bg-black/40 backdrop-blur-xl rounded-2xl p-3 border border-white/10 z-[1000] max-w-[160px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-[10px] text-white/60 mb-2 uppercase tracking-wide">Friends</div>
          <div className="space-y-1.5 max-h-[100px] overflow-y-auto scrollbar-thin">
            {nearbyFriends.slice(0, 4).map((friend) => (
              <div key={friend.user_id} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full bg-blue-500/50 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden border border-white/20"
                  style={friend.avatarUrl ? { backgroundImage: `url(${friend.avatarUrl})`, backgroundSize: 'cover' } : {}}
                >
                  {!friend.avatarUrl && friend.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white font-medium truncate">{friend.username}</div>
                  <div className="text-[9px] text-white/50">{friend.distance}km</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Places List Sheet */}
      <Sheet open={showPlacesList} onOpenChange={setShowPlacesList}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 bg-black/70 backdrop-blur-2xl border-l border-white/10">
          <SheetHeader className="p-4 border-b border-white/10">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Store className="w-5 h-5" />
              Venues ({filteredPlaces.length})
            </SheetTitle>
            <SheetDescription className="text-white/60">
              Bars, restaurants & cafes {viewMode === 'city' ? 'in your city' : 'near you'}
            </SheetDescription>
            {/* Search in list */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search by name, type, or award..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-4 p-1 mx-4 mt-4 bg-white/10" style={{ width: 'calc(100% - 32px)' }}>
              <TabsTrigger value="all" onClick={() => setPlacesFilter('all')} className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white">All</TabsTrigger>
              <TabsTrigger value="awarded" onClick={() => setPlacesFilter('awarded')} className="text-white/70 data-[state=active]:bg-yellow-500/30 data-[state=active]:text-yellow-300">🏆</TabsTrigger>
              <TabsTrigger value="bar" onClick={() => setPlacesFilter('bar')} className="text-white/70 data-[state=active]:bg-purple-500/30 data-[state=active]:text-purple-300">🍺</TabsTrigger>
              <TabsTrigger value="restaurant" onClick={() => setPlacesFilter('restaurant')} className="text-white/70 data-[state=active]:bg-orange-500/30 data-[state=active]:text-orange-300">🍽️</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="p-4 space-y-3">
                {filteredPlaces.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No venues found</p>
                  </div>
                ) : (
                  filteredPlaces.map((place) => (
                    <motion.div
                      key={place.id}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                      onClick={() => handlePlaceClick(place)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg
                          ${place.type === 'bar' ? 'bg-purple-500/30' : 
                            place.type === 'restaurant' ? 'bg-orange-500/30' : 
                            'bg-amber-500/30'}`}
                        >
                          {place.type === 'bar' ? '🍺' : place.type === 'restaurant' ? '🍽️' : '☕'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm truncate text-white">{place.name}</h4>
                            {place.awards && place.awards.length > 0 && (
                              <Badge className="bg-yellow-500/30 text-yellow-300 text-[10px] px-1.5">
                                🏆 {place.awards.length}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-white/50 capitalize">
                            {place.type}{place.cuisine ? ` • ${place.cuisine}` : ''}
                          </p>
                          {place.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium text-white/80">{place.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {place.awards && place.awards.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {place.awards.slice(0, 2).map((award, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                                  {award.award}
                                </Badge>
                              ))}
                              {place.awards.length > 2 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                                  +{place.awards.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Awards Organizations Sheet */}
      <Sheet open={showAwardsOrgs} onOpenChange={setShowAwardsOrgs}>
        <SheetContent side="right" className="w-full sm:w-[450px] p-0 bg-black/70 backdrop-blur-2xl border-l border-white/10">
          <SheetHeader className="p-4 border-b border-white/10">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-yellow-500" />
              Award Organizations
            </SheetTitle>
            <SheetDescription className="text-white/60">
              Browse venues by award-granting companies
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4 space-y-3">
              {/* Active Filter Indicator */}
              {selectedOrgFilter && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-yellow-300">
                      Filtering: {AWARD_ORGANIZATIONS.find(o => o.id === selectedOrgFilter)?.name}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setSelectedOrgFilter(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {AWARD_ORGANIZATIONS.map((org) => {
                const venues = getVenuesByOrg(org.id);
                return (
                  <motion.div
                    key={org.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedOrgFilter === org.id 
                        ? 'bg-yellow-500/20 border-yellow-500/40' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => {
                      setSelectedOrgFilter(selectedOrgFilter === org.id ? null : org.id);
                      if (venues.length > 0) {
                        setShowPlacesList(true);
                      }
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${org.color} flex items-center justify-center text-2xl text-white shadow-lg`}>
                        {org.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-base text-white">{org.name}</h4>
                          <Badge className="bg-white/10 text-white/80">
                            {venues.length} venues
                          </Badge>
                        </div>
                        <p className="text-xs text-white/50 mt-1">{org.description}</p>
                        
                        {/* Award types */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {org.awards.slice(0, 3).map((award, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                              {award}
                            </Badge>
                          ))}
                          {org.awards.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/60">
                              +{org.awards.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Venue preview */}
                        {venues.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wide">Top Venues</p>
                            <div className="space-y-1.5">
                              {venues.slice(0, 3).map((venue) => (
                                <div 
                                  key={venue.id} 
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAwardsOrgs(false);
                                    handlePlaceClick(venue);
                                  }}
                                >
                                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs
                                    ${venue.type === 'bar' ? 'bg-purple-500/30' : 
                                      venue.type === 'restaurant' ? 'bg-orange-500/30' : 
                                      'bg-amber-500/30'}`}
                                  >
                                    {venue.type === 'bar' ? '🍺' : venue.type === 'restaurant' ? '🍽️' : '☕'}
                                  </div>
                                  <span className="text-xs font-medium truncate flex-1 text-white/80">{venue.name}</span>
                                  <Navigation className="w-3 h-3 text-white/40" />
                                </div>
                              ))}
                            </div>
                            {venues.length > 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-xs text-white/60 hover:text-white hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrgFilter(org.id);
                                  setShowPlacesList(true);
                                }}
                              >
                                View all {venues.length} venues →
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Venue Detail Sheet */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-[1001] bg-black/50 backdrop-blur-xl rounded-t-[2rem]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 pb-6">
              {/* Handle */}
              <div className="w-10 h-1 bg-white/40 rounded-full mx-auto mb-3" />
              
              {/* Close Button - More prominent */}
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all"
                onClick={() => setSelectedPlace(null)}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-4 mb-4 pr-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                  ${selectedPlace.type === 'bar' ? 'bg-purple-500/40' : 
                    selectedPlace.type === 'restaurant' ? 'bg-orange-500/40' : 
                    'bg-amber-500/40'}`}
                >
                  {selectedPlace.type === 'bar' ? '🍺' : selectedPlace.type === 'restaurant' ? '🍽️' : '☕'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedPlace.name}</h2>
                  <p className="text-sm text-white/60 capitalize">
                    {selectedPlace.type}{selectedPlace.cuisine ? ` • ${selectedPlace.cuisine}` : ''}
                  </p>
                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-white">{selectedPlace.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Awards - Enhanced Display */}
              {selectedPlace.awards && selectedPlace.awards.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white/80">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Awards & Recognition ({selectedPlace.awards.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                    {selectedPlace.awards.map((award, i) => {
                      const org = AWARD_ORGANIZATIONS.find(o => o.id === award.organization);
                      return (
                        <div 
                          key={i} 
                          className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                        >
                          <div className={`w-10 h-10 rounded-lg ${org?.color || 'bg-yellow-500'} flex items-center justify-center text-lg shadow-md`}>
                            {org?.icon || '🏆'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-yellow-300 truncate">{award.award}</p>
                            <p className="text-xs text-white/50">{org?.name || 'Award'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 mb-4">
                {selectedPlace.address && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <MapPinned className="w-4 h-4 text-white/50" />
                    <span>{selectedPlace.address}</span>
                  </div>
                )}
                {selectedPlace.openingHours && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">Hours:</span>
                    <span className="text-white/70">{selectedPlace.openingHours}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0" 
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lon}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Directions
                </Button>
                {selectedPlace.website && (
                  <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => window.open(selectedPlace.website, '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="h-[450px] rounded-t-3xl bg-black/70 backdrop-blur-2xl border-t border-white/10">
          <SheetHeader>
            <SheetTitle className="text-white">Map Settings</SheetTitle>
            <SheetDescription className="text-white/60">
              Customize your map tracking and visibility preferences
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-center" className="text-base font-medium text-white">
                  Auto-Center on Location
                </Label>
                <p className="text-sm text-white/50">
                  Automatically center map as you move
                </p>
              </div>
              <Switch
                id="auto-center"
                checked={autoCenter}
                onCheckedChange={setAutoCenter}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="ghost-mode" className="text-base font-medium text-white">
                  Ghost Mode
                </Label>
                <p className="text-sm text-white/50">
                  Hide your location from others
                </p>
              </div>
              <Switch
                id="ghost-mode"
                checked={ghostMode}
                onCheckedChange={handleToggleGhostMode}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="show-places" className="text-base font-medium text-white">
                  Show Bars & Restaurants
                </Label>
                <p className="text-sm text-white/50">
                  Display nearby venues on the map
                </p>
              </div>
              <Switch
                id="show-places"
                checked={showPlaces}
                onCheckedChange={setShowPlaces}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="satellite-mode" className="text-base font-medium text-white">
                  Satellite View
                </Label>
                <p className="text-sm text-white/50">
                  Switch between street and satellite imagery
                </p>
              </div>
              <Switch
                id="satellite-mode"
                checked={satelliteMode}
                onCheckedChange={setSatelliteMode}
              />
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 ${isTracking ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {isTracking ? 'GPS Active' : 'GPS Inactive'}
                  </p>
                  <p className="text-xs text-white/50">
                    {viewMode === 'city' ? `City view (${CITY_RADIUS_KM}km)` : `Nearby view (${NEARBY_RADIUS_KM}km)`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LiveMap;
