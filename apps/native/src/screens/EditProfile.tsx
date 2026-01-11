import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadAssetToBucket } from '../lib/storageUpload';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type ProfileEditRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  professional_title: string | null;
  region: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  date_of_birth: string | null;
  show_phone: boolean | null;
  show_whatsapp: boolean | null;
  show_website: boolean | null;
  avatar_url: string | null;
  cover_url: string | null;
};

function norm(s: string) {
  return s.trim();
}

export default function EditProfileScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['profile', 'edit', user?.id ?? 'anon'],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileEditRow> => {
      const res = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, bio, professional_title, region, phone, whatsapp, website, date_of_birth, show_phone, show_whatsapp, show_website, avatar_url, cover_url',
        )
        .eq('id', user!.id)
        .single();
      if (res.error) throw res.error;
      return res.data as unknown as ProfileEditRow;
    },
  });

  const initialRef = useRef<ProfileEditRow | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [region, setRegion] = useState('All');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [dob, setDob] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');

  const [pendingAvatar, setPendingAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [pendingCover, setPendingCover] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    if (!initialRef.current) initialRef.current = p;

    setUsername(p.username ?? '');
    setFullName(p.full_name ?? '');
    setBio(p.bio ?? '');
    setProfessionalTitle(p.professional_title ?? '');
    setRegion(p.region ?? 'All');
    setPhone(p.phone ?? '');
    setWhatsapp(p.whatsapp ?? '');
    setWebsite(p.website ?? '');
    setDob(p.date_of_birth ?? '');
    setShowPhone(p.show_phone ?? true);
    setShowWhatsapp(p.show_whatsapp ?? true);
    setShowWebsite(p.show_website ?? true);
    setAvatarUrl(p.avatar_url ?? '');
    setCoverUrl(p.cover_url ?? '');
  }, [profileQuery.data]);

  const canSave = useMemo(() => {
    if (!user?.id) return false;
    return true;
  }, [user?.id]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.95,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    setPendingAvatar(a);
    setAvatarUrl(a.uri);
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.95,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    setPendingCover(a);
    setCoverUrl(a.uri);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      const initial = initialRef.current;
      const patch: Record<string, any> = {};

      const setIfChanged = (key: keyof ProfileEditRow, next: any) => {
        const prev = (initial as any)?.[key];
        const prevNorm = prev ?? '';
        const nextNorm = next ?? '';
        if (prevNorm !== nextNorm) patch[key] = next;
      };

      setIfChanged('username', norm(username));
      setIfChanged('full_name', norm(fullName));
      setIfChanged('bio', bio.trim() ? bio : null);
      setIfChanged('professional_title', norm(professionalTitle));
      setIfChanged('region', region.trim() ? region.trim() : null);
      setIfChanged('phone', phone.trim() ? phone.trim() : null);
      setIfChanged('whatsapp', whatsapp.trim() ? whatsapp.trim() : null);
      setIfChanged('website', website.trim() ? website.trim() : null);

      const nextDob = dob.trim() ? dob.trim() : null;
      if ((initial?.date_of_birth ?? null) !== nextDob) patch.date_of_birth = nextDob;

      if ((initial?.show_phone ?? true) !== showPhone) patch.show_phone = showPhone;
      if ((initial?.show_whatsapp ?? true) !== showWhatsapp) patch.show_whatsapp = showWhatsapp;
      if ((initial?.show_website ?? true) !== showWebsite) patch.show_website = showWebsite;

      // Upload images (store public URLs)
      if (pendingAvatar) {
        const up = await uploadAssetToBucket({ bucket: 'avatars', userId: user.id, asset: pendingAvatar });
        patch.avatar_url = up.publicUrl;
      }
      if (pendingCover) {
        const up = await uploadAssetToBucket({ bucket: 'covers', userId: user.id, asset: pendingCover });
        patch.cover_url = up.publicUrl;
      }

      if (Object.keys(patch).length === 0) return;

      const res = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      await queryClient.invalidateQueries({ queryKey: ['profile', 'edit'] });
      setPendingAvatar(null);
      setPendingCover(null);
      Alert.alert('Saved', 'Profile updated.');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Failed to save', e?.message ?? 'Unknown error'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Edit profile
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Native editor + web fallback
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => navigation.navigate('WebRoute', { title: 'Edit profile', pathTemplate: '/profile/edit' })}>
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {profileQuery.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {profileQuery.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load profile.</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Images</Text>

          <View style={{ height: 10 }} />
          <Text style={styles.label}>Avatar</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}>
              {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64 }} /> : null}
            </View>
            <Pressable style={styles.smallBtn} onPress={() => pickAvatar().catch(() => {})}>
              <Text style={styles.smallBtnText}>Change avatar</Text>
            </Pressable>
          </View>

          <View style={{ height: 12 }} />
          <Text style={styles.label}>Cover</Text>
          <View style={{ marginTop: 8 }}>
            <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}>
              {coverUrl ? <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
            </View>
            <Pressable style={[styles.smallBtn, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={() => pickCover().catch(() => {})}>
              <Text style={styles.smallBtnText}>Change cover</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basics</Text>
          <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor="#6b7280" autoCapitalize="none" style={styles.input} />
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#6b7280" style={styles.input} />
          <TextInput
            value={professionalTitle}
            onChangeText={setProfessionalTitle}
            placeholder="Professional title"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          <TextInput value={region} onChangeText={setRegion} placeholder="Region" placeholderTextColor="#6b7280" style={styles.input} />
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            placeholderTextColor="#6b7280"
            style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
            multiline
          />
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor="#6b7280" autoCapitalize="none" style={styles.input} />
          <TextInput value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" placeholderTextColor="#6b7280" autoCapitalize="none" style={styles.input} />
          <TextInput value={website} onChangeText={setWebsite} placeholder="Website" placeholderTextColor="#6b7280" autoCapitalize="none" style={styles.input} />
          <TextInput value={dob} onChangeText={setDob} placeholder="Date of birth (YYYY-MM-DD)" placeholderTextColor="#6b7280" autoCapitalize="none" style={styles.input} />

          <View style={{ height: 10 }} />

          <RowToggle label="Show phone" value={showPhone} onChange={setShowPhone} />
          <RowToggle label="Show WhatsApp" value={showWhatsapp} onChange={setShowWhatsapp} />
          <RowToggle label="Show website" value={showWebsite} onChange={setShowWebsite} />
        </View>

        <View style={{ height: 12 }} />

        <Pressable
          style={[styles.primaryBtn, (!canSave || save.isPending) && { opacity: 0.6 }]}
          disabled={!canSave || save.isPending}
          onPress={() => save.mutate()}
        >
          <Text style={styles.primaryBtnText}>{save.isPending ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function RowToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
      <Text style={{ color: '#e2e8f0', fontWeight: '800' }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  backText: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: -2 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  sub: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  secondaryBtn: {},
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  label: { color: '#9aa4b2', fontWeight: '900', fontSize: 12 },
  input: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.55)',
  },
  primaryBtnText: { color: '#e2e8f0', fontWeight: '900' },
});

