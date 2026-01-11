import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio, ResizeMode, Video } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { useSendMessage, useThread } from '../features/messaging/thread';
import { uploadAssetToBucket } from '../lib/storageUpload';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

function rand() {
  return Math.random().toString(36).slice(2, 10);
}

export default function MessageThreadScreen({ route }: { route: { params: { conversationId: string } } }) {
  const { user } = useAuth();
  const conversationId = route.params.conversationId;
  const { data, isLoading } = useThread(conversationId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const presenceRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // Voice recording + playback
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const messages = data ?? [];
  const canSend = useMemo(() => !!user?.id && text.trim().length > 0 && !send.isPending, [user?.id, text, send.isPending]);

  // Presence + typing using Supabase Realtime presence
  useEffect(() => {
    if (!user?.id) return;

    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: {
        presence: { key: user.id },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state: any = presenceChannel.presenceState();
        const entries = Object.values(state) as any[];
        const other = entries.find((p) => p?.[0]?.user_id && p[0].user_id !== user.id);
        if (other && other[0]) {
          setOtherOnline(true);
          setOtherTyping(!!other[0].typing);
        } else {
          setOtherOnline(false);
          setOtherTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key }: any) => {
        if (key !== user.id) setOtherOnline(true);
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        if (key !== user.id) {
          setOtherOnline(false);
          setOtherTyping(false);
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      });

    presenceRef.current = presenceChannel;

    return () => {
      try {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      } catch {
        // ignore
      }
      supabase.removeChannel(presenceChannel);
      presenceRef.current = null;
    };
  }, [conversationId, user?.id]);

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

  // Track typing state (updates presence payload)
  useEffect(() => {
    if (!user?.id) return;
    const channel = presenceRef.current;
    if (!channel) return;

    const now = Date.now();
    const wantsTyping = text.trim().length > 0;

    if (!wantsTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channel.track({ user_id: user.id, online_at: new Date().toISOString(), typing: false }).catch(() => {});
      return;
    }

    // Throttle "typing:true" updates a bit
    if (now - lastTypingSentAtRef.current > 600) {
      lastTypingSentAtRef.current = now;
      channel.track({ user_id: user.id, online_at: new Date().toISOString(), typing: true }).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ user_id: user.id, online_at: new Date().toISOString(), typing: false }).catch(() => {});
    }, 1500);
  }, [text, user?.id]);

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

  async function pickAndSendDocument() {
    if (!user?.id) return;
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const doc = result.assets[0];

    try {
      const blob = await (await fetch(doc.uri)).blob();
      const name = doc.name || `document-${Date.now()}`;
      const ext = name.includes('.') ? name.split('.').pop() : 'bin';
      const contentType = doc.mimeType ?? 'application/octet-stream';
      const path = `${user.id}/${Date.now()}-${rand()}.${ext}`;

      // Keep parity with web: messages/doc uploads currently use the `stories` bucket.
      const up = await supabase.storage.from('stories').upload(path, blob, { contentType, upsert: false });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from('stories').getPublicUrl(path);

      await send.mutateAsync({
        conversationId,
        senderId: user.id,
        content: '📎 Document',
        mediaUrl: data.publicUrl,
        mediaType: 'document',
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      // Minimal handling for now
    }
  }

  async function stopAndUnloadSound() {
    const s = soundRef.current;
    soundRef.current = null;
    if (!s) return;
    try {
      await s.stopAsync();
    } catch {
      // ignore
    }
    try {
      await s.unloadAsync();
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    return () => {
      void stopAndUnloadSound();
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        try {
          rec.stopAndUnloadAsync().catch(() => {});
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startVoiceRecording() {
    if (!user?.id) return;
    if (isRecording) return;
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    const rec = new Audio.Recording();
    recordingRef.current = rec;
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setIsRecording(true);
  }

  async function stopVoiceRecordingAndSend() {
    if (!user?.id) return;
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    setIsRecording(false);

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) return;

      const blob = await (await fetch(uri)).blob();
      if (!blob.size) return;

      const ext = uri.split('?')[0]?.split('.').pop() || 'm4a';
      const fileName = `voice_${Date.now()}.${ext}`;
      const contentType = blob.type || 'audio/m4a';
      const path = `${user.id}/${fileName}`;

      // Keep parity with web: message media uploads use `stories` bucket today.
      const up = await supabase.storage.from('stories').upload(path, blob, { contentType, upsert: false });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from('stories').getPublicUrl(path);

      await send.mutateAsync({
        conversationId,
        senderId: user.id,
        content: '🎙️ Voice message',
        mediaUrl: data.publicUrl,
        mediaType: 'voice',
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      // minimal handling
    } finally {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    }
  }

  async function toggleVoice() {
    if (isRecording) return stopVoiceRecordingAndSend();
    return startVoiceRecording();
  }

  async function togglePlayVoice(messageId: string, url: string) {
    if (!url) return;
    // If tapping same message, stop.
    if (playingId === messageId) {
      setPlayingId(null);
      await stopAndUnloadSound();
      return;
    }

    setPlayingId(messageId);
    await stopAndUnloadSound();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status) => {
        const st: any = status;
        if (st?.didJustFinish) {
          setPlayingId(null);
          void stopAndUnloadSound();
        }
      },
    );
    soundRef.current = sound;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#020617' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Messages</Text>
        <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>{conversationId}</Text>
        <Text style={{ color: otherTyping ? '#a7f3d0' : otherOnline ? '#34d399' : '#64748b', marginTop: 4, fontSize: 12, fontWeight: '700' }}>
          {otherTyping ? 'Typing…' : otherOnline ? 'Online' : 'Offline'}
        </Text>
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
                        resizeMode={ResizeMode.COVER}
                        useNativeControls
                        shouldPlay={false}
                        isLooping={false}
                      />
                    </View>
                  ) : null}
                  {item.media_url && item.media_type === 'document' ? (
                    <Pressable
                      onPress={() => (item.media_url ? Linking.openURL(item.media_url).catch(() => {}) : undefined)}
                      style={{
                        marginTop: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.14)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900' }}>Open document</Text>
                    </Pressable>
                  ) : null}
                  {item.media_url && item.media_type === 'voice' ? (
                    <Pressable
                      onPress={() => (item.media_url ? togglePlayVoice(item.id, item.media_url).catch(() => {}) : undefined)}
                      style={{
                        marginTop: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.14)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900' }}>{playingId === item.id ? '⏸' : '▶︎'}</Text>
                      <Text style={{ color: '#e2e8f0', fontWeight: '800' }}>Voice message</Text>
                    </Pressable>
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
            onPress={() => toggleVoice().catch(() => {})}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: isRecording ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: isRecording ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>{isRecording ? '⏹' : '🎙️'}</Text>
          </Pressable>
          <Pressable
            onPress={() => pickAndSendDocument().catch(() => {})}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>📎</Text>
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

