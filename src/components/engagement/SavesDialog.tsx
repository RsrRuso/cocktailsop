import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SavesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'post' | 'reel';
  contentId: string;
}

interface SaveUser {
  id: string;
  user_id: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const SavesDialog = ({ open, onOpenChange, contentType, contentId }: SavesDialogProps) => {
  const [saves, setSaves] = useState<SaveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && contentId) {
      fetchSaves();
    }
  }, [open, contentId, contentType]);

  const fetchSaves = async () => {
    setLoading(true);
    try {
      let saveData: { id: string; user_id: string; created_at: string }[] = [];
      
      if (contentType === 'post') {
        const { data, error } = await supabase
          .from('post_saves')
          .select('id, user_id, created_at')
          .eq('post_id', contentId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        saveData = data || [];
      } else {
        const { data, error } = await supabase
          .from('reel_saves')
          .select('id, user_id, created_at')
          .eq('reel_id', contentId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        saveData = data || [];
      }

      // Fetch profiles separately
      if (saveData.length > 0) {
        const userIds = saveData.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedSaves = saveData.map(s => ({
          ...s,
          username: profileMap.get(s.user_id)?.username || 'Unknown',
          full_name: profileMap.get(s.user_id)?.full_name || null,
          avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
        }));
        
        setSaves(enrichedSaves);
      } else {
        setSaves([]);
      }
    } catch (error) {
      console.error("Error fetching saves:", error);
      setSaves([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-yellow-500" />
            Saved By
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : saves.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No saves yet</p>
        ) : (
          <div className="space-y-3">
            {saves.map((save) => (
              <div 
                key={save.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  navigate(`/user/${save.user_id}`);
                  onOpenChange(false);
                }}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={save.avatar_url || undefined} />
                  <AvatarFallback>{save.username?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {save.full_name || save.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{save.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
