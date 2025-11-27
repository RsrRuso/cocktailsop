import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const LiveMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<{ [key: string]: any }>({});
  const [ghostMode, setGhostMode] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const { position, isTracking, toggleGhostMode } = useGPSTracking(!ghostMode);
  const { toast } = useToast();

  // Load and initialize map
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainer.current || map.current) return;

      try {
        // Load Mapbox GL CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
        document.head.appendChild(link);

        // Load Mapbox GL JS
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
        script.onload = () => {
          if (!isMounted) return;

          const mapboxgl = (window as any).mapboxgl;
          if (!mapboxgl) {
            setMapError('Failed to load Mapbox library');
            return;
          }

          mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

          try {
            map.current = new mapboxgl.Map({
              container: mapContainer.current,
              style: 'mapbox://styles/mapbox/dark-v11',
              center: position ? [position.longitude, position.latitude] : [-74.5, 40],
              zoom: 12,
            });

            map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          } catch (error) {
            console.error('Map initialization error:', error);
            setMapError('Failed to initialize map');
          }
        };
        script.onerror = () => {
          setMapError('Failed to load Mapbox script');
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Mapbox:', error);
        setMapError('Failed to load map library');
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map center when user position changes
  useEffect(() => {
    if (map.current && position && !ghostMode) {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) return;

      map.current.flyTo({
        center: [position.longitude, position.latitude],
        zoom: 12,
        essential: true
      });

      // Add or update user's own marker
      const userId = 'current-user';
      if (markers.current[userId]) {
        markers.current[userId].setLngLat([position.longitude, position.latitude]);
      } else {
        const el = document.createElement('div');
        el.className = 'w-10 h-10 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs';
        el.textContent = 'You';
        
        markers.current[userId] = new mapboxgl.Marker(el)
          .setLngLat([position.longitude, position.latitude])
          .addTo(map.current);
      }
    }
  }, [position, ghostMode]);

  // Subscribe to location updates
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
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('user_locations')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          full_name
        )
      `)
      .eq('ghost_mode', false);

    if (data && map.current) {
      setLocations(data);

      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) return;

      // Clear old markers (except current user)
      Object.keys(markers.current).forEach(key => {
        if (key !== 'current-user') {
          markers.current[key].remove();
          delete markers.current[key];
        }
      });

      // Add new markers
      data.forEach(location => {
        if (location.user_id && map.current) {
          const profile = location.profiles as any;
          
          const el = document.createElement('div');
          el.className = 'w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform';
          
          if (profile?.avatar_url) {
            el.style.backgroundImage = `url(${profile.avatar_url})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
          }

          const marker = new mapboxgl.Marker(el)
            .setLngLat([location.longitude, location.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div class="p-2">
                    <p class="font-semibold">${profile?.username || 'Unknown'}</p>
                    <p class="text-sm text-muted-foreground">${profile?.full_name || ''}</p>
                  </div>
                `)
            )
            .addTo(map.current);

          markers.current[location.user_id] = marker;
        }
      });
    }
  };

  const handleToggleGhostMode = async () => {
    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);
    await toggleGhostMode(newGhostMode);
    
    toast({
      title: newGhostMode ? "Ghost Mode Enabled" : "Ghost Mode Disabled",
      description: newGhostMode 
        ? "Your location is now hidden from others" 
        : "Your location is now visible to mutual follows"
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
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <Button
          onClick={handleToggleGhostMode}
          variant={ghostMode ? "destructive" : "default"}
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
