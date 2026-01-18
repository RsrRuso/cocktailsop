import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export type StoryProfileLite = {
  username: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
};

export type Story = {
  id: string;
  user_id: string;
  media_urls: string[] | null;
  media_types: string[] | null;
  expires_at: string;
  created_at: string;
  profiles: StoryProfileLite | null;
};

export type GroupedStory = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  isBirthday: boolean;
  stories: Story[];
  latestStory: Story;
};

// Check if today is user's birthday
function isBirthdayToday(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return false;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  return today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
}

export function useStoriesData(userId?: string) {
  return useQuery({
    queryKey: ['stories', userId],
    queryFn: async (): Promise<{ stories: GroupedStory[]; userHasStory: boolean }> => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_urls,
          media_types,
          expires_at,
          created_at,
          profiles (username, avatar_url, date_of_birth)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group stories by user
      const storiesByUser = new Map<string, Story[]>();
      (data ?? []).forEach((story: any) => {
        const existing = storiesByUser.get(story.user_id) || [];
        existing.push(story as Story);
        storiesByUser.set(story.user_id, existing);
      });

      // Create grouped stories
      const groupedStories: GroupedStory[] = [];
      storiesByUser.forEach((userStories, storyUserId) => {
        const latestStory = userStories[0];
        const profile = latestStory.profiles;
        groupedStories.push({
          userId: storyUserId,
          username: profile?.username ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          isBirthday: isBirthdayToday(profile?.date_of_birth ?? null),
          stories: userStories,
          latestStory,
        });
      });

      // Sort: current user first, then by latest story time
      groupedStories.sort((a, b) => {
        if (a.userId === userId) return -1;
        if (b.userId === userId) return 1;
        return new Date(b.latestStory.created_at).getTime() - new Date(a.latestStory.created_at).getTime();
      });

      const userHasStory = userId ? groupedStories.some((g) => g.userId === userId) : false;

      return { stories: groupedStories, userHasStory };
    },
    staleTime: 60_000,
  });
}

// Get single story details
export function useStoryDetails(storyId: string) {
  return useQuery({
    queryKey: ['story', storyId],
    enabled: !!storyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_urls,
          media_types,
          expires_at,
          created_at,
          profiles (username, avatar_url, full_name)
        `)
        .eq('id', storyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// Get all stories for a specific user
export function useUserStories(userId: string) {
  return useQuery({
    queryKey: ['user-stories', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_urls,
          media_types,
          expires_at,
          created_at
        `)
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// Mark story as viewed
export function useMarkStoryViewed(userId?: string) {
  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!userId) throw new Error('Not signed in');
      
      const { error } = await supabase
        .from('story_views')
        .upsert({ story_id: storyId, user_id: userId }, { onConflict: 'story_id,user_id' });

      if (error && error.code !== '23505') throw error;
      return storyId;
    },
  });
}

// Create a new story
export function useCreateStory(userId?: string) {
  return useMutation({
    mutationFn: async ({ mediaUrls, mediaTypes }: { mediaUrls: string[]; mediaTypes: string[] }) => {
      if (!userId) throw new Error('Not signed in');
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          media_urls: mediaUrls,
          media_types: mediaTypes,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

// Delete a story
export function useDeleteStory(userId?: string) {
  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!userId) throw new Error('Not signed in');
      
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', userId);

      if (error) throw error;
      return storyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}
