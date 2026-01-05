import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { useSendMessage, useThread } from '../features/messaging/thread';
import { uploadAssetToBucket } from '../lib/storageUpload';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

export default function MessageThreadScreen({ route }: { route: { params: { conversationId: string } } }) {
  const { user } = useAuth();
  const conversationId = route.params.conversationId;
  const { data, isLoading } = useThread(conversationId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const messages = data ?? [];
  const canSend = useMemo(() => !!user?.id && text.trim().length > 0 && !send.isPending, [user?.id, text, send.isPending]);

  // Realtime: append new incoming messages instantly
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as any;
          queryClient.setQueryData(['thread', conversationId], (old: any) => {
            const arr = Array.isArray(old) ? old : [];
            if (arr.some((m: any) => m.id === next.id)) return arr;
            return [...arr, next];
          });
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['conversations', user.id] }).catch(() => {});
          }
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 30);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  async function onSend() {
    if (!user?.id) return;
    const content = text.trim();
    if (!content) return;
    setText('');
    try {
      await send.mutateAsync({ conversationId, senderId: user.id, content });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      // If send fails, user can re-type; keep minimal for now.
    }
  }

  async function pickAndSend(kind: 'image' | 'video') {
    if (!user?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    try {
      // Use the existing `stories` bucket (it already has policies + public access in migrations).
      const uploaded = await uploadAssetToBucket({ bucket: 'stories', userId: user.id, asset });
      await send.mutateAsync({
        conversationId,
        senderId: user.id,
        content: kind === 'image' ? '📷 Photo' : '🎥 Video',
        mediaUrl: uploaded.publicUrl,
        mediaType: kind,
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      // Minimal handling for now
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#020617' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Messages</Text>
        <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>{conversationId}</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: '#9aa4b2' }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef as any}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: mine ? 'rgba(37,99,235,0.28)' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    borderColor: mine ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text style={{ color: '#fff' }}>{item.content}</Text>
                  {item.media_url && item.media_type === 'image' ? (
                    <Image
                      source={{ uri: item.media_url }}
                      style={{ width: 220, height: 220, borderRadius: 12, marginTop: 8, backgroundColor: '#0b0f19' }}
                    />
                  ) : null}
                  {item.media_url && item.media_type === 'video' ? (
                    <View style={{ width: 220, height: 220, borderRadius: 12, marginTop: 8, overflow: 'hidden', backgroundColor: '#0b0f19' }}>
                      <Video
                        source={{ uri: item.media_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        useNativeControls
                        shouldPlay={false}
                        isLooping={false}
                      />
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                  {new Date(item.created_at).toLocaleTimeString()}
                </Text>
              </View>
            );
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', backgroundColor: '#0b1220' }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <Pressable
            onPress={() => pickAndSend('image').catch(() => {})}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>📷</Text>
          </Pressable>
          <Pressable
            onPress={() => pickAndSend('video').catch(() => {})}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>🎥</Text>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
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
            onPress={() => onSend().catch(() => {})}
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
            <Text style={{ color: '#fff', fontWeight: '900' }}>{send.isPending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

