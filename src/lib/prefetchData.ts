// Prefetch critical data before user navigates
import { supabase } from "@/integrations/supabase/client";
import { setCache } from "./indexedDBCache";

const prefetchCache = new Map<string, any>();

export const prefetchUserData = async (userId: string) => {
  if (prefetchCache.has(`user-${userId}`)) {
    return prefetchCache.get(`user-${userId}`);
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (data) {
    prefetchCache.set(`user-${userId}`, data);
    await setCache('profiles', userId, data);
  }

  return data;
};

export const prefetchPosts = async (userId: string) => {
  if (prefetchCache.has(`posts-${userId}`)) {
    return prefetchCache.get(`posts-${userId}`);
  }

  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (data) {
    prefetchCache.set(`posts-${userId}`, data);
    await setCache('posts', `user-${userId}`, data);
  }

  return data;
};

export const clearPrefetchCache = () => {
  prefetchCache.clear();
};
