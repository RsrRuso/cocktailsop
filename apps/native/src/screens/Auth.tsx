import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6, [email, password]);
  const canReset = useMemo(() => resetEmail.trim().length > 3, [resetEmail]);

  async function onSubmit() {
    if (!canSubmit || isBusy) return;
    setIsBusy(true);
    try {
      const trimmedEmail = email.trim();
      const res =
        mode === 'signIn'
          ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
          : await supabase.auth.signUp({ email: trimmedEmail, password });

      if (res.error) {
        Alert.alert('Auth failed', res.error.message);
        return;
      }

      if (mode === 'signUp') {
        Alert.alert('Check your email', 'Confirm your email address to finish signing up (if required).');
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function onResetPassword() {
    if (!canReset || isBusy) return;
    setIsBusy(true);
    try {
      const trimmedEmail = resetEmail.trim();
      // Note: you can configure a deep link redirect later once native deep linking is fully set up.
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) {
        Alert.alert('Reset failed', error.message);
        return;
      }
      Alert.alert('Email sent', 'Check your email for the password reset link.');
      setShowReset(false);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>SpecVerse</Text>
      <Text style={styles.subtitle}>
        {showReset ? 'Reset password' : mode === 'signIn' ? 'Sign in' : 'Create account'}
      </Text>

      <View style={styles.form}>
        {showReset ? (
          <>
            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="Email"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Pressable
              onPress={onResetPassword}
              style={[styles.primaryBtn, (!canReset || isBusy) && styles.primaryBtnDisabled]}
              disabled={!canReset || isBusy}
            >
              <Text style={styles.primaryBtnText}>{isBusy ? 'Working…' : 'Send reset email'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowReset(false)} style={styles.linkBtn}>
              <Text style={styles.linkText}>Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 6 chars)"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={styles.input}
            />

            <Pressable
              onPress={onSubmit}
              style={[styles.primaryBtn, (!canSubmit || isBusy) && styles.primaryBtnDisabled]}
              disabled={!canSubmit || isBusy}
            >
              <Text style={styles.primaryBtnText}>
                {isBusy ? 'Working…' : mode === 'signIn' ? 'Sign in' : 'Sign up'}
              </Text>
            </Pressable>

            {mode === 'signIn' ? (
              <Pressable onPress={() => setShowReset(true)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={styles.linkBtn}>
              <Text style={styles.linkText}>
                {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1220',
    padding: 24,
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  subtitle: { color: '#9aa4b2', marginTop: 8, fontSize: 16 },
  form: { marginTop: 24, gap: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { paddingVertical: 10, alignItems: 'center' },
  linkText: { color: '#9aa4b2' },
});

