import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin, Settings2, X, Navigation, Users, ArrowLeft } from 'lucide-react';
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

const LiveMap = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [ghostMode, setGhostMode] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const { position, isTracking, toggleGhostMode } = useGPSTracking(!ghostMode);
  const { toast } = useToast();

  // Initialize Leaflet map (OpenStreetMap tiles, no API token needed)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const initialCenter: [number, number] = position
        ? [position.latitude, position.longitude]
        : [40, -74.5];

      const map = L.map(mapContainerRef.current).setView(initialCenter, 12);

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

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
  }, []);

  // Center map and update current user marker when GPS position changes
  useEffect(() => {
    if (!mapRef.current || !position) return;

    const map = mapRef.current;
    const userKey = 'current-user';

    // Only auto-center if the setting is enabled
    if (autoCenter) {
      map.flyTo([position.latitude, position.longitude], 12);
    }

    // If ghost mode is enabled, remove marker but keep tracking
    if (ghostMode) {
      if (markersRef.current[userKey]) {
        markersRef.current[userKey].remove();
        delete markersRef.current[userKey];
      }
      return;
    }

    // Normal mode: show marker
    if (markersRef.current[userKey]) {
      markersRef.current[userKey].setLatLng([position.latitude, position.longitude]);
    } else {
      const marker = L.marker([position.latitude, position.longitude], {
        icon: createUserIcon('You', undefined, true),
      }).bindPopup('You are here');

      marker.addTo(map);
      markersRef.current[userKey] = marker;
    }
  }, [position, ghostMode, autoCenter]);

  const fetchLocations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get followers and followings (mutual follows)
    const { data: follows } = await supabase
      .from('follows')
      .select('follower_id, following_id')
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

    if (!follows || follows.length === 0) {
      setLocations([]);
      return;
    }

    const friendIds = new Set<string>();
    follows.forEach(follow => {
      if (follow.follower_id === user.id) friendIds.add(follow.following_id);
      if (follow.following_id === user.id) friendIds.add(follow.follower_id);
    });

    // Fetch locations for followers/followings (no join to avoid FK requirement)
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

    // Fetch profile data separately for usernames / avatars (non-blocking)
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

      if (mapRef.current) {
        const map = mapRef.current;

        // Clear old markers except current user
        Object.keys(markersRef.current).forEach((key) => {
          if (key !== 'current-user') {
            markersRef.current[key].remove();
            delete markersRef.current[key];
          }
        });

        // Add markers for all followers/followings
        locationRows.forEach((location: any) => {
          if (!location.user_id || location.latitude == null || location.longitude == null) return;

          const profile = profileById[location.user_id];
          const username = profile?.username || 'Friend';
          const avatarUrl = profile?.avatar_url || undefined;
          
          const marker = L.marker([location.latitude, location.longitude], {
            icon: createUserIcon(username[0]?.toUpperCase() || 'F', avatarUrl),
          }).bindPopup(`
            <div class="font-semibold">${username}</div>
            ${location.ghost_mode ? '<div class="text-xs text-muted-foreground">👻 Ghost Mode</div>' : ''}
          `);

          marker.addTo(map);
          markersRef.current[location.user_id] = marker;
        });
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
  }, []);

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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-background/80" />

      {/* Mobile-Friendly Control Panel - Top Left */}
      <motion.div 
        className="absolute top-4 left-4 flex flex-col gap-3 z-[1000]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* Back Button */}
        <Button
          onClick={() => window.history.back()}
          variant="default"
          size="icon"
          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-primary/20 hover:border-primary/40 transition-all"
        >
          <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>

        {/* Settings Button */}
        <Button
          onClick={() => setShowSettings(true)}
          variant="default"
          size="icon"
          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-primary/20 hover:border-primary/40 transition-all"
        >
          <Settings2 className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>

        {/* Ghost Mode Toggle */}
        <Button
          onClick={handleToggleGhostMode}
          variant={ghostMode ? 'destructive' : 'default'}
          size="icon"
          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full shadow-xl backdrop-blur-xl border-2"
        >
          {ghostMode ? <EyeOff className="w-6 h-6 sm:w-5 sm:h-5" /> : <Eye className="w-6 h-6 sm:w-5 sm:h-5" />}
        </Button>

        {/* Center on User Button */}
        {position && (
          <Button
            onClick={handleCenterOnUser}
            variant="default"
            size="icon"
            className="w-14 h-14 sm:w-12 sm:h-12 rounded-full shadow-xl bg-background/90 backdrop-blur-xl border-2 border-blue-500/20 hover:border-blue-500/40 transition-all"
          >
            <Navigation className="w-6 h-6 sm:w-5 sm:h-5 text-blue-500" />
          </Button>
        )}
      </motion.div>

      {/* Status Indicator - Bottom Left */}
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

      {/* Nearby Users Count - Top Right */}
      <motion.div 
        className="absolute top-4 right-4 bg-background/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl z-[1000] border border-border/50"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">Nearby</span>
            <span className="text-sm font-bold">
              {locations.length} {locations.length === 1 ? 'friend' : 'friends'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Settings Sheet - Mobile Friendly */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="h-[400px] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Map Settings</SheetTitle>
            <SheetDescription>
              Customize your map tracking and visibility preferences
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Auto-Center Setting */}
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

            {/* Ghost Mode Setting */}
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

            {/* GPS Tracking Status */}
            <div className="flex items-center justify-between space-x-4 p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 ${isTracking ? 'text-green-500' : 'text-red-500'}`} />
                <div className="flex-1 space-y-1">
                  <Label className="text-base font-medium">GPS Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    {isTracking ? 'Location services active' : 'Location services inactive'}
                  </p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full animate-pulse ${isTracking ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {/* Nearby Friends Info */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Nearby Friends</p>
                  <p className="text-xs text-muted-foreground">
                    {locations.length} mutual {locations.length === 1 ? 'follow' : 'follows'} visible on map
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
