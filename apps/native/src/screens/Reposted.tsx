import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type RepostedPost = {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    professional_title: string | null;
    badge_level: string | null;
  } | null;
};

function badgeColors(level: string) {
  const l = (level || '').toLowerCase();
  if (l === 'silver') return '#d1d5db';
  if (l === 'gold') return '#fbbf24';
  if (l === 'platinum') return '#60a5fa';
  return '#b45309'; // bronze default
}

export default function RepostedScreen({ navigation }: { navigation: Nav }) {
  const posts = useQuery({
    queryKey: ['reposted', 'posts'],
    queryFn: async (): Promise<RepostedPost[]> => {
      // Mirrors current web implementation: "reposted" is a simple archive list of posts (not using repost tables yet).
      const res = await supabase
        .from('posts')
        .select('id, content, media_urls, like_count, comment_count, created_at, profiles:profiles(username, full_name, avatar_url, professional_title, badge_level)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as RepostedPost[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Reposted
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Your archived shares
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => navigation.navigate('WebRoute', { title: 'Reposted', pathTemplate: '/reposted' })}>
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {posts.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {posts.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load.</Text> : null}

        <View style={{ gap: 10 }}>
          {(posts.data ?? []).map((p) => {
            const avatar = p.profiles?.avatar_url ?? null;
            const badge = badgeColors(p.profiles?.badge_level ?? 'bronze');
            const name = p.profiles?.full_name || p.profiles?.username || 'User';
            const title = p.profiles?.professional_title ? p.profiles.professional_title.replace(/_/g, ' ') : '';
            const media = p.media_urls?.[0] ?? null;
            return (
              <Pressable key={p.id} style={styles.card} onPress={() => navigation.navigate('PostDetail', { postId: p.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.avatarWrap, { borderColor: `${badge}66` }]}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={{ width: 44, height: 44 }} />
                    ) : (
                      <Text style={{ color: '#e2e8f0', fontWeight: '900' }}>{name.slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="repeat-outline" size={16} color="#60a5fa" />
                      <Text style={{ color: '#9aa4b2', fontWeight: '800' }}>You reposted</Text>
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {name}
                    </Text>
                    {title ? (
                      <Text style={{ color: '#9aa4b2', fontSize: 12 }} numberOfLines={1}>
                        {title}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {p.content ? <Text style={{ color: '#e2e8f0', marginTop: 10 }}>{p.content}</Text> : null}

                {media ? (
                  <Image source={{ uri: media }} style={{ width: '100%', aspectRatio: 1, borderRadius: 14, marginTop: 10 }} />
                ) : null}

                <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>♥ {p.like_count ?? 0}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>💬 {p.comment_count ?? 0}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillText: { color: '#e2e8f0', fontWeight: '900' },
});

