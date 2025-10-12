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
      const { data, error } = await supabase.functions.invoke('fetch-spotify-tracks');

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
          Load a curated collection of 25+ popular music tracks. This library includes classics and hits 
          from various genres - all fully playable through YouTube.
        </p>
        <div className="bg-accent/50 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium mb-2">🎵 No API Keys Required</p>
          <p className="text-xs text-muted-foreground">
            Pre-selected collection of popular tracks ready to use. Each track plays in full through YouTube embeds.
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
