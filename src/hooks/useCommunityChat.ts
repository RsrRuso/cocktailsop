import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { connectionPool } from "@/lib/connectionPool";

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  reply_to: string | null;
  is_pinned: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
  updated_at?: string;
  forwarded_from?: string | null;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  reply_message?: Message | null;
  optimistic?: boolean;
  sending?: boolean;
  failed?: boolean;
  edited?: boolean;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

// In-memory cache for profiles and messages
const profileCache = new Map<string, Profile>();
const messageCache = new Map<string, Message[]>();
const CACHE_TTL = 60000; // 1 minute
const cacheTimestamps = new Map<string, number>();

export function useCommunityChat(channelId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const optimisticIdRef = useRef(0);
  const lastFetchRef = useRef<number>(0);
  const pendingProfilesRef = useRef<Set<string>>(new Set());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get cached profile instantly
  const getProfile = useCallback((userId: string): Profile | null => {
    return profileCache.get(userId) || null;
  }, []);

  // Batch fetch profiles
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !profileCache.has(id) && !pendingProfilesRef.current.has(id));
    if (uncachedIds.length === 0) return;

    uncachedIds.forEach(id => pendingProfilesRef.current.add(id));

    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", uncachedIds);

      data?.forEach(profile => {
        profileCache.set(profile.id, profile);
        pendingProfilesRef.current.delete(profile.id);
      });
    } catch (error) {
      uncachedIds.forEach(id => pendingProfilesRef.current.delete(id));
    }
  }, []);

  // Optimistic message update
  const addOptimisticMessage = useCallback((content: string, replyTo: Message | null): string => {
    const tempId = `optimistic-${Date.now()}-${optimisticIdRef.current++}`;
    const profile = userId ? profileCache.get(userId) : null;
    
    const optimisticMessage: Message = {
      id: tempId,
      channel_id: channelId || "",
      user_id: userId || "",
      content,
      media_url: null,
      media_type: null,
      reply_to: replyTo?.id || null,
      is_pinned: false,
      reactions: {},
      created_at: new Date().toISOString(),
      profile: profile || undefined,
      reply_message: replyTo,
      optimistic: true,
      sending: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    return tempId;
  }, [channelId, userId]);

  // Replace optimistic message with real one
  const confirmMessage = useCallback((tempId: string, realMessage: Message) => {
    setMessages(prev => prev.map(msg => 
      msg.id === tempId ? { ...realMessage, optimistic: false, sending: false } : msg
    ));
  }, []);

  // Mark message as failed
  const failMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === tempId ? { ...msg, sending: false, failed: true } : msg
    ));
  }, []);

  // Send message with optimistic update
  const sendMessage = useCallback(async (content: string, replyTo: Message | null = null): Promise<boolean> => {
    if (!content.trim() || !channelId || !userId) return false;

    setSending(true);
    const tempId = addOptimisticMessage(content.trim(), replyTo);

    try {
      const { data, error } = await supabase
        .from("community_messages")
        .insert({
          channel_id: channelId,
          user_id: userId,
          content: content.trim(),
          reply_to: replyTo?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      const profile = getProfile(userId);
      confirmMessage(tempId, {
        ...data,
        reactions: {},
        profile: profile || undefined,
        reply_message: replyTo,
      });

      return true;
    } catch (error) {
      console.error("Failed to send message:", error);
      failMessage(tempId);
      return false;
    } finally {
      setSending(false);
    }
  }, [channelId, userId, addOptimisticMessage, confirmMessage, failMessage, getProfile]);

  // Retry failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !msg.failed) return;

    // Remove failed message
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Resend
    if (msg.content) {
      await sendMessage(msg.content, msg.reply_message || null);
    }
  }, [messages, sendMessage]);

  // Fetch messages with caching
  const fetchMessages = useCallback(async (force = false) => {
    if (!channelId) return;

    const now = Date.now();
    const cacheKey = `messages-${channelId}`;
    const cachedTime = cacheTimestamps.get(cacheKey) || 0;

    // Use cache if fresh and not forced
    if (!force && now - cachedTime < CACHE_TTL && messageCache.has(cacheKey)) {
      setMessages(messageCache.get(cacheKey) || []);
      return;
    }

    // Debounce fetches
    if (!force && now - lastFetchRef.current < 500) return;
    lastFetchRef.current = now;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("community_messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Batch fetch profiles
      const userIds = [...new Set(data?.map(m => m.user_id) || [])];
      await fetchProfiles(userIds);

      // Fetch reply messages
      const replyIds = data?.filter(m => m.reply_to).map(m => m.reply_to) || [];
      let replyMap = new Map<string, Message>();
      
      if (replyIds.length > 0) {
        const { data: replyMessages } = await supabase
          .from("community_messages")
          .select("*")
          .in("id", replyIds as string[]);

        replyMessages?.forEach(m => replyMap.set(m.id, m as Message));
      }

      const messagesWithProfiles: Message[] = data?.map(msg => ({
        ...msg,
        reactions: (typeof msg.reactions === 'object' && msg.reactions !== null && !Array.isArray(msg.reactions))
          ? msg.reactions as Record<string, string[]>
          : {},
        profile: profileCache.get(msg.user_id),
        reply_message: msg.reply_to ? replyMap.get(msg.reply_to) : null,
      })) || [];

      // Update cache
      messageCache.set(cacheKey, messagesWithProfiles);
      cacheTimestamps.set(cacheKey, now);

      // Preserve optimistic messages
      setMessages(prev => {
        const optimisticMsgs = prev.filter(m => m.optimistic);
        return [...messagesWithProfiles, ...optimisticMsgs];
      });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [channelId, fetchProfiles]);

  // Handle reaction with optimistic update
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return;

    // Optimistic update
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      const reactions = { ...msg.reactions };
      const userReactions = reactions[emoji] || [];

      if (userReactions.includes(userId)) {
        reactions[emoji] = userReactions.filter(id => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...userReactions, userId];
      }

      return { ...msg, reactions };
    }));

    // Persist
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = { ...message.reactions };
    const userReactions = reactions[emoji] || [];

    if (userReactions.includes(userId)) {
      reactions[emoji] = userReactions.filter(id => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...userReactions, userId];
    }

    await supabase
      .from("community_messages")
      .update({ reactions })
      .eq("id", messageId);
  }, [messages, userId]);

  // Real-time subscription
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    fetchMessages(true);

    // Use connection pool for efficient channel management
    const channel = connectionPool.getChannel(`community-${channelId}`);
    
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Message;
            
            // Skip if this is our own optimistic message
            if (userId && newMsg.user_id === userId) {
              // Check if we already have this message (from optimistic update)
              setMessages(prev => {
                const hasOptimistic = prev.some(m => 
                  m.optimistic && m.content === newMsg.content && m.user_id === newMsg.user_id
                );
                if (hasOptimistic) {
                  // Replace optimistic with real
                  return prev.map(m => 
                    m.optimistic && m.content === newMsg.content && m.user_id === newMsg.user_id
                      ? { ...newMsg, reactions: {}, profile: profileCache.get(newMsg.user_id), optimistic: false }
                      : m
                  );
                }
                return prev;
              });
              return;
            }

            // Add new message from others
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                ...newMsg,
                reactions: {},
                profile: profileCache.get(newMsg.user_id),
              }];
            });

            // Fetch profile if not cached
            if (!profileCache.has(newMsg.user_id)) {
              fetchProfiles([newMsg.user_id]).then(() => {
                setMessages(prev => prev.map(m => 
                  m.id === newMsg.id 
                    ? { ...m, profile: profileCache.get(newMsg.user_id) }
                    : m
                ));
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Message;
            setMessages(prev => prev.map(m => 
              m.id === updated.id 
                ? { ...m, ...updated, reactions: updated.reactions || m.reactions }
                : m
            ));
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setMessages(prev => prev.filter(m => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      connectionPool.removeChannel(`community-${channelId}`);
    };
  }, [channelId, userId, fetchMessages, fetchProfiles]);

  // Cache current user's profile
  useEffect(() => {
    if (userId && !profileCache.has(userId)) {
      fetchProfiles([userId]);
    }
  }, [userId, fetchProfiles]);

  // Pin/Unpin message
  const pinMessage = useCallback(async (messageId: string, pin: boolean) => {
    // Optimistic update
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, is_pinned: pin } : msg
    ));

    const { error } = await supabase
      .from("community_messages")
      .update({ is_pinned: pin })
      .eq("id", messageId);

    if (error) {
      // Revert on failure
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_pinned: !pin } : msg
      ));
    }
  }, []);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    if (!newContent.trim()) return false;

    // Optimistic update
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent.trim(), edited: true } : msg
    ));

    const { error } = await supabase
      .from("community_messages")
      .update({ content: newContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) {
      // Revert on failure
      fetchMessages(true);
      return false;
    }

    return true;
  }, [fetchMessages]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    // Optimistic update
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    const { error } = await supabase
      .from("community_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      fetchMessages(true);
      return false;
    }

    return true;
  }, [fetchMessages]);

  // Get pinned messages
  const pinnedMessages = useMemo(() => 
    messages.filter(msg => msg.is_pinned),
    [messages]
  );

  return {
    messages,
    pinnedMessages,
    loading,
    sending,
    sendMessage,
    handleReaction,
    retryMessage,
    pinMessage,
    editMessage,
    deleteMessage,
    refresh: () => fetchMessages(true),
  };
}
