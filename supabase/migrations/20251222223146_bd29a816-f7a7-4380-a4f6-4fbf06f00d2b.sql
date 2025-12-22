-- Create community channels table for public/private channels
CREATE TABLE IF NOT EXISTS public.community_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'announcement')),
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id),
  member_count INTEGER DEFAULT 0,
  is_official BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create community channel members table
CREATE TABLE IF NOT EXISTS public.community_channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(channel_id, user_id)
);

-- Create community messages table
CREATE TABLE IF NOT EXISTS public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  reply_to UUID REFERENCES public.community_messages(id),
  is_pinned BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_channels
CREATE POLICY "Anyone can view public channels" ON public.community_channels
  FOR SELECT USING (type = 'public' OR type = 'announcement');

CREATE POLICY "Members can view private channels" ON public.community_channels
  FOR SELECT USING (
    type = 'private' AND EXISTS (
      SELECT 1 FROM public.community_channel_members 
      WHERE channel_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create channels" ON public.community_channels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update channels" ON public.community_channels
  FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.community_channel_members 
      WHERE channel_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for community_channel_members
CREATE POLICY "Anyone can view channel members" ON public.community_channel_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join public channels" ON public.community_channel_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.community_channels 
      WHERE id = channel_id AND (type = 'public' OR type = 'announcement')
    )
  );

CREATE POLICY "Admins can add members to private channels" ON public.community_channel_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_channel_members 
      WHERE channel_id = community_channel_members.channel_id 
      AND user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can leave channels" ON public.community_channel_members
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for community_messages
CREATE POLICY "Members can view messages" ON public.community_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_channel_members 
      WHERE channel_id = community_messages.channel_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.community_channels 
      WHERE id = channel_id AND type IN ('public', 'announcement')
    )
  );

CREATE POLICY "Members can send messages" ON public.community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.community_channel_members 
      WHERE channel_id = community_messages.channel_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages" ON public.community_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.community_messages
  FOR DELETE USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channel_members;

-- Create indexes for performance
CREATE INDEX idx_community_messages_channel ON public.community_messages(channel_id);
CREATE INDEX idx_community_messages_created ON public.community_messages(created_at DESC);
CREATE INDEX idx_community_members_channel ON public.community_channel_members(channel_id);
CREATE INDEX idx_community_members_user ON public.community_channel_members(user_id);

-- Insert default public channels
INSERT INTO public.community_channels (name, description, type, category, is_official) VALUES
('General', 'General discussions for the entire community', 'public', 'general', true),
('Announcements', 'Official platform announcements', 'announcement', 'official', true),
('Feedback', 'Share your feedback and suggestions', 'public', 'feedback', true),
('Events', 'Discuss upcoming events and activities', 'public', 'events', true),
('Help & Support', 'Get help from the community', 'public', 'support', true);