import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search, Clock, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ContentType, getEngagementConfig, Like } from '@/types/engagement';

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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg max-h-[70vh] flex flex-col bg-background rounded-t-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-500 fill-current" />
              <div>
                <DialogPrimitive.Title className="font-semibold text-foreground">
                  Likes
                </DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground">{likes.length} people</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          {likes.length > 5 && (
            <div className="px-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-muted/50 border-0"
                />
              </div>
            </div>
          )}

          {/* Likes List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredLikes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Heart className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No users found' : 'No likes yet'}
                  </p>
                </div>
              ) : (
                filteredLikes.map((like) => (
                  <div
                    key={like.user_id}
                    onClick={() => {
                      navigate(`/user/${like.user_id}`);
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={like.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {like.profiles.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">
                        {like.profiles.full_name || like.profiles.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{like.profiles.username}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
