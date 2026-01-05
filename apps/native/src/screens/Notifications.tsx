import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../features/social/notifications';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { data, isLoading } = useNotifications(user?.id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#020617' }} contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 8 }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>Notifications</Text>
      {isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
      {(data ?? []).map((n) => (
        <View
          key={n.id}
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{n.type}</Text>
          <Text style={{ color: '#9aa4b2', marginTop: 4 }}>{n.content}</Text>
          <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>{new Date(n.created_at).toLocaleString()}</Text>
        </View>
      ))}
      {!isLoading && (data ?? []).length === 0 ? <Text style={{ color: '#9aa4b2' }}>No notifications yet.</Text> : null}
    </ScrollView>
  );
}

