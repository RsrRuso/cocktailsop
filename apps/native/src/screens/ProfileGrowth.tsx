import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type Experience = {
  id: string;
  company_name: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean | null;
  is_project: boolean | null;
};

function toDate(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yearsBetween(a: Date, b: Date) {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export default function ProfileGrowthScreen({ navigation }: { navigation: Nav }) {
  const { user, session } = useAuth();

  const data = useQuery({
    queryKey: ['profile', 'growth', user?.id ?? 'anon'],
    queryFn: async () => {
      if (!user?.id) return null;

      const nowIso = new Date().toISOString();
      const [expRes, certRes, recogRes, postsRes, reelsRes, storiesRes] = await Promise.all([
        supabase.from('work_experiences').select('id, company_name, start_date, end_date, is_current, is_project').eq('user_id', user.id),
        supabase.from('exam_certificates').select('id').eq('user_id', user.id),
        supabase.from('recognitions').select('id').eq('user_id', user.id),
        supabase.from('posts').select('id, like_count').eq('user_id', user.id),
        supabase.from('reels').select('id, like_count, view_count').eq('user_id', user.id),
        supabase.from('stories').select('id').eq('user_id', user.id).gt('expires_at', nowIso),
      ]);

      if (expRes.error) throw expRes.error;
      if (certRes.error) throw certRes.error;
      if (recogRes.error) throw recogRes.error;
      if (postsRes.error) throw postsRes.error;
      if (reelsRes.error) throw reelsRes.error;
      if (storiesRes.error) throw storiesRes.error;

      return {
        experiences: (expRes.data ?? []) as unknown as Experience[],
        examCertificates: (certRes.data ?? []) as any[],
        recognitions: (recogRes.data ?? []) as any[],
        posts: (postsRes.data ?? []) as Array<{ id: string; like_count: number | null }>,
        reels: (reelsRes.data ?? []) as Array<{ id: string; like_count: number | null; view_count: number | null }>,
        stories: (storiesRes.data ?? []) as any[],
      };
    },
  });

  const metrics = useMemo(() => {
    if (!data.data) return null;
    const experiences = data.data.experiences ?? [];

    const uniqueCompanies = new Set(experiences.map((e) => e.company_name).filter(Boolean));
    const workingPlaces = uniqueCompanies.size;

    // Approximate total years as sum of experience durations.
    let totalYears = 0;
    for (const e of experiences) {
      const start = toDate(e.start_date);
      const end = e.is_current ? new Date() : e.end_date ? toDate(e.end_date) : null;
      if (start && end) totalYears += yearsBetween(start, end);
    }

    const projectsCompleted = experiences.filter((e) => !!e.is_project).length;
    const recognitions = (data.data.recognitions ?? []).length;
    const certifications = (data.data.examCertificates ?? []).length;

    const postLikes = (data.data.posts ?? []).reduce((sum, p) => sum + Number(p.like_count ?? 0), 0);
    const reelLikes = (data.data.reels ?? []).reduce((sum, r) => sum + Number(r.like_count ?? 0), 0);
    const reelViews = (data.data.reels ?? []).reduce((sum, r) => sum + Number(r.view_count ?? 0), 0);
    const activeStories = (data.data.stories ?? []).length;

    // Simple proxy score (0-100) for native overview; web has richer scoring.
    const score = Math.min(
      100,
      workingPlaces * 10 + certifications * 10 + recognitions * 5 + projectsCompleted * 4 + Math.min(20, Math.floor((postLikes + reelLikes) / 50)) + Math.min(20, Math.floor(reelViews / 5000)),
    );

    return {
      workingPlaces,
      totalYears,
      projectsCompleted,
      recognitions,
      certifications,
      activeStories,
      networkReach: postLikes + reelLikes + reelViews,
      score,
    };
  }, [data.data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Professional Growth
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Native overview + web full page
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => navigation.navigate('WebRoute', { title: 'Professional Growth', pathTemplate: '/profile/growth' })}>
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {!user?.id ? <Text style={styles.muted}>Sign in to view growth metrics.</Text> : null}
        {data.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {data.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load growth data.</Text> : null}

        {metrics ? (
          <>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionTitle}>Career development score</Text>
                <Ionicons name="trending-up-outline" size={18} color="#22c55e" />
              </View>
              <Text style={styles.big}>{metrics.score}/100</Text>
              <Text style={styles.muted}>This is a native overview score. The web page has full breakdown + dialogs.</Text>
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.grid}>
              <Kpi label="Working places" value={metrics.workingPlaces} icon="briefcase-outline" />
              <Kpi label="Years experience" value={Number(metrics.totalYears.toFixed(1))} icon="calendar-outline" />
              <Kpi label="Projects" value={metrics.projectsCompleted} icon="construct-outline" />
              <Kpi label="Recognitions" value={metrics.recognitions} icon="star-outline" />
              <Kpi label="Certificates" value={metrics.certifications} icon="ribbon-outline" />
              <Kpi label="Active stories" value={metrics.activeStories} icon="albums-outline" />
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Network reach (proxy)</Text>
              <Text style={styles.big}>{metrics.networkReach.toLocaleString()}</Text>
              <Text style={styles.muted}>Likes + reel views (simple proxy). Web page includes more detailed scoring.</Text>
            </View>
          </>
        ) : null}

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.muted}>The web page currently contains the full dialogs for adding certifications, recognitions, and experiences.</Text>
          <View style={{ height: 10 }} />
          <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('WebRoute', { title: 'Professional Growth', pathTemplate: '/profile/growth' })}>
            <Text style={styles.actionText}>Open full growth page (web)</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('WebRoute', { title: 'Exam center', pathTemplate: '/exam-center' })}>
            <Text style={styles.actionText}>Take exam (web)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.kpi}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color="#9aa4b2" />
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.kpiValue}>{Number(value ?? 0).toLocaleString()}</Text>
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
  big: { color: '#fff', fontWeight: '900', fontSize: 32, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  kpiLabel: { color: '#9aa4b2', fontWeight: '800', fontSize: 12, flex: 1 },
  kpiValue: { color: '#fff', fontWeight: '900', fontSize: 20, marginTop: 10 },
  actionBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionText: { color: '#fff', fontWeight: '900' },
});

