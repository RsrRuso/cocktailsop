import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeedItem } from '../features/social/types';

export function FeedItemCard({
  item,
  onPress,
  onAuthorPress,
  liked,
  onLikePress,
  onCommentPress,
}: {
  item: FeedItem;
  onPress?: () => void;
  onAuthorPress?: () => void;
  liked?: boolean;
  onLikePress?: () => void;
  onCommentPress?: () => void;
}) {
  const profile = item.profiles;
  const mediaUrl = item.type === 'post' ? item.media_urls?.[0] : item.video_url;
  const displayName = profile?.full_name?.trim() || profile?.username || 'User';
  const subtitle = profile?.professional_title ?? '';
  const isVerified = !!profile?.badge_level && profile.badge_level !== 'none';

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onAuthorPress}>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={{ color: '#e6e6e6', fontWeight: '900' }}>{displayName.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.author} numberOfLines={1}>
              {displayName}
            </Text>
            {isVerified ? <Ionicons name="checkmark-circle" size={14} color="#fbbf24" /> : null}
          </View>
          {subtitle ? (
            <Text style={styles.meta} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="ellipsis-vertical" size={18} color="#9aa4b2" />
      </Pressable>

      <Pressable onPress={onPress}>
        {mediaUrl ? (
          item.type === 'post' ? (
            <Image source={{ uri: mediaUrl }} style={styles.media} />
          ) : (
            <View style={[styles.media, styles.videoPlaceholder]}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.75)" />
            </View>
          )
        ) : (
          <View style={[styles.media, styles.videoPlaceholder]}>
            <Text style={{ color: '#9aa4b2' }}>No media</Text>
          </View>
        )}
      </Pressable>

      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <Text style={{ color: '#e6e6e6' }}>
          <Text style={{ fontWeight: '800' }}>{displayName} </Text>
          {item.type === 'post' ? item.content : item.caption}
        </Text>
        <View style={styles.actions}>
          <Pressable style={[styles.btn, liked ? styles.btnActive : null]} onPress={onLikePress}>
            <Text style={styles.btnText}>
              {liked ? '♥' : '♡'} {item.like_count ?? 0}
            </Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={onCommentPress}>
            <Text style={styles.btnText}>💬 {item.comment_count ?? 0}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
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
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { height: 36, width: 36 },
  author: { color: '#fff', fontWeight: '800' },
  meta: { color: '#9aa4b2', fontSize: 12, marginTop: 1 },
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
  btnActive: {
    borderColor: 'rgba(239,68,68,0.40)',
    backgroundColor: 'rgba(239,68,68,0.16)',
  },
  btnText: { color: '#e6e6e6', fontWeight: '700' },
});

