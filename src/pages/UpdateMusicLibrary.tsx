import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Music } from "lucide-react";

const UpdateMusicLibrary = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateTracks = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in first");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('fetch-spotify-tracks', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || `Successfully loaded ${data.count} tracks!`);
      } else {
        toast.error("Failed to load music library");
      }
    } catch (error) {
      console.error('Error loading music library:', error);
      toast.error("Failed to load music library");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="glass rounded-xl p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Music className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Music Library</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Sync your Spotify library to share your favorite tracks with others. 
          This will load up to 50 of your saved tracks from Spotify.
        </p>
        <div className="bg-accent/50 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium mb-2">🎵 Spotify Connected</p>
          <p className="text-xs text-muted-foreground">
            Your Spotify account is connected. Click below to sync your saved tracks.
          </p>
        </div>
        <Button 
          onClick={handleUpdateTracks} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Music Library...
            </>
          ) : (
            <>
              <Music className="mr-2 h-4 w-4" />
              Load Music Library
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UpdateMusicLibrary;
