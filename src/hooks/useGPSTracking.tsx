import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const useGPSTracking = (enabled: boolean = true) => {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return;
    }

    const startTracking = async () => {
      try {
        // Request permission and get initial position
        const initialPos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });

        const newPosition = {
          latitude: initialPos.coords.latitude,
          longitude: initialPos.coords.longitude,
          accuracy: initialPos.coords.accuracy
        };

        setPosition(newPosition);
        setIsTracking(true);

        // Update location in database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              latitude: newPosition.latitude,
              longitude: newPosition.longitude,
              accuracy: newPosition.accuracy,
              last_updated: new Date().toISOString()
            });
        }

        // Watch position for continuous updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const updatedPosition = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            };

            setPosition(updatedPosition);

            // Update database every 30 seconds
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('user_locations')
                .upsert({
                  user_id: user.id,
                  latitude: updatedPosition.latitude,
                  longitude: updatedPosition.longitude,
                  accuracy: updatedPosition.accuracy,
                  last_updated: new Date().toISOString()
                });
            }
          },
          (error) => {
            console.error('GPS tracking error:', error);
            toast({
              title: "Location Error",
              description: "Unable to track your location",
              variant: "destructive"
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 30000
          }
        );

      } catch (error) {
        console.error('Failed to start GPS tracking:', error);
        toast({
          title: "Location Permission Required",
          description: "Please enable location access to use the map",
          variant: "destructive"
        });
      }
    };

    startTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, toast]);

  const toggleGhostMode = async (ghostMode: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_locations')
        .update({ ghost_mode: ghostMode })
        .eq('user_id', user.id);
    }
  };

  return {
    position,
    isTracking,
    toggleGhostMode
  };
};
