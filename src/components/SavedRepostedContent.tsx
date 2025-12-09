import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bookmark, Repeat2 } from 'lucide-react';
import { FeedItem } from './FeedItem';
import { getBadgeColor } from '@/lib/profileUtils';
import { useOptimisticLike } from '@/hooks/useOptimisticLike';

interface SavedRepostedContentProps {
  userId: string;
}

interface ContentItem {
  id: string;
  type: 'post' | 'reel';
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  save_count?: number;
  repost_count?: number;
  view_count?: number;
  created_at: string;
  saved_at?: string;
  reposted_at?: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    badge_level: string;
    professional_title: string | null;
  };
}

export const SavedRepostedContent = ({ userId }: SavedRepostedContentProps) => {
  const [viewType, setViewType] = useState<'reposts' | 'saves'>('reposts');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());

  // Optimistic like hooks
  const { likedItems: likedPosts, toggleLike: togglePostLike } = useOptimisticLike('post', userId);
  const { likedItems: likedReels, toggleLike: toggleReelLike } = useOptimisticLike('reel', userId);

  const fetchContent = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      let items: ContentItem[] = [];

      if (viewType === 'saves') {
        // Fetch saved posts
        const { data: savedPosts } = await supabase
          .from('post_saves')
          .select(`
            created_at,
            posts:post_id (
              id, content, media_urls, like_count, comment_count, save_count, repost_count, created_at,
              profiles:user_id (id, username, full_name, avatar_url, badge_level, professional_title)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Fetch saved reels
        const { data: savedReels } = await supabase
          .from('reel_saves')
          .select(`
            created_at,
            reels:reel_id (
              id, caption, video_url, like_count, comment_count, save_count, repost_count, view_count, created_at,
              profiles:user_id (id, username, full_name, avatar_url, badge_level, professional_title)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Map posts
        if (savedPosts) {
          const postItems = savedPosts
            .filter((s: any) => s.posts)
            .map((s: any) => ({
              ...s.posts,
              type: 'post' as const,
              saved_at: s.created_at,
              profiles: s.posts.profiles
            }));
          items.push(...postItems);
        }

        // Map reels
        if (savedReels) {
          const reelItems = savedReels
            .filter((s: any) => s.reels)
            .map((s: any) => ({
              ...s.reels,
              type: 'reel' as const,
              content: s.reels.caption,
              media_urls: [s.reels.video_url],
              saved_at: s.created_at,
              profiles: s.reels.profiles
            }));
          items.push(...reelItems);
        }

        // Sort by saved date
        items.sort((a, b) => new Date(b.saved_at!).getTime() - new Date(a.saved_at!).getTime());

      } else {
        // Fetch reposted posts
        const { data: repostedPosts } = await supabase
          .from('post_reposts')
          .select(`
            created_at,
            posts:post_id (
              id, content, media_urls, like_count, comment_count, save_count, repost_count, created_at,
              profiles:user_id (id, username, full_name, avatar_url, badge_level, professional_title)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Fetch reposted reels
        const { data: repostedReels } = await supabase
          .from('reel_reposts')
          .select(`
            created_at,
            reels:reel_id (
              id, caption, video_url, like_count, comment_count, save_count, repost_count, view_count, created_at,
              profiles:user_id (id, username, full_name, avatar_url, badge_level, professional_title)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Map posts
        if (repostedPosts) {
          const postItems = repostedPosts
            .filter((r: any) => r.posts)
            .map((r: any) => ({
              ...r.posts,
              type: 'post' as const,
              reposted_at: r.created_at,
              profiles: r.posts.profiles
            }));
          items.push(...postItems);
        }

        // Map reels
        if (repostedReels) {
          const reelItems = repostedReels
            .filter((r: any) => r.reels)
            .map((r: any) => ({
              ...r.reels,
              type: 'reel' as const,
              content: r.reels.caption,
              media_urls: [r.reels.video_url],
              reposted_at: r.created_at,
              profiles: r.reels.profiles
            }));
          items.push(...reelItems);
        }

        // Sort by reposted date
        items.sort((a, b) => new Date(b.reposted_at!).getTime() - new Date(a.reposted_at!).getTime());
      }

      setContent(items);
    } catch (error) {
      console.error('Error fetching saved/reposted content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, viewType]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleToggleMute = useCallback((videoId: string) => {
    setMutedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Dropdown Selector */}
      <div className="flex items-center gap-3">
        <Select value={viewType} onValueChange={(v) => setViewType(v as 'reposts' | 'saves')}>
          <SelectTrigger className="w-[180px] glass border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reposts">
              <div className="flex items-center gap-2">
                <Repeat2 className="w-4 h-4" />
                <span>Reposts</span>
              </div>
            </SelectItem>
            <SelectItem value="saves">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                <span>Saves</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {content.length} {viewType === 'reposts' ? 'repost' : 'save'}{content.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : content.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground border border-border/50">
          <div className="flex flex-col items-center gap-3">
            {viewType === 'reposts' ? (
              <Repeat2 className="w-12 h-12 opacity-50" />
            ) : (
              <Bookmark className="w-12 h-12 opacity-50" />
            )}
            <p>No {viewType === 'reposts' ? 'reposts' : 'saved items'} yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {content.map((item) => (
            <FeedItem
              key={`${item.type}-${item.id}`}
              item={item}
              currentUserId={userId}
              isLiked={item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)}
              mutedVideos={mutedVideos}
              onLike={() => item.type === 'post' ? togglePostLike(item.id) : toggleReelLike(item.id)}
              onDelete={() => {}}
              onEdit={() => {}}
              onComment={() => fetchContent()}
              onShare={() => {}}
              onToggleMute={handleToggleMute}
              onFullscreen={() => {}}
              onViewLikes={() => {}}
              getBadgeColor={getBadgeColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};
