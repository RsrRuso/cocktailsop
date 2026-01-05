import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedItem } from '../features/social/types';

export function FeedItemCard({ item, onPress }: { item: FeedItem; onPress?: () => void }) {
  const profile = item.profiles;
  const mediaUrl = item.type === 'post' ? item.media_urls?.[0] : item.video_url;
  const title = profile?.username ? `@${profile.username}` : 'User';
  const subtitle = profile?.professional_title ?? '';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={{ color: '#e6e6e6', fontWeight: '700' }}>{title.slice(1, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.meta} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{item.type === 'reel' ? 'Reel' : 'Post'}</Text>
        </View>
      </View>

      {mediaUrl ? (
        item.type === 'post' ? (
          <Image source={{ uri: mediaUrl }} style={styles.media} />
        ) : (
          <View style={[styles.media, styles.videoPlaceholder]}>
            <Text style={{ color: '#9aa4b2' }}>Video</Text>
          </View>
        )
      ) : (
        <View style={[styles.media, styles.videoPlaceholder]}>
          <Text style={{ color: '#9aa4b2' }}>No media</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <Text style={{ color: '#e6e6e6' }}>
          <Text style={{ fontWeight: '800' }}>{title} </Text>
          {item.type === 'post' ? item.content : item.caption}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>♥ {item.like_count ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>💬 {item.comment_count ?? 0}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    height: 36,
    width: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { height: 36, width: 36 },
  author: { color: '#fff', fontWeight: '800' },
  meta: { color: '#9aa4b2', fontSize: 12, marginTop: 1 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillText: { color: '#e6e6e6', fontSize: 11, fontWeight: '800' },
  media: { width: '100%', aspectRatio: 1, backgroundColor: '#000' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnText: { color: '#e6e6e6', fontWeight: '700' },
});

