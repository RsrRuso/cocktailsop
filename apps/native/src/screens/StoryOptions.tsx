import React, { useMemo } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type StoryRow = {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  media_urls?: string[] | null;
  media_types?: string[] | null;
  media_url?: string | null;
  media_type?: string | null;
  view_count?: number | null;
};

export default function StoryOptionsScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();

  const stories = useQuery({
    queryKey: ['stories', 'mine'],
    enabled: !!user?.id,
    queryFn: async (): Promise<StoryRow[]> => {
      const uid = user!.id;
      const res = await supabase
        .from('stories')
        .select('id, user_id, created_at, expires_at, view_count, media_urls, media_types')
        .eq('user_id', uid)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (!res.error) return (res.data ?? []) as unknown as StoryRow[];

      const legacy = await supabase
        .from('stories')
        .select('id, user_id, created_at, expires_at, view_count, media_url, media_type')
        .eq('user_id', uid)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? []) as unknown as StoryRow[];
    },
  });

  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await supabase.from('stories').delete().eq('id', storyId);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });

  const hasStories = (stories.data?.length ?? 0) > 0;
  const firstThumb = useMemo(() => {
    const s = stories.data?.[0];
    if (!s) return null;
    const u = s.media_urls?.[0] ?? s.media_url ?? null;
    return u;
  }, [stories.data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Your Story
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Create & manage your stories
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Story options (web)',
              pathTemplate: '/story-options',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={{ height: 10 }} />

          <Pressable onPress={() => navigation.navigate('Create', { mode: 'story' })} style={styles.actionRow}>
            <View style={styles.actionIcon}>
              <Ionicons name="camera-outline" size={18} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Create Story</Text>
              <Text style={styles.actionSub}>Upload photo/video that expires in 24 hours</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('WebRoute', { title: 'Add status (web)', pathTemplate: '/story-options' })}
            style={styles.actionRow}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#93c5fd" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Add Status (web)</Text>
              <Text style={styles.actionSub}>AI-enhanced status + emojis (web for now)</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('WebRoute', { title: 'Share music (web)', pathTemplate: '/story-options' })}
            style={styles.actionRow}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="musical-notes-outline" size={18} color="#86efac" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Share Music (web)</Text>
              <Text style={styles.actionSub}>Spotify + music story tools (web for now)</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Active stories</Text>
          <Text style={styles.muted}>Tap to view, or delete individual stories.</Text>

          {stories.isLoading ? <Text style={{ color: '#9aa4b2', marginTop: 10 }}>Loading…</Text> : null}
          {!stories.isLoading && !hasStories ? <Text style={{ color: '#9aa4b2', marginTop: 10 }}>No active stories.</Text> : null}

          {hasStories ? (
            <>
              <View style={{ height: 10 }} />
              <Pressable onPress={() => navigation.navigate('StoryViewer', { userId: user?.id })} style={styles.previewRow}>
                <View style={styles.previewAvatar}>
                  {firstThumb ? <Image source={{ uri: firstThumb }} style={{ width: 46, height: 46 }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>View your story</Text>
                  <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }}>{stories.data?.length} active</Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>

              <View style={{ height: 10 }} />
              <View style={{ gap: 8 }}>
                {(stories.data ?? []).map((s) => {
                  const thumb = s.media_urls?.[0] ?? s.media_url ?? null;
                  return (
                    <View key={s.id} style={styles.storyRow}>
                      <View style={styles.storyThumb}>
                        {thumb ? <Image source={{ uri: thumb }} style={{ width: 44, height: 44 }} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                          {new Date(s.created_at).toLocaleString()}
                        </Text>
                        <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                          Expires {new Date(s.expires_at).toLocaleString()}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          Alert.alert('Delete story?', 'This will remove the story.', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteStory.mutate(s.id),
                            },
                          ]);
                        }}
                        style={styles.trashBtn}
                        hitSlop={10}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  backText: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: -2 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  sub: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryBtn: {},
  btnText: { color: '#e6e6e6', fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  actionTitle: { color: '#fff', fontWeight: '900' },
  actionSub: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  chev: { color: '#9aa4b2', fontSize: 18, fontWeight: '800' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 10,
  },
  previewAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  storyThumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  trashBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
});

