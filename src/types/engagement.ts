// Unified types for all engagement across the app
export type ContentType = 'post' | 'reel' | 'story' | 'music_share' | 'event';

export interface EngagementConfig {
  contentType: ContentType;
  contentId: string;
  tables: {
    likes: string;
    comments: string;
    idColumn: string;
  };
}

export interface ProfileData {
  username: string;
  avatar_url: string | null;
  full_name: string;
}

export interface Like {
  user_id: string;
  created_at: string;
  profiles: ProfileData;
}

export interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  reactions?: Array<{ emoji: string; user_id: string }>;
  profiles: ProfileData;
  replies?: Comment[];
}

// Get table configuration for any content type
export const getEngagementConfig = (contentType: ContentType): Omit<EngagementConfig, 'contentId'> => {
  const configs = {
    post: {
      contentType: 'post' as ContentType,
      tables: {
        likes: 'post_likes',
        comments: 'post_comments',
        idColumn: 'post_id',
      },
    },
    reel: {
      contentType: 'reel' as ContentType,
      tables: {
        likes: 'reel_likes',
        comments: 'reel_comments',
        idColumn: 'reel_id',
      },
    },
    story: {
      contentType: 'story' as ContentType,
      tables: {
        likes: 'story_likes',
        comments: 'story_comments',
        idColumn: 'story_id',
      },
    },
    music_share: {
      contentType: 'music_share' as ContentType,
      tables: {
        likes: 'music_share_likes',
        comments: 'music_share_comments',
        idColumn: 'music_share_id',
      },
    },
    event: {
      contentType: 'event' as ContentType,
      tables: {
        likes: 'event_likes',
        comments: 'event_comments',
        idColumn: 'event_id',
      },
    },
  };

  return configs[contentType];
};
