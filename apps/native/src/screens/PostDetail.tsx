import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLikeIds, useTogglePostLike } from '../features/engagement/likes';
import { useAddPostComment, usePostComments } from '../features/engagement/comments';

export default function PostDetailScreen({ route }: { route: { params: { postId: string } } }) {
  const { user } = useAuth();
  const postId = route.params.postId;
  const { data, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await supabase
        .from('posts')
        .select(
          'id, user_id, content, media_urls, like_count, comment_count, created_at, profiles:profiles (id, username, full_name, avatar_url, professional_title)',
        )
        .eq('id', postId)
        .single();
      if (res.error) throw res.error;
      return res.data as any;
    },
  });

  const likeIds = useLikeIds(user?.id);
  const postLiked = useMemo(() => new Set(likeIds.data?.postIds ?? []), [likeIds.data?.postIds]);
  const liked = postLiked.has(postId);
  const toggleLike = useTogglePostLike(user?.id);

  const comments = usePostComments(postId);
  const addComment = useAddPostComment(user?.id);
  const [text, setText] = useState('');
  const canSend = useMemo(() => text.trim().length > 0 && !!user?.id && !addComment.isPending, [text, user?.id, addComment.isPending]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#020617' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 110 }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>Post</Text>
        {isLoading ? <Text style={{ color: '#9aa4b2', marginTop: 8 }}>Loading…</Text> : null}
        {error ? <Text style={{ color: '#fca5a5', marginTop: 8 }}>Failed to load.</Text> : null}
        {data ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <Text style={{ color: '#9aa4b2' }}>
              {data.profiles?.username ? `@${data.profiles.username}` : data.user_id} •{' '}
              {new Date(data.created_at).toLocaleString()}
            </Text>
            {data.media_urls?.[0] ? (
              <Image source={{ uri: data.media_urls[0] }} style={{ width: '100%', aspectRatio: 1, borderRadius: 14 }} />
            ) : null}
            <Text style={{ color: '#e6e6e6', fontSize: 16 }}>{data.content}</Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => toggleLike.mutate({ postId, isLiked: liked })}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: liked ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.18)',
                  backgroundColor: liked ? 'rgba(239,68,68,0.16)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: '#e6e6e6', fontWeight: '800' }}>{liked ? '♥' : '♡'} {data.like_count ?? 0}</Text>
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
                <Text style={{ color: '#e6e6e6', fontWeight: '800' }}>💬 {data.comment_count ?? 0}</Text>
              </View>
            </View>

            <Text style={{ color: '#fff', fontWeight: '900', marginTop: 10 }}>Comments</Text>
            {comments.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
            {(comments.data ?? []).map((c) => (
              <View
                key={c.id}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {c.profiles?.username ? `@${c.profiles.username}` : c.user_id}
                </Text>
                <Text style={{ color: '#e6e6e6', marginTop: 4 }}>{c.content}</Text>
                <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>{new Date(c.created_at).toLocaleString()}</Text>
              </View>
            ))}
            {!comments.isLoading && (comments.data ?? []).length === 0 ? (
              <Text style={{ color: '#9aa4b2' }}>No comments yet.</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 10,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.10)',
          backgroundColor: '#0b1220',
        }}
      >
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
              addComment.mutate({ postId, content });
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
    </KeyboardAvoidingView>
  );
}

