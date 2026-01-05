export type ProfileLite = {
  id: string;
  username: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  professional_title?: string | null;
  badge_level?: string | null;
  region?: string | null;
};

export type PostLite = {
  id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string;
  profiles?: ProfileLite | null;
};

export type ReelLite = {
  id: string;
  user_id: string;
  video_url: string | null;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  created_at: string;
  profiles?: ProfileLite | null;
};

export type FeedItem =
  | ({ type: 'post' } & PostLite)
  | ({ type: 'reel'; media_urls: string[] } & Omit<ReelLite, 'video_url'> & { video_url: string | null });

