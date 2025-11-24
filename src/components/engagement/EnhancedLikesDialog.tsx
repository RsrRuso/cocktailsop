import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ContentType, Like, getEngagementConfig } from "@/types/engagement";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedLikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
}

export const EnhancedLikesDialog = ({ open, onOpenChange, contentType, contentId }: EnhancedLikesDialogProps) => {
  const navigate = useNavigate();
  const [likes, setLikes] = useState<Like[]>([]);
  const [filteredLikes, setFilteredLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (open && contentId) {
      fetchLikes();
    }
  }, [open, contentId, contentType]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = likes.filter(
        like =>
          like.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          like.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLikes(filtered);
    } else {
      setFilteredLikes(likes);
    }
  }, [searchQuery, likes]);

  const fetchLikes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(config.tables.likes as any)
        .select(`
          user_id,
          created_at,
          profiles!inner (username, avatar_url, full_name)
        `)
        .eq(config.tables.idColumn, contentId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLikes(data.map((item: any) => ({
          user_id: item.user_id,
          created_at: item.created_at,
          profiles: item.profiles
        })));
      }
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
    setLoading(false);
  };

  const getContentLabel = () => {
    const labels = {
      post: 'Post',
      reel: 'Reel',
      story: 'Story',
      music_share: 'Music',
      event: 'Event'
    };
    return labels[contentType];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-red-500 text-red-500 animate-pulse" />
            {filteredLikes.length} {filteredLikes.length === 1 ? 'Like' : 'Likes'}
          </DialogTitle>
        </DialogHeader>

        {likes.length > 5 && (
          <div className="px-4 sm:px-6 pt-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-accent/50 border-border/50"
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-4 sm:px-6 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                className="rounded-full h-10 w-10 border-4 border-primary/30 border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : filteredLikes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>{searchQuery ? 'No users found' : 'No likes yet'}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-1 pb-4">
                {filteredLikes.map((like, index) => (
                  <motion.div
                    key={like.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-3 sm:p-4 rounded-xl hover:bg-accent/50 active:bg-accent active:scale-[0.98] transition-all cursor-pointer group"
                    onClick={() => {
                      navigate(`/user/${like.user_id}`);
                      onOpenChange(false);
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                      <AvatarImage src={like.profiles.avatar_url || undefined} />
                      <AvatarFallback className="text-base sm:text-lg font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                        {like.profiles.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{like.profiles.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        @{like.profiles.username}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Heart className="w-4 h-4 fill-red-500 text-red-500 shrink-0" />
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
