import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StoryViewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
}

interface Viewer {
  user_id: string;
  viewed_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

const StoryViewersDialog = ({ open, onOpenChange, storyId }: StoryViewersDialogProps) => {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && storyId) {
      fetchViewers();
    }
  }, [open, storyId]);

  const fetchViewers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_views")
      .select(`
        user_id,
        viewed_at,
        profiles (username, avatar_url, full_name)
      `)
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });

    if (!error && data) {
      setViewers(data as any);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Story Viewers
          </DialogTitle>
          <DialogDescription>
            {viewers.length} {viewers.length === 1 ? 'person has' : 'people have'} viewed this story
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : viewers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No views yet
            </div>
          ) : (
            <div className="space-y-3">
              {viewers.map((viewer) => (
                <div
                  key={viewer.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={viewer.profiles.avatar_url || undefined} />
                    <AvatarFallback>{viewer.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{viewer.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{viewer.profiles.username}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewersDialog;
