import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Video } from 'expo-av';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLikeIds, useToggleReelLike } from '../features/engagement/likes';
import { useAddReelComment, useReelComments } from '../features/engagement/comments';

export default function ReelDetailScreen({ route }: { route: { params: { reelId: string } } }) {
  const { user } = useAuth();
  const reelId = route.params.reelId;

  const { data, isLoading } = useQuery({
    queryKey: ['reel', reelId],
    queryFn: async () => {
      const res = await supabase
        .from('reels')
        .select('id, user_id, video_url, caption, like_count, comment_count, created_at, profiles:profiles (id, username)')
        .eq('id', reelId)
        .single();
      if (res.error) throw res.error;
      return res.data as any;
    },
  });

  const likeIds = useLikeIds(user?.id);
  const liked = useMemo(() => new Set(likeIds.data?.reelIds ?? []).has(reelId), [likeIds.data?.reelIds, reelId]);
  const toggleLike = useToggleReelLike(user?.id);

  const comments = useReelComments(reelId);
  const addComment = useAddReelComment(user?.id);
  const [text, setText] = useState('');
  const canSend = useMemo(() => text.trim().length > 0 && !!user?.id && !addComment.isPending, [text, user?.id, addComment.isPending]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {isLoading || !data ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#9aa4b2' }}>Loading…</Text>
        </View>
      ) : (
        <>
          <View style={{ height: 320, backgroundColor: '#000' }}>
            {data.video_url ? (
              <Video source={{ uri: data.video_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" isLooping shouldPlay isMuted />
            ) : null}
          </View>

          <ScrollView style={{ flex: 1, backgroundColor: '#020617' }} contentContainerStyle={{ padding: 12, paddingBottom: 110, gap: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>Reel</Text>
            <Text style={{ color: '#9aa4b2' }}>
              {data.profiles?.username ? `@${data.profiles.username}` : data.user_id} • {new Date(data.created_at).toLocaleString()}
            </Text>
            {data.caption ? <Text style={{ color: '#e6e6e6' }}>{data.caption}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => toggleLike.mutate({ reelId, isLiked: liked })}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: liked ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.18)',
                  backgroundColor: liked ? 'rgba(239,68,68,0.16)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: '#e6e6e6', fontWeight: '900' }}>{liked ? '♥' : '♡'} {data.like_count ?? 0}</Text>
              </Pressable>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: '#e6e6e6', fontWeight: '900' }}>💬 {data.comment_count ?? 0}</Text>
              </View>
            </View>

            <Text style={{ color: '#fff', fontWeight: '900', marginTop: 6 }}>Comments</Text>
            {comments.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
            {(comments.data ?? []).map((c) => (
              <View key={c.id} style={{ padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{c.profiles?.username ? `@${c.profiles.username}` : c.user_id}</Text>
                <Text style={{ color: '#e6e6e6', marginTop: 4 }}>{c.content}</Text>
              </View>
            ))}
            {!comments.isLoading && (comments.data ?? []).length === 0 ? <Text style={{ color: '#9aa4b2' }}>No comments yet.</Text> : null}
          </ScrollView>

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', backgroundColor: '#0b1220' }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Add a comment…"
                placeholderTextColor="#6b7280"
                style={{
                  flex: 1,
                  minHeight: 40,
                  maxHeight: 120,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                }}
                multiline
              />
              <Pressable
                onPress={() => {
                  const content = text.trim();
                  if (!content) return;
                  setText('');
                  addComment.mutate({ reelId, content });
                }}
                disabled={!canSend}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: 'rgba(37,99,235,0.28)',
                  borderWidth: 1,
                  borderColor: 'rgba(37,99,235,0.35)',
                  opacity: canSend ? 1 : 0.5,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>{addComment.isPending ? '…' : 'Send'}</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

