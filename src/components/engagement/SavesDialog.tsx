import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bookmark, Camera, Music, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

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
  const isMobile = useIsMobile();

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

  const handleShareToStory = () => {
    navigate('/create-story', { state: { shareContent: { type: contentType, id: contentId } } });
    onOpenChange(false);
    toast.success("Opening story creator...");
  };

  const handleShareToMusic = () => {
    navigate('/music', { state: { shareContent: { type: contentType, id: contentId } } });
    onOpenChange(false);
    toast.success("Share to music...");
  };

  const handleShareToStatus = () => {
    toast.success("Share to status...");
    onOpenChange(false);
  };

  const renderShareOptions = () => (
    <div className="flex items-center justify-around py-4 border-b border-white/10">
      <button
        onClick={handleShareToStory}
        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <span className="text-xs text-white/80">Story</span>
      </button>
      <button
        onClick={handleShareToMusic}
        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center">
          <Music className="w-6 h-6 text-white" />
        </div>
        <span className="text-xs text-white/80">Music</span>
      </button>
      <button
        onClick={handleShareToStatus}
        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-xs text-white/80">Status</span>
      </button>
    </div>
  );

  const renderSavesList = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      ) : saves.length === 0 ? (
        <p className="text-center text-white/60 py-8 text-base">No saves yet</p>
      ) : (
        <div className="space-y-2">
          {saves.map((save) => (
            <div 
              key={save.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 active:bg-white/20 cursor-pointer transition-colors"
              onClick={() => {
                navigate(`/user/${save.user_id}`);
                onOpenChange(false);
              }}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={save.avatar_url || undefined} />
                <AvatarFallback className="text-base bg-white/20 text-white">{save.username?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate text-white">
                  {save.full_name || save.username}
                </p>
                <p className="text-sm text-white/60 truncate">
                  @{save.username}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] bg-black/80 backdrop-blur-xl border-0">
          <DrawerHeader className="border-b border-white/10 pb-3">
            <DrawerTitle className="flex items-center justify-center gap-2 text-lg text-white">
              <Bookmark className="w-5 h-5 text-yellow-500" />
              Saved By
            </DrawerTitle>
          </DrawerHeader>
          {renderShareOptions()}
          <div className="overflow-y-auto flex-1 max-h-[50vh] px-4 py-3 pb-safe">
            {renderSavesList()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] bg-black/70 backdrop-blur-xl border-0 z-50">
        <DialogHeader className="border-b border-white/10 pb-3">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Bookmark className="w-5 h-5 text-yellow-500" />
            Saved By
          </DialogTitle>
        </DialogHeader>
        {renderShareOptions()}
        <div className="overflow-y-auto max-h-[50vh] py-2">
          {renderSavesList()}
        </div>
      </DialogContent>
    </Dialog>
  );
};