import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search, Clock, Sparkles, Camera, Music, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ContentType, getEngagementConfig, Like } from '@/types/engagement';
import { toast } from 'sonner';

interface EnhancedLikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
}

export const EnhancedLikesDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
}: EnhancedLikesDialogProps) => {
  const navigate = useNavigate();
  const [likes, setLikes] = useState<Like[]>([]);
  const [filteredLikes, setFilteredLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (open) {
      fetchLikes();
    }
  }, [open, contentId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLikes(likes);
    } else {
      const filtered = likes.filter(
        (like) =>
          like.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          like.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLikes(filtered);
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
        .order('created_at', { ascending: false });

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

  const handleShareToStory = () => {
    navigate('/create/story', { state: { shareContent: { type: contentType, id: contentId } } });
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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 sm:inset-x-4 sm:top-[5%] sm:bottom-[5%] z-50 mx-auto sm:max-w-2xl flex flex-col overflow-hidden">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <Heart className="w-6 h-6 text-white fill-current" />
                </div>
              </div>
              <div className="flex-1">
                <DialogPrimitive.Title className="text-xl font-semibold text-white">
                  Likes
                </DialogPrimitive.Title>
                <p className="text-sm text-white/60">{likes.length} people liked this</p>
              </div>
            </div>
          </div>

          {/* Share Options */}
          <div className="flex items-center justify-around py-4 px-6">
            <button
              onClick={handleShareToStory}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm text-white/80">Story</span>
            </button>
            <button
              onClick={handleShareToMusic}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center">
                <Music className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm text-white/80">Music</span>
            </button>
            <button
              onClick={handleShareToStatus}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm text-white/80">Status</span>
            </button>
          </div>

          {/* Search */}
          {likes.length > 3 && (
            <div className="px-6 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Likes List - Scrollable */}
          <ScrollArea className="flex-1 mt-4">
            <div className="px-6 pb-6 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                  </div>
                </div>
              ) : filteredLikes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30"></div>
                    <Heart className="relative w-16 h-16 text-white/40" />
                  </div>
                  <p className="text-white/60 font-medium">
                    {searchQuery ? 'No users found' : 'No likes yet'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {searchQuery ? 'Try a different search term' : 'Be the first to show some love!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredLikes.map((like, index) => (
                      <motion.div
                        key={like.user_id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => {
                          navigate(`/user/${like.user_id}`);
                          onOpenChange(false);
                        }}
                        className="group relative flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 cursor-pointer transition-all backdrop-blur-sm"
                      >
                        <Avatar className="relative ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
                          <AvatarImage src={like.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {like.profiles.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="relative flex-1 min-w-0">
                          <p className="font-semibold truncate text-white group-hover:text-purple-300 transition-colors">
                            {like.profiles.full_name || like.profiles.username}
                          </p>
                          <p className="text-sm text-white/60 truncate">
                            @{like.profiles.username}
                          </p>
                        </div>
                        
                        <div className="relative flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                          </div>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-pink-500/20 text-pink-300 border-0">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              Recent
                            </Badge>
                          )}
                        </div>
                        
                        <Heart className="relative w-4 h-4 text-red-500 fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
