import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin, Settings2, Navigation, Users, ArrowLeft, UtensilsCrossed, Wine, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
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

const NEARBY_RADIUS_KM = 5;

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

const createPlaceIcon = (type: 'bar' | 'restaurant' | 'cafe') => {
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
      <div class="w-8 h-8 ${colors[type]} rounded-lg shadow-lg flex items-center justify-center text-white text-sm border-2 border-white">
        ${icons[type]}
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface Place {
  id: number;
  name: string;
  type: 'bar' | 'restaurant' | 'cafe';
  lat: number;
  lon: number;
  rating?: number;
  cuisine?: string;
}

const LiveMap = () => {
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
  const [autoCenter, setAutoCenter] = useState(true);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
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

  // Fetch nearby bars and restaurants from OpenStreetMap Overpass API
  const fetchNearbyPlaces = useCallback(async (lat: number, lon: number) => {
    if (!showPlaces) return;
    setLoadingPlaces(true);
    
    try {
      const radiusMeters = NEARBY_RADIUS_KM * 1000;
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="bar"](around:${radiusMeters},${lat},${lon});
          node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
          node["amenity"="pub"](around:${radiusMeters},${lat},${lon});
          node["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
        );
        out body 100;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' }
      });

      if (!response.ok) throw new Error('Failed to fetch places');

      const data = await response.json();
      
      const fetchedPlaces: Place[] = data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          let type: 'bar' | 'restaurant' | 'cafe' = 'restaurant';
          if (el.tags.amenity === 'bar' || el.tags.amenity === 'pub') type = 'bar';
          else if (el.tags.amenity === 'cafe') type = 'cafe';
          
          return {
            id: el.id,
            name: el.tags.name,
            type,
            lat: el.lat,
            lon: el.lon,
            cuisine: el.tags.cuisine,
            rating: el.tags['rating'] ? parseFloat(el.tags['rating']) : undefined
          };
        });

      setPlaces(fetchedPlaces);
    } catch (error) {
      console.error('Error fetching places:', error);
    } finally {
      setLoadingPlaces(false);
    }
  }, [showPlaces]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const initialCenter: [number, number] = position
        ? [position.latitude, position.longitude]
        : [40, -74.5];

      const map = L.map(mapContainerRef.current).setView(initialCenter, 14);

      const streetLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      );

      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 19,
        }
      );

      (satelliteMode ? satelliteLayer : streetLayer).addTo(map);
      mapRef.current = map;
    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteMode]);

  // Center map and update current user marker when GPS position changes
  useEffect(() => {
    if (!mapRef.current || !position) return;

    const map = mapRef.current;
    const userKey = 'current-user';

    if (autoCenter) {
      map.flyTo([position.latitude, position.longitude], 14);
    }

    // Fetch nearby places when position updates
    fetchNearbyPlaces(position.latitude, position.longitude);

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
  }, [position, ghostMode, autoCenter, fetchNearbyPlaces]);

  // Add place markers to map
  useEffect(() => {
    if (!mapRef.current || !showPlaces) return;

    // Clear old place markers
    placeMarkersRef.current.forEach(marker => marker.remove());
    placeMarkersRef.current = [];

    places.forEach(place => {
      const marker = L.marker([place.lat, place.lon], {
        icon: createPlaceIcon(place.type),
      }).bindPopup(`
        <div class="p-2 min-w-[150px]">
          <div class="font-bold text-sm">${place.name}</div>
          <div class="text-xs text-gray-500 capitalize">${place.type}${place.cuisine ? ` • ${place.cuisine}` : ''}</div>
          ${place.rating ? `<div class="text-xs mt-1">⭐ ${place.rating.toFixed(1)}</div>` : ''}
        </div>
      `);

      marker.addTo(mapRef.current!);
      placeMarkersRef.current.push(marker);
    });
  }, [places, showPlaces]);

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

        // Filter friends within 5km radius
        const nearby: any[] = [];
        
        locationRows.forEach((location: any) => {
          if (!location.user_id || location.latitude == null || location.longitude == null) return;

          const distance = calculateDistance(
            position.latitude,
            position.longitude,
            location.latitude,
            location.longitude
          );

          // Only show friends within 5km
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
      mapRef.current.flyTo([position.latitude, position.longitude], 15);
      toast({
        title: 'Centered on your location',
        description: 'Map view updated',
      });
    }
  };

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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background/60" />

      {/* Control Panel - Top Left */}
      <motion.div 
        className="absolute top-4 left-4 flex flex-col gap-3 z-[1000]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Button
          onClick={() => window.history.back()}
          variant="default"
          size="icon"
          className="w-12 h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-primary/20 hover:border-primary/40"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Button
          onClick={() => setShowSettings(true)}
          variant="default"
          size="icon"
          className="w-12 h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-primary/20 hover:border-primary/40"
        >
          <Settings2 className="w-5 h-5" />
        </Button>

        <Button
          onClick={handleToggleGhostMode}
          variant={ghostMode ? 'destructive' : 'default'}
          size="icon"
          className="w-12 h-12 rounded-full shadow-xl backdrop-blur-xl border-2"
        >
          {ghostMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </Button>

        {position && (
          <Button
            onClick={handleCenterOnUser}
            variant="default"
            size="icon"
            className="w-12 h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-blue-500/20 hover:border-blue-500/40"
          >
            <Navigation className="w-5 h-5 text-blue-500" />
          </Button>
        )}

        <Button
          onClick={() => setSatelliteMode(!satelliteMode)}
          variant="default"
          size="icon"
          className="w-12 h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-primary/20 hover:border-primary/40"
        >
          <MapPin className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Status Panel - Bottom Left */}
      <motion.div 
        className="absolute bottom-20 sm:bottom-4 left-4 bg-background/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl z-[1000] border border-border/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isTracking ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">Status</span>
            <span className="text-sm font-bold">
              {ghostMode ? 'Hidden' : isTracking ? 'Tracking' : 'Not Tracking'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Panel - Top Right */}
      <motion.div 
        className="absolute top-4 right-4 bg-background/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl z-[1000] border border-border/50 space-y-3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* Nearby Friends */}
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">Friends Nearby</span>
            <span className="text-sm font-bold">
              {nearbyFriends.length} within {NEARBY_RADIUS_KM}km
            </span>
          </div>
        </div>

        {/* Places */}
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5 text-orange-500" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">Places</span>
            <span className="text-sm font-bold">
              {loadingPlaces ? 'Loading...' : `${places.length} found`}
            </span>
          </div>
        </div>

        {/* Place type breakdown */}
        {places.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
              🍺 {places.filter(p => p.type === 'bar').length}
            </Badge>
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
              🍽️ {places.filter(p => p.type === 'restaurant').length}
            </Badge>
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
              ☕ {places.filter(p => p.type === 'cafe').length}
            </Badge>
          </div>
        )}
      </motion.div>

      {/* Nearby Friends List - Bottom Right */}
      {nearbyFriends.length > 0 && (
        <motion.div 
          className="absolute bottom-20 sm:bottom-4 right-4 bg-background/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl z-[1000] border border-border/50 max-w-[200px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs font-semibold text-muted-foreground mb-2">Nearby Friends</div>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {nearbyFriends.slice(0, 5).map((friend) => (
              <div key={friend.user_id} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                  style={friend.avatarUrl ? { backgroundImage: `url(${friend.avatarUrl})`, backgroundSize: 'cover' } : {}}
                >
                  {!friend.avatarUrl && friend.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{friend.username}</div>
                  <div className="text-[10px] text-muted-foreground">{friend.distance} km</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="h-[450px] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Map Settings</SheetTitle>
            <SheetDescription>
              Customize your map tracking and visibility preferences
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-center" className="text-base font-medium">
                  Auto-Center on Location
                </Label>
                <p className="text-sm text-muted-foreground">
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
                <Label htmlFor="ghost-mode" className="text-base font-medium">
                  Ghost Mode
                </Label>
                <p className="text-sm text-muted-foreground">
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
                <Label htmlFor="show-places" className="text-base font-medium">
                  Show Bars & Restaurants
                </Label>
                <p className="text-sm text-muted-foreground">
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
                <Label htmlFor="satellite-mode" className="text-base font-medium">
                  Satellite View
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch between street and satellite imagery
                </p>
              </div>
              <Switch
                id="satellite-mode"
                checked={satelliteMode}
                onCheckedChange={setSatelliteMode}
              />
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 ${isTracking ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm font-medium">
                    {isTracking ? 'GPS Active' : 'GPS Inactive'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Showing friends within {NEARBY_RADIUS_KM}km radius
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
