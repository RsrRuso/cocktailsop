
import React, { useMemo } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLikeIds, useTogglePostLike, useToggleReelLike } from '../features/engagement/likes';
import { useHomeFeed } from '../features/social/queries';
import { FeedItemCard } from '../components/FeedItemCard';

export default function HomeScreen({ navigation }: { navigation: { navigate: (name: string, params?: any) => void } }){
  const { user } = useAuth();
  const likeIds = useLikeIds(user?.id);
  const togglePostLike = useTogglePostLike(user?.id);
  const toggleReelLike = useToggleReelLike(user?.id);
  const { data, isLoading, error, refetch } = useHomeFeed({ limit: 30 });
  const postLiked = new Set(likeIds.data?.postIds ?? []);
  const reelLiked = new Set(likeIds.data?.reelIds ?? []);
  const me = useMemo(() => {
    // user metadata may contain avatar/full name, but the feed already has profiles per item.
    const fullName = (user as any)?.user_metadata?.full_name as string | undefined;
    const avatarUrl = (user as any)?.user_metadata?.avatar_url as string | undefined;
    return { fullName, avatarUrl };
  }, [user]);

  const stories = useMemo(() => {
    const out: Array<{ userId: string; name: string; avatarUrl: string | null }> = [];
    const seen = new Set<string>();
    for (const item of data ?? []) {
      if (seen.has(item.user_id)) continue;
      seen.add(item.user_id);
      const name = item.profiles?.full_name?.trim() || item.profiles?.username || 'User';
      out.push({ userId: item.user_id, name, avatarUrl: item.profiles?.avatar_url ?? null });
      if (out.length >= 12) break;
    }
    return out;
  }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Header
        onNotifications={() => navigation.navigate('Notifications')}
        onMessages={() => navigation.navigate('MessagesList')}
      />
      {isLoading ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#9aa4b2' }}>Loading feed…</Text>
        </View>
      ) : error ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Couldn’t load feed</Text>
          <Text style={{ color: '#9aa4b2', marginTop: 6 }}>Pull to retry.</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => `${i.type}-${i.id}`}
          contentContainerStyle={{ paddingBottom: 96 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={() => (
            <StoryBar
              meName={me.fullName ?? 'Your Story'}
              meAvatarUrl={me.avatarUrl ?? null}
              onPressMyStory={() => navigation.navigate('Create')}
              stories={stories}
              onPressStory={(userId) => navigation.navigate('UserProfile', { userId })}
            />
          )}
          renderItem={({ item }) => (
            <FeedItemCard
              item={item}
              onAuthorPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}
              onPress={() => {
                if (item.type === 'post') navigation.navigate('PostDetail', { postId: item.id });
                else navigation.navigate('ReelDetail', { reelId: item.id });
              }}
              liked={item.type === 'post' ? postLiked.has(item.id) : reelLiked.has(item.id)}
              onLikePress={() => {
                if (item.type === 'post') {
                  togglePostLike.mutate({ postId: item.id, isLiked: postLiked.has(item.id) });
                } else {
                  toggleReelLike.mutate({ reelId: item.id, isLiked: reelLiked.has(item.id) });
                }
              }}
              onCommentPress={() => {
                if (item.type === 'post') navigation.navigate('PostDetail', { postId: item.id });
                else navigation.navigate('ReelDetail', { reelId: item.id });
              }}
            />
          )}
          refreshing={isLoading}
          onRefresh={() => refetch()}
        />
      )}
    </View>
  );
}

function Header({
  onNotifications,
  onMessages,
}: {
  onNotifications: () => void;
  onMessages: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Math.max(12, insets.top + 6) }]}>
      <View style={styles.headerRow}>
        <View style={styles.brand}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>SV</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.logo}>SpecVerse</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={onNotifications} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={onMessages} hitSlop={10}>
            <Ionicons name="paper-plane-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StoryBar({
  meName,
  meAvatarUrl,
  onPressMyStory,
  stories,
  onPressStory,
}: {
  meName: string;
  meAvatarUrl: string | null;
  onPressMyStory: () => void;
  stories: Array<{ userId: string; name: string; avatarUrl: string | null }>;
  onPressStory: (userId: string) => void;
}) {
  return (
    <View style={styles.storyWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 14 }}>
        <Pressable onPress={onPressMyStory} style={{ alignItems: 'center', gap: 8 }}>
          <View style={styles.storyAvatarWrap}>
            <View style={styles.storyAvatar}>
              {meAvatarUrl ? <Image source={{ uri: meAvatarUrl }} style={styles.storyAvatarImg} /> : null}
            </View>
            <View style={styles.storyPlus}>
              <Ionicons name="add" size={18} color="#000" />
            </View>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>
            Your Story
          </Text>
        </Pressable>
        {stories.map((s) => (
          <Pressable key={s.userId} onPress={() => onPressStory(s.userId)} style={{ alignItems: 'center', gap: 8 }}>
            <View style={styles.storyRing}>
              <View style={styles.storyAvatarSmall}>
                {s.avatarUrl ? <Image source={{ uri: s.avatarUrl }} style={styles.storyAvatarImgSmall} /> : null}
              </View>
            </View>
            <Text style={styles.storyLabel} numberOfLines={1}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.storyDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  logo: { color: '#fff', fontWeight: '900', fontSize: 18 },
  storyWrap: { backgroundColor: '#000' },
  storyDivider: { height: 10, backgroundColor: 'rgba(255,255,255,0.04)', marginTop: 10 },
  storyAvatarWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  storyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  storyAvatarImg: { width: 72, height: 72 },
  storyRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(251,191,36,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarSmall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
  },
  storyAvatarImgSmall: { width: 70, height: 70 },
  storyPlus: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: { color: '#9aa4b2', fontSize: 12, fontWeight: '700' },
});
