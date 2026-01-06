import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type ProfileLite = { id: string; username: string | null; full_name: string | null; avatar_url: string | null; badge_level?: string | null };

type StoryRow = {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  view_count: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  // new schema
  media_urls?: string[] | null;
  media_types?: string[] | null;
  // old schema
  media_url?: string | null;
  media_type?: string | null;
};

type MediaItem = { storyId: string; url: string; type: string };

const STORY_ITEM_MS = 6500;

export default function StoryViewerScreen({
  route,
  navigation,
}: {
  route: { params: { userId: string } };
  navigation: Nav;
}) {
  const userId = route.params.userId;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stories', 'viewer', userId],
    queryFn: async () => {
      // Try the newer multi-media schema first.
      const storyRes = await supabase
        .from('stories')
        .select('id, user_id, created_at, expires_at, view_count, like_count, comment_count, media_urls, media_types')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      let stories: StoryRow[] = [];
      if (!storyRes.error) stories = (storyRes.data ?? []) as unknown as StoryRow[];
      else {
        const legacy = await supabase
          .from('stories')
          .select('id, user_id, created_at, expires_at, view_count, media_url, media_type')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: true });
        if (legacy.error) throw legacy.error;
        stories = (legacy.data ?? []) as unknown as StoryRow[];
      }

      const profileRes = await supabase.from('profiles').select('id, username, full_name, avatar_url, badge_level').eq('id', userId).single();
      if (profileRes.error) throw profileRes.error;
      return { stories, profile: profileRes.data as unknown as ProfileLite };
    },
  });

  const mediaItems = useMemo<MediaItem[]>(() => {
    const out: MediaItem[] = [];
    for (const s of data?.stories ?? []) {
      const urls = s.media_urls && s.media_urls.length ? s.media_urls : s.media_url ? [s.media_url] : [];
      const types = s.media_types && s.media_types.length ? s.media_types : s.media_type ? [s.media_type] : [];
      for (let i = 0; i < urls.length; i++) out.push({ storyId: s.id, url: urls[i]!, type: (types[i] ?? 'image') as string });
    }
    return out;
  }, [data?.stories]);

  const current = mediaItems[idx];
  const total = mediaItems.length;

  useEffect(() => {
    setIdx(0);
    setProgress(0);
  }, [userId, total]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (paused) return;
    if (!current) return;
    // For videos we will also update via playback status; timer is a fallback.
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / STORY_ITEM_MS);
      setProgress(p * 100);
      if (p >= 1) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
        goNext();
      }
    }, 80);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused, current?.url]);

  function goNext() {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setProgress(0);
    } else {
      navigation.goBack();
    }
  }
  function goPrev() {
    if (idx > 0) {
      setIdx(idx - 1);
      setProgress(0);
    } else {
      navigation.goBack();
    }
  }

  const name = data?.profile.full_name?.trim() || (data?.profile.username ? `@${data.profile.username}` : 'Story');
  const verified = !!data?.profile.badge_level && data.profile.badge_level !== 'none';

  if (isLoading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#9aa4b2' }}>Loading story…</Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={[styles.root, { padding: 12 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        <Text style={{ color: '#fff', fontWeight: '900', marginTop: 16 }}>No active stories</Text>
        <Text style={{ color: '#9aa4b2', marginTop: 6 }}>This user has no stories right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* progress bars */}
      <View style={styles.progressRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${i < idx ? 100 : i === idx ? progress : 0}%` },
              ]}
            />
          </View>
        ))}
      </View>

      {/* header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <View style={styles.avatar}>
          {data?.profile.avatar_url ? <Image source={{ uri: data.profile.avatar_url }} style={{ width: 34, height: 34 }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {verified ? <Ionicons name="checkmark-circle" size={14} color="#fbbf24" /> : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            Tap to advance • Hold to pause
          </Text>
        </View>
        <Pressable
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Story viewer',
              pathTemplate: `/story/${userId}`,
            })
          }
          style={styles.webBtn}
        >
          <Text style={styles.webBtnText}>Open web</Text>
        </Pressable>
      </View>

      {/* media */}
      <View style={styles.mediaWrap}>
        {current.type.startsWith('video') ? (
          <Video
            source={{ uri: current.url }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!paused}
            isLooping={false}
            onPlaybackStatusUpdate={(s: any) => {
              if (!s?.isLoaded || paused) return;
              if (s.durationMillis) setProgress(Math.min(100, (s.positionMillis / s.durationMillis) * 100));
              if (s.didJustFinish) goNext();
            }}
          />
        ) : (
          <Image source={{ uri: current.url }} style={styles.media} />
        )}

        {/* tap zones */}
        <View style={styles.tapRow}>
          <Pressable
            onPress={goPrev}
            onPressIn={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={goNext}
            onPressIn={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  progressRow: { position: 'absolute', top: 10, left: 10, right: 10, zIndex: 20, flexDirection: 'row', gap: 6 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#fff' },
  header: {
    position: 'absolute',
    top: 18,
    left: 10,
    right: 10,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 18,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  name: { color: '#fff', fontWeight: '900' },
  meta: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  webBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  webBtnText: { color: '#e6e6e6', fontWeight: '800', fontSize: 12 },
  mediaWrap: { flex: 1 },
  media: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  tapRow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
});

