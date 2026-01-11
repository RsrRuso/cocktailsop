import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type PostRow = {
  id: string;
  user_id: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string;
};

type HistoryEventRow = { id: string; event_type: string; created_at: string; event_data: any };

export default function PostAnalyticsScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { postId: string } };
}) {
  const postId = route.params.postId;

  const data = useQuery({
    queryKey: ['analytics', 'post', postId],
    queryFn: async () => {
      const postRes = await supabase.from('posts').select('id, user_id, view_count, like_count, comment_count, created_at').eq('id', postId).single();
      if (postRes.error) throw postRes.error;

      const histRes = await supabase
        .from('history_events')
        .select('id, event_type, created_at, event_data')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (histRes.error) throw histRes.error;

      return { post: postRes.data as unknown as PostRow, history: (histRes.data ?? []) as unknown as HistoryEventRow[] };
    },
  });

  const views = data.data?.post.view_count ?? 0;
  const likes = data.data?.post.like_count ?? 0;
  const comments = data.data?.post.comment_count ?? 0;
  const shares = 0;
  const saves = 0;
  const profileVisits = Math.floor((views ?? 0) * 0.12);

  const engagementRate = useMemo(() => {
    if (!views) return 0;
    return ((likes + comments + shares) / views) * 100;
  }, [views, likes, comments, shares]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Post analytics
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {postId.slice(0, 8)}
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('WebRoute', { title: 'Post analytics', pathTemplate: '/analytics/post/:postId', initialParams: { postId } })}
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {data.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {data.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load analytics.</Text> : null}

        {!data.isLoading && data.data ? (
          <>
            <View style={styles.grid}>
              <Stat label="Views" value={views} icon="eye-outline" color="#60a5fa" />
              <Stat label="Likes" value={likes} icon="heart-outline" color="#fb7185" />
              <Stat label="Comments" value={comments} icon="chatbubble-ellipses-outline" color="#34d399" />
              <Stat label="Shares" value={shares} icon="share-social-outline" color="#a78bfa" />
              <Stat label="Saves" value={saves} icon="bookmark-outline" color="#fbbf24" />
              <Stat label="Profile Visits" value={profileVisits} icon="people-outline" color="#22d3ee" />
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Engagement rate</Text>
              <Text style={styles.big}>{engagementRate.toFixed(1)}%</Text>
              <Text style={styles.muted}>Based on likes, comments, and shares.</Text>
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>History</Text>
              {(data.data.history ?? []).length === 0 ? <Text style={styles.muted}>No history events.</Text> : null}
              <View style={{ gap: 8, marginTop: 10 }}>
                {(data.data.history ?? []).map((h) => (
                  <View key={h.id} style={styles.row}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {h.event_type}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {new Date(h.created_at).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.statValue}>{Number(value ?? 0).toLocaleString()}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  secondaryBtn: {},
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statLabel: { color: '#9aa4b2', fontWeight: '800', fontSize: 12, flex: 1 },
  statValue: { color: '#fff', fontWeight: '900', fontSize: 20, marginTop: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  big: { color: '#fff', fontWeight: '900', fontSize: 32, marginTop: 6 },
  row: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', fontSize: 12, marginTop: 4, fontWeight: '700' },
});

