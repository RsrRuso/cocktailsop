import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const UpdateSpotifyTracks = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateTracks = async () => {
    setIsUpdating(true);
    try {
      // Call edge function which now handles everything including DB update
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'fetch-spotify-tracks'
      );

      if (functionError) throw functionError;

      if (functionData?.success) {
        toast.success(functionData.message || `Successfully updated ${functionData.count} tracks!`);
      } else {
        toast.error("Failed to update music library");
      }
    } catch (error) {
      console.error('Error updating music library:', error);
      toast.error("Failed to update music library");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="glass rounded-xl p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Update Music Library</h1>
        <p className="text-muted-foreground mb-6">
          Click the button below to update the music library with 50 royalty-free tracks with working preview URLs.
        </p>
        <Button 
          onClick={handleUpdateTracks} 
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating Tracks...
            </>
          ) : (
            "Update Music Library"
          )}
        </Button>
      </div>
    </div>
  );
};

export default UpdateSpotifyTracks;
