import React, { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSendMessage, useThread } from '../features/messaging/thread';

export default function MessageThreadScreen({ route }: { route: { params: { conversationId: string } } }) {
  const { user } = useAuth();
  const conversationId = route.params.conversationId;
  const { data, isLoading } = useThread(conversationId);
  const send = useSendMessage();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const messages = data ?? [];
  const canSend = useMemo(() => !!user?.id && text.trim().length > 0 && !send.isPending, [user?.id, text, send.isPending]);

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

