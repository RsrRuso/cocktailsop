import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Youtube } from "lucide-react";

const UpdateMusicLibrary = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateTracks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-spotify-tracks');

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || `Successfully updated ${data.count} tracks!`);
      } else {
        toast.error("Failed to update music library");
      }
    } catch (error) {
      console.error('Error updating music library:', error);
      toast.error("Failed to update music library");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="glass rounded-xl p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Youtube className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold">Update Music Library</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Click the button below to fetch popular music videos from YouTube across various genres (pop, hip hop, rock, electronic) 
          and recent years. The library will be updated with ~50 trending music videos that users can play in full.
        </p>
        <div className="bg-accent/50 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium mb-2">✨ Full Playback Available</p>
          <p className="text-xs text-muted-foreground">
            Unlike Spotify previews, YouTube integration allows users to listen to complete tracks through embedded video players.
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
              Fetching from YouTube...
            </>
          ) : (
            <>
              <Youtube className="mr-2 h-4 w-4" />
              Update Music Library
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UpdateMusicLibrary;
