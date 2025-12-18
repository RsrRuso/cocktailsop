import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileStoriesTabProps {
  userId: string;
}

const ProfileStoriesTab = ({ userId }: ProfileStoriesTabProps) => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    setStories(data || []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { data: story } = await supabase
        .from("stories")
        .select("media_urls")
        .eq("id", storyId)
        .single();

      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;

      if (story?.media_urls) {
        const filePaths = story.media_urls.map((url: string) => {
          const urlParts = url.split('/stories/');
          return urlParts[1];
        }).filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage.from('stories').remove(filePaths);
        }
      }

      toast.success("Story deleted");
      setStories(s => s.filter(story => story.id !== storyId));
    } catch {
      toast.error("Failed to delete story");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="glass rounded-xl p-4 text-center text-muted-foreground border border-border/50">
        <p>No active stories</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {stories.map((story) => (
        <div key={story.id} className="relative glass rounded-xl overflow-hidden group">
          <img 
            src={story.media_urls[0]} 
            alt="Story" 
            className="w-full h-48 object-cover cursor-pointer"
            onClick={() => navigate(`/story/${userId}`)}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStory(story.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {story.media_urls.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              {story.media_urls.length} items
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProfileStoriesTab;
