-- Pro Upload Studio Database Schema

-- Role enum for creator permissions (extend existing app_role)
DO $$ BEGIN
  CREATE TYPE creator_role AS ENUM ('creator', 'pro_creator', 'venue_admin', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Creator roles table
CREATE TABLE IF NOT EXISTS public.creator_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role creator_role NOT NULL DEFAULT 'creator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Drafts table for autosave
CREATE TABLE IF NOT EXISTS public.studio_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_draft_id UUID REFERENCES public.studio_drafts(id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL DEFAULT 'reel' CHECK (draft_type IN ('post', 'reel', 'story')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'published', 'scheduled', 'needs_approval', 'failed')),
  branch_label TEXT,
  caption TEXT,
  hashtags TEXT[],
  mentions UUID[],
  location TEXT,
  venue_id UUID,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  needs_approval BOOLEAN DEFAULT false,
  approval_venue_id UUID,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  trim_start NUMERIC,
  trim_end NUMERIC,
  aspect_ratio TEXT DEFAULT '9:16',
  crop_data JSONB,
  cover_asset_id UUID,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.studio_drafts(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('video', 'image', 'audio', 'thumbnail')),
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'ingested', 'processing', 'ready', 'failed')),
  storage_path TEXT,
  public_url TEXT,
  thumbnail_url TEXT,
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  renditions JSONB DEFAULT '[]'::jsonb,
  hls_manifest_url TEXT,
  processing_error TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upload sessions for resumable uploads
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed', 'cancelled')),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  chunk_size INTEGER NOT NULL DEFAULT 5242880,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upload chunks tracking
CREATE TABLE IF NOT EXISTS public.upload_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.upload_sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_hash TEXT,
  chunk_size INTEGER NOT NULL,
  uploaded BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, chunk_index)
);

-- Post versions for hard edits
CREATE TABLE IF NOT EXISTS public.post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID,
  reel_id UUID,
  version_number INTEGER NOT NULL DEFAULT 1,
  media_asset_id UUID REFERENCES public.media_assets(id),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  caption TEXT,
  hashtags TEXT[],
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History events for audit trail
CREATE TABLE IF NOT EXISTS public.history_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID,
  reel_id UUID,
  draft_id UUID REFERENCES public.studio_drafts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  version_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approval requests for venue approval workflow
CREATE TABLE IF NOT EXISTS public.studio_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.studio_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID,
  team_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approval comments
CREATE TABLE IF NOT EXISTS public.approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES public.studio_approval_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post audio for music attachment
CREATE TABLE IF NOT EXISTS public.post_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID,
  reel_id UUID,
  draft_id UUID REFERENCES public.studio_drafts(id) ON DELETE CASCADE,
  track_id TEXT,
  track_title TEXT,
  track_artist TEXT,
  track_url TEXT,
  start_time NUMERIC DEFAULT 0,
  volume NUMERIC DEFAULT 1,
  mute_original BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Analytics events for views/engagement
CREATE TABLE IF NOT EXISTS public.studio_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID,
  reel_id UUID,
  viewer_id UUID,
  event_type TEXT NOT NULL,
  watch_ms INTEGER,
  watch_percent NUMERIC,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.creator_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_analytics_events ENABLE ROW LEVEL SECURITY;

-- Helper function to check creator role
CREATE OR REPLACE FUNCTION public.has_creator_role(_user_id uuid, _role creator_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creator_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies

-- Creator roles: users can view their own roles
CREATE POLICY "Users can view own creator roles" ON public.creator_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage creator roles" ON public.creator_roles FOR ALL USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Drafts: owner only access
CREATE POLICY "Users can manage own drafts" ON public.studio_drafts FOR ALL USING (auth.uid() = user_id);

-- Media assets: owner only
CREATE POLICY "Users can manage own media assets" ON public.media_assets FOR ALL USING (auth.uid() = user_id);

-- Upload sessions: owner only
CREATE POLICY "Users can manage own upload sessions" ON public.upload_sessions FOR ALL USING (auth.uid() = user_id);

-- Upload chunks: via session ownership
CREATE POLICY "Users can manage own upload chunks" ON public.upload_chunks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.upload_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- Post versions: owner can view; public can view published
CREATE POLICY "Users can view own post versions" ON public.post_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.reels WHERE id = reel_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own post versions" ON public.post_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.reels WHERE id = reel_id AND user_id = auth.uid())
);

-- History events: owner + moderators
CREATE POLICY "Users can view own history" ON public.history_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all history" ON public.history_events FOR SELECT USING (
  has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'founder'::app_role)
);
CREATE POLICY "Users can create own history events" ON public.history_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Approval requests: owner + venue admins
CREATE POLICY "Users can view own approval requests" ON public.studio_approval_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own approval requests" ON public.studio_approval_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Venue admins can view venue approvals" ON public.studio_approval_requests FOR SELECT USING (
  has_creator_role(auth.uid(), 'venue_admin')
);
CREATE POLICY "Venue admins can update approvals" ON public.studio_approval_requests FOR UPDATE USING (
  has_creator_role(auth.uid(), 'venue_admin')
);

-- Approval comments
CREATE POLICY "Users can view approval comments" ON public.approval_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.studio_approval_requests WHERE id = approval_request_id AND (user_id = auth.uid() OR has_creator_role(auth.uid(), 'venue_admin')))
);
CREATE POLICY "Users can create approval comments" ON public.approval_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Post audio
CREATE POLICY "Users can manage own post audio" ON public.post_audio FOR ALL USING (
  EXISTS (SELECT 1 FROM public.studio_drafts WHERE id = draft_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.reels WHERE id = reel_id AND user_id = auth.uid())
);

-- Analytics events: creators can view their content analytics
CREATE POLICY "Users can view own analytics" ON public.studio_analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.reels WHERE id = reel_id AND user_id = auth.uid())
);
CREATE POLICY "Anyone can insert analytics events" ON public.studio_analytics_events FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_drafts_user ON public.studio_drafts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_drafts_status ON public.studio_drafts(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_draft ON public.media_assets(draft_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON public.upload_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_chunks_session ON public.upload_chunks(session_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_history_events_post ON public.history_events(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_events_reel ON public.history_events(reel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_events_draft ON public.history_events(draft_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_versions_post ON public.post_versions(post_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_post_versions_reel ON public.post_versions(reel_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_venue ON public.studio_approval_requests(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_post ON public.studio_analytics_events(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_reel ON public.studio_analytics_events(reel_id, created_at DESC);

-- Auto-update timestamps
CREATE TRIGGER update_studio_drafts_updated_at BEFORE UPDATE ON public.studio_drafts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_sessions_updated_at BEFORE UPDATE ON public.upload_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.studio_approval_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();