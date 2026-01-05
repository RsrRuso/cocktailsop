import React from 'react';
import { ScrollView, Text, View, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export default function PostDetailScreen({ route }: { route: { params: { postId: string } } }) {
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#020617' }} contentContainerStyle={{ padding: 12, paddingBottom: 48 }}>
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
          <Text style={{ color: '#9aa4b2' }}>
            ♥ {data.like_count ?? 0} • 💬 {data.comment_count ?? 0}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

