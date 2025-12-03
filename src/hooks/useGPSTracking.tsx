import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { toast as sonnerToast } from 'sonner';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const PROXIMITY_RADIUS_KM = 5; // 5km radius for "nearby"

export const useGPSTracking = (enabled: boolean = true) => {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const proximityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const checkNearbyFriends = useCallback(async (currentLat: number, currentLon: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || ghostMode) return;

      // Get mutual follows (friends)
      const { data: mutualFollows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;

      const friendIds = mutualFollows?.map(f => f.following_id) || [];
      if (friendIds.length === 0) return;

      // Get locations of friends who are not in ghost mode
      const { data: friendLocations, error: locError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, updated_at, profiles!inner(username, avatar_url)')
        .in('user_id', friendIds)
        .eq('ghost_mode', false)
        .gte('last_updated', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 mins

      if (locError) throw locError;

      // Check each friend's distance
      const nearbyFriends: any[] = [];
      friendLocations?.forEach((location: any) => {
        const distance = calculateDistance(
          currentLat,
          currentLon,
          location.latitude,
          location.longitude
        );

        if (distance <= PROXIMITY_RADIUS_KM) {
          nearbyFriends.push({
            ...location,
            distance: distance.toFixed(1)
          });
        }
      });

      // Send notifications for nearby friends
      if (nearbyFriends.length > 0) {
        // Check if we already notified about these friends recently
        const { data: recentNotifications } = await supabase
          .from('notifications')
          .select('reference_user_id')
          .eq('user_id', user.id)
          .eq('type', 'friend_nearby')
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

        const recentlyNotifiedIds = new Set(recentNotifications?.map(n => n.reference_user_id) || []);

        for (const friend of nearbyFriends) {
          if (!recentlyNotifiedIds.has(friend.user_id)) {
            // Create notification - ignore duplicates
            try {
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: 'friend_nearby',
                content: `${friend.profiles.username} is nearby (${friend.distance} km away) 📍`,
                reference_user_id: friend.user_id,
                read: false
              });

              // Show in-app toast
              sonnerToast.info(`📍 ${friend.profiles.username} is nearby`, {
                description: `${friend.distance} km away from you`,
                duration: 5000
              });
            } catch (e) {
              // Silently ignore duplicate notification errors
              console.log('Notification already exists');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking nearby friends:', error);
    }
  }, [calculateDistance, ghostMode]);

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
            .upsert(
              {
                user_id: user.id,
                latitude: newPosition.latitude,
                longitude: newPosition.longitude,
                accuracy: newPosition.accuracy,
                last_updated: new Date().toISOString()
              },
              { onConflict: 'user_id' }
            );

          // Start proximity checks (every minute)
          checkNearbyFriends(newPosition.latitude, newPosition.longitude);
          proximityCheckRef.current = setInterval(() => {
            if (position) {
              checkNearbyFriends(position.latitude, position.longitude);
            }
          }, 60000);
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
                .upsert(
                  {
                    user_id: user.id,
                    latitude: updatedPosition.latitude,
                    longitude: updatedPosition.longitude,
                    accuracy: updatedPosition.accuracy,
                    last_updated: new Date().toISOString()
                  },
                  { onConflict: 'user_id' }
                );
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
      if (proximityCheckRef.current !== null) {
        clearInterval(proximityCheckRef.current);
      }
    };
  }, [enabled, toast, checkNearbyFriends, position]);

  const toggleGhostMode = async (newGhostMode: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setGhostMode(newGhostMode);
      await supabase
        .from('user_locations')
        .update({ ghost_mode: newGhostMode })
        .eq('user_id', user.id);
    }
  };

  return {
    position,
    isTracking,
    ghostMode,
    toggleGhostMode
  };
};
