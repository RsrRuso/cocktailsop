import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

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
    if (!mapRef.current || !position || ghostMode) return;

    const map = mapRef.current;
    const userKey = 'current-user';

    map.flyTo([position.latitude, position.longitude], 12);

    if (markersRef.current[userKey]) {
      markersRef.current[userKey].setLatLng([position.latitude, position.longitude]);
    } else {
      const marker = L.marker([position.latitude, position.longitude], {
        icon: createUserIcon('You', undefined, true),
      }).bindPopup('You are here');

      marker.addTo(map);
      markersRef.current[userKey] = marker;
    }
  }, [position, ghostMode]);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .eq('ghost_mode', false);

    if (error) {
      console.error('Error fetching locations:', error);
      setMapError('Failed to load locations');
      return;
    }

    if (data) {
      setLocations(data);

      if (mapRef.current) {
        const map = mapRef.current;

        // Clear old markers except current user
        Object.keys(markersRef.current).forEach((key) => {
          if (key !== 'current-user') {
            markersRef.current[key].remove();
            delete markersRef.current[key];
          }
        });

        // Add markers for other users
        data.forEach((location: any) => {
          if (!location.user_id || location.latitude == null || location.longitude == null) return;

          const marker = L.marker([location.latitude, location.longitude], {
            icon: createUserIcon('U'),
          }).bindPopup('<div class="font-semibold">Friend</div>');

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
      title: newGhostMode ? 'Ghost Mode Enabled' : 'Ghost Mode Disabled',
      description: newGhostMode
        ? 'Your location is now hidden from others'
        : 'Your location is now visible to mutual follows',
    });
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
    <div className="relative w-full h-screen bg-background">
      <div ref={mapContainerRef} className="absolute inset-0 bg-muted" />

      {/* Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <Button
          onClick={handleToggleGhostMode}
          variant={ghostMode ? 'destructive' : 'default'}
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
        >
          {ghostMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </Button>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${isTracking ? 'text-green-500' : 'text-red-500'}`} />
          <span className="text-sm font-medium">
            {ghostMode ? 'Hidden' : isTracking ? 'Tracking' : 'Not Tracking'}
          </span>
        </div>
      </div>

      {/* Mutual follows count */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg z-10">
        <p className="text-sm font-medium">
          {locations.length} mutual {locations.length === 1 ? 'follow' : 'follows'} nearby
        </p>
      </div>
    </div>
  );
};

export default LiveMap;
