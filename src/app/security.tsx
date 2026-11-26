import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, LoadGate, Pill, Screen } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { passwordIsOneOf } from '@/lib/client';
import { DEFAULT_ADMIN_PASSWORDS, securityIssues } from '@/lib/security';
import { space, useColors } from '@/theme';

const CHECKS = [
  'Wi-Fi has a password',
  'Wi-Fi password is not a factory default',
  'Wi-Fi password is hard to guess',
  'Wi-Fi uses WPA2 security',
  'Admin password is not a factory default',
];

export default function SecurityScreen() {
  const c = useColors();
  const { data: wifi, error, loading, refreshing, refresh } = useRouterData(api.wifi);
  const issues = securityIssues({
    adminPasswordIsDefault: passwordIsOneOf(DEFAULT_ADMIN_PASSWORDS),
    wifi,
  });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={wifi !== null} onRetry={refresh}>
        {issues.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
            <Ionicons name="shield-checkmark" size={48} color={c.success} />
            <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>No issues found</Text>
            <Text style={{ color: c.sub, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Your hotspot passed every check below.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={{ color: c.sub, fontSize: 15, lineHeight: 21 }}>
              {issues.length === 1 ? '1 thing' : `${issues.length} things`} to fix so strangers cannot
              use or take over your hotspot.
            </Text>
            {issues.map((issue) => (
              <Card key={issue.id} style={{ gap: space.md }}>
                <Pill
                  label={issue.severity === 'high' ? 'High risk' : 'Worth fixing'}
                  tone={issue.severity === 'high' ? 'danger' : 'warn'}
                />
                <View style={{ gap: 4 }}>
                  <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{issue.title}</Text>
                  <Text style={{ color: c.sub, fontSize: 14, lineHeight: 20 }}>{issue.detail}</Text>
                </View>
                <Button title={issue.action} variant="secondary" onPress={() => router.push(issue.route)} />
              </Card>
            ))}
          </>
        )}

        <Card style={{ gap: space.md }}>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>What is checked</Text>
          {CHECKS.map((check) => (
            <View key={check} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="ellipse" size={6} color={c.faint} />
              <Text style={{ color: c.text, fontSize: 14 }}>{check}</Text>
            </View>
          ))}
        </Card>
      </LoadGate>
    </Screen>
  );
}
