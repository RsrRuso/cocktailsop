-- Wasabi Chat - WhatsApp-like messaging for Ops Tools
-- Separate dedicated chat system

-- Wasabi Conversations (individual and group chats)
CREATE TABLE public.wasabi_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT, -- For group chats
  description TEXT,
  avatar_url TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pinned BOOLEAN DEFAULT false
);

-- Wasabi Conversation Members
CREATE TABLE public.wasabi_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wasabi_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  muted BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Wasabi Messages
CREATE TABLE public.wasabi_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wasabi_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document', 'voice'
  media_url TEXT,
  media_type TEXT,
  media_name TEXT,
  media_size INTEGER,
  reply_to_id UUID REFERENCES public.wasabi_messages(id) ON DELETE SET NULL,
  forwarded_from_id UUID REFERENCES public.wasabi_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wasabi Message Reactions (emoji reactions like WhatsApp)
CREATE TABLE public.wasabi_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.wasabi_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Wasabi Message Read Receipts
CREATE TABLE public.wasabi_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.wasabi_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Wasabi Starred Messages
CREATE TABLE public.wasabi_starred (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.wasabi_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  starred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.wasabi_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wasabi_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wasabi_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wasabi_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wasabi_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wasabi_starred ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wasabi_conversations
CREATE POLICY "Users can view conversations they are members of"
ON public.wasabi_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_members 
    WHERE wasabi_members.conversation_id = id 
    AND wasabi_members.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create conversations"
ON public.wasabi_conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation admins can update"
ON public.wasabi_conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_members 
    WHERE wasabi_members.conversation_id = id 
    AND wasabi_members.user_id = auth.uid()
    AND wasabi_members.role = 'admin'
  )
);

-- RLS Policies for wasabi_members
CREATE POLICY "Members can view other members in their conversations"
ON public.wasabi_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_members AS m
    WHERE m.conversation_id = wasabi_members.conversation_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can add members to conversations they created"
ON public.wasabi_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Members can update their own membership"
ON public.wasabi_members FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete members"
ON public.wasabi_members FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.wasabi_members AS m
    WHERE m.conversation_id = wasabi_members.conversation_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
);

-- RLS Policies for wasabi_messages
CREATE POLICY "Members can view messages in their conversations"
ON public.wasabi_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_members 
    WHERE wasabi_members.conversation_id = wasabi_messages.conversation_id
    AND wasabi_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can send messages to their conversations"
ON public.wasabi_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.wasabi_members 
    WHERE wasabi_members.conversation_id = wasabi_messages.conversation_id
    AND wasabi_members.user_id = auth.uid()
  )
);

CREATE POLICY "Senders can update their own messages"
ON public.wasabi_messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete their own messages"
ON public.wasabi_messages FOR DELETE
USING (sender_id = auth.uid());

-- RLS Policies for wasabi_reactions
CREATE POLICY "Members can view reactions"
ON public.wasabi_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_messages AS m
    JOIN public.wasabi_members AS mem ON mem.conversation_id = m.conversation_id
    WHERE m.id = wasabi_reactions.message_id
    AND mem.user_id = auth.uid()
  )
);

CREATE POLICY "Members can add reactions"
ON public.wasabi_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions"
ON public.wasabi_reactions FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for wasabi_read_receipts
CREATE POLICY "Members can view read receipts"
ON public.wasabi_read_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wasabi_messages AS m
    JOIN public.wasabi_members AS mem ON mem.conversation_id = m.conversation_id
    WHERE m.id = wasabi_read_receipts.message_id
    AND mem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own read receipts"
ON public.wasabi_read_receipts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read receipts"
ON public.wasabi_read_receipts FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for wasabi_starred
CREATE POLICY "Users can view their starred messages"
ON public.wasabi_starred FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can star messages"
ON public.wasabi_starred FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unstar messages"
ON public.wasabi_starred FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.wasabi_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wasabi_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wasabi_read_receipts;

-- Indexes for performance
CREATE INDEX idx_wasabi_members_user_id ON public.wasabi_members(user_id);
CREATE INDEX idx_wasabi_members_conversation_id ON public.wasabi_members(conversation_id);
CREATE INDEX idx_wasabi_messages_conversation_id ON public.wasabi_messages(conversation_id);
CREATE INDEX idx_wasabi_messages_sender_id ON public.wasabi_messages(sender_id);
CREATE INDEX idx_wasabi_messages_created_at ON public.wasabi_messages(created_at DESC);
CREATE INDEX idx_wasabi_reactions_message_id ON public.wasabi_reactions(message_id);
CREATE INDEX idx_wasabi_read_receipts_message_id ON public.wasabi_read_receipts(message_id);