import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Field, Notice, ToggleRow } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { normalizeHost, RouterError } from '@/lib/client';
import { errorMessage } from '@/lib/format';
import { space, useColors } from '@/theme';

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [host, setHost] = useState(auth.host);
  const [username, setUsername] = useState(auth.username);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(auth.remember);
  const [showAddress, setShowAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await auth.signIn({ host: normalizeHost(host), username: username.trim(), password }, remember);
    } catch (err) {
      setError(errorMessage(err));
      // An unreachable router is often a wrong address, so surface that field.
      if (err instanceof RouterError && err.kind === 'network') setShowAddress(true);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: space.xl,
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + space.xl,
          gap: space.xl,
        }}>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 30 }}>
              {[0.4, 0.6, 0.8, 1].map((h) => (
                <View
                  key={h}
                  style={{ width: 6, height: 30 * h, borderRadius: 2, backgroundColor: c.onAccent }}
                />
              ))}
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: c.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.4 }}>
              MiFi Manager
            </Text>
            <Text style={{ color: c.sub, fontSize: 15 }}>Sign in to your hotspot</Text>
          </View>
        </View>

        {auth.notice && !error ? <Notice tone="warn">{auth.notice}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <Card style={{ gap: space.lg }}>
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoComplete="username"
            returnKeyType="next"
            editable={!busy}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secret
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!busy}
          />
          <ToggleRow
            title="Remember me"
            detail="Stay signed in on this phone until the router rejects the password."
            value={remember}
            onValueChange={setRemember}
            disabled={busy}
          />
          {showAddress ? (
            <Field
              label="Router address"
              value={host}
              onChangeText={setHost}
              keyboardType="url"
              placeholder="192.168.100.1"
              editable={!busy}
            />
          ) : null}
          <Button title="Sign in" onPress={submit} loading={busy} disabled={!canSubmit} />
        </Card>

        <View style={{ alignItems: 'center', gap: space.md }}>
          {!showAddress ? (
            <Pressable onPress={() => setShowAddress(true)} hitSlop={10}>
              <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>
                Router address: {normalizeHost(host)}
              </Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wifi" size={14} color={c.faint} />
            <Text style={{ color: c.faint, fontSize: 13 }}>
              Connect to the hotspot&apos;s Wi-Fi before signing in
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
