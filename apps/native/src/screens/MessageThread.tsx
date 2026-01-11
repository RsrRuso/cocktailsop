import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
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

type Reaction = { emoji: string; user_ids: string[] };

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const;

function normalizeReactions(raw: any): Reaction[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((r) => ({
        emoji: String(r?.emoji ?? ''),
        user_ids: Array.isArray(r?.user_ids) ? r.user_ids.map((x: any) => String(x)) : [],
      }))
      .filter((r) => r.emoji && r.user_ids.length > 0);
  }
  // If stored as object map: {emoji: [userIds]}
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .map(([emoji, users]) => ({ emoji, user_ids: Array.isArray(users) ? users.map((x: any) => String(x)) : [] }))
      .filter((r) => r.emoji && r.user_ids.length > 0);
  }
  return [];
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
  const [actionMsg, setActionMsg] = useState<any | null>(null);
  const [editMsg, setEditMsg] = useState<any | null>(null);
  const [editText, setEditText] = useState('');
  const [showEdit, setShowEdit] = useState(false);

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as any;
          queryClient.setQueryData(['thread', conversationId], (old: any) => {
            const arr = Array.isArray(old) ? old : [];
            return arr.map((m: any) => (m.id === next.id ? { ...m, ...next } : m));
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (!deletedId) return;
          queryClient.setQueryData(['thread', conversationId], (old: any) => {
            const arr = Array.isArray(old) ? old : [];
            return arr.filter((m: any) => m.id !== deletedId);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  async function toggleReaction(message: any, emoji: string) {
    if (!user?.id) return;
    const current = normalizeReactions(message.reactions);
    const userExisting = current.find((r) => r.user_ids.includes(user.id));

    let cleaned = current;
    if (userExisting) {
      cleaned = current
        .map((r) => ({ ...r, user_ids: r.user_ids.filter((id) => id !== user.id) }))
        .filter((r) => r.user_ids.length > 0);
    }

    const existing = cleaned.find((r) => r.emoji === emoji);
    let updated: Reaction[];
    if (existing) {
      if (userExisting && userExisting.emoji === emoji) {
        updated = cleaned;
      } else {
        existing.user_ids.push(user.id);
        updated = cleaned;
      }
    } else {
      updated = [...cleaned, { emoji, user_ids: [user.id] }];
    }

    queryClient.setQueryData(['thread', conversationId], (old: any) => {
      const arr = Array.isArray(old) ? old : [];
      return arr.map((m: any) => (m.id === message.id ? { ...m, reactions: updated } : m));
    });

    const { error } = await supabase.from('messages').update({ reactions: updated }).eq('id', message.id);
    if (error) {
      // revert
      queryClient.setQueryData(['thread', conversationId], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return arr.map((m: any) => (m.id === message.id ? message : m));
      });
    }
  }

  async function deleteMessage(message: any) {
    if (!user?.id) return;
    if (message.sender_id !== user.id) return;

    // Optimistic
    queryClient.setQueryData(['thread', conversationId], (old: any) => {
      const arr = Array.isArray(old) ? old : [];
      return arr.filter((m: any) => m.id !== message.id);
    });

    try {
      if (message.media_url) {
        try {
          const urlParts = String(message.media_url).split('/');
          const filePath = urlParts.slice(-2).join('/');
          await supabase.storage.from('stories').remove([filePath]);
        } catch {
          // ignore
        }
      }
      const res = await supabase.from('messages').delete().eq('id', message.id);
      if (res.error) throw res.error;
    } catch {
      // revert
      queryClient.setQueryData(['thread', conversationId], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        if (arr.some((m: any) => m.id === message.id)) return arr;
        return [...arr, message].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    }
  }

  async function saveEditMessage(message: any) {
    if (!user?.id) return;
    if (message.sender_id !== user.id) return;
    const next = editText.trim();
    if (!next) return;
    setShowEdit(false);
    setEditMsg(null);

    const patched = { ...message, content: next, edited: true, edited_at: new Date().toISOString() };
    queryClient.setQueryData(['thread', conversationId], (old: any) => {
      const arr = Array.isArray(old) ? old : [];
      return arr.map((m: any) => (m.id === message.id ? patched : m));
    });

    const res = await supabase
      .from('messages')
      .update({ content: next, edited: true, edited_at: patched.edited_at })
      .eq('id', message.id);
    if (res.error) {
      queryClient.setQueryData(['thread', conversationId], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return arr.map((m: any) => (m.id === message.id ? message : m));
      });
    }
  }

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

      <Modal transparent visible={!!actionMsg} animationType="fade" onRequestClose={() => setActionMsg(null)}>
        <Pressable
          onPress={() => setActionMsg(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: '#0b1220',
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>React</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {QUICK_REACTIONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    const msg = actionMsg;
                    setActionMsg(null);
                    if (msg) toggleReaction(msg, e).catch(() => {});
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 12 }} />

            {actionMsg?.sender_id === user?.id ? (
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => {
                    setShowEdit(true);
                    setEditMsg(actionMsg);
                    setActionMsg(null);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900' }}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const msg = actionMsg;
                    setActionMsg(null);
                    if (!msg) return;
                    Alert.alert('Delete message?', 'This cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(msg).catch(() => {}) },
                    ]);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.40)',
                    backgroundColor: 'rgba(239,68,68,0.10)',
                  }}
                >
                  <Text style={{ color: '#fecaca', fontWeight: '900' }}>Delete</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ height: 10 }} />
            <Pressable
              onPress={() => setActionMsg(null)}
              style={{
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900' }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={showEdit} animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <Pressable
          onPress={() => setShowEdit(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: '#0b1220',
              borderRadius: 18,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Edit message</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="Message…"
              placeholderTextColor="#6b7280"
              style={{
                marginTop: 10,
                minHeight: 44,
                maxHeight: 160,
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
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => setShowEdit(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const msg = editMsg;
                  if (!msg) return;
                  saveEditMessage(msg).catch(() => {});
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(37,99,235,0.55)',
                  backgroundColor: 'rgba(37,99,235,0.18)',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>Save</Text>
              </Pressable>
            </View>
            <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 8 }}>Edits sync in realtime.</Text>
          </Pressable>
        </Pressable>
      </Modal>

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
            const reactions = normalizeReactions(item.reactions);
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <Pressable
                  onLongPress={() => {
                    setActionMsg(item);
                    setEditText(item.content ?? '');
                  }}
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
                </Pressable>
                {reactions.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                    {reactions.map((r) => {
                      const mineReacted = !!user?.id && r.user_ids.includes(user.id);
                      return (
                        <Pressable
                          key={`${item.id}-${r.emoji}`}
                          onPress={() => toggleReaction(item, r.emoji).catch(() => {})}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: mineReacted ? 'rgba(34,197,94,0.40)' : 'rgba(255,255,255,0.14)',
                            backgroundColor: mineReacted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '900' }}>
                            {r.emoji} {r.user_ids.length}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
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

