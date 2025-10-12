import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music, X } from "lucide-react";

const SpotifyConnect = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('spotify_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setConnected(true);
      }
    } catch (error) {
      console.error('Error checking Spotify connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-oauth-callback`;
    const scopes = [
      'user-read-email',
      'user-read-private',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
      'user-top-read',
      'user-read-recently-played',
      'streaming',
      'user-modify-playback-state',
      'user-read-playback-state'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&show_dialog=true`;

    // Open Spotify auth in new window
    const width = 500;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      authUrl,
      'Spotify Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for successful connection
    window.addEventListener('message', handleAuthMessage);
  };

  const handleAuthMessage = async (event: MessageEvent) => {
    if (event.data.type === 'spotify-auth-success') {
      window.removeEventListener('message', handleAuthMessage);
      await checkConnection();
      toast.success('Spotify connected successfully!');
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('spotify_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConnected(false);
      toast.success('Spotify disconnected');
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      toast.error('Failed to disconnect Spotify');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="gap-2"
        >
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span className="text-xs">Connected</span>
          <X className="w-3 h-3" />
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={handleConnect}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <Music className="w-4 h-4" />
          <span className="text-xs">Connect Spotify</span>
        </Button>
      )}
    </div>
  );
};

export default SpotifyConnect;