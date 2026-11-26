import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Share, Text, useWindowDimensions, View } from 'react-native';

import { QrCode } from '@/components/QrCode';
import { useToast } from '@/components/toast';
import { Button, Card, LoadGate, Notice, Row, Screen } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { wifiQrPayload } from '@/lib/wifi-qr';
import { radius, space, useColors } from '@/theme';

export default function WifiShareScreen() {
  const c = useColors();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { data: wifi, error, loading, refreshing, refresh } = useRouterData(api.wifi);
  const [revealed, setRevealed] = useState(false);

  const open = wifi?.wifiauth === '0';
  const qrSize = Math.min(width - space.lg * 4, 300);

  async function copyPassword() {
    if (!wifi || open) return;
    await Clipboard.setStringAsync(wifi.wifipass);
    toast.success('Wi-Fi password copied');
  }

  async function shareAsText() {
    if (!wifi) return;
    const lines = [`Wi-Fi: ${wifi.wifissid}`, open ? 'No password needed' : `Password: ${wifi.wifipass}`];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      toast.error('Could not open the share sheet.');
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={wifi !== null} onRetry={refresh}>
        {wifi ? (
          <>
            {wifi.wifistate !== 'open' ? (
              <Notice tone="warn">The Wi-Fi hotspot is switched off, so nobody can join right now.</Notice>
            ) : null}

            <Card style={{ alignItems: 'center', gap: space.lg }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: radius.md,
                  padding: 6,
                  overflow: 'hidden',
                }}>
                <QrCode value={wifiQrPayload(wifi)} size={qrSize} />
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{wifi.wifissid}</Text>
                <Text style={{ color: c.sub, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  Point a phone&apos;s camera at the code to join. No typing needed.
                </Text>
              </View>
            </Card>

            <Card style={{ paddingVertical: space.xs }}>
              <Row label="Network name" value={wifi.wifissid} />
              {open ? (
                <Row label="Password" value="None (open network)" last />
              ) : (
                <Pressable
                  onPress={() => setRevealed((r) => !r)}
                  onLongPress={copyPassword}
                  accessibilityRole="button"
                  accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
                  <Row label="Password" value={revealed ? wifi.wifipass : '••••••••'} last />
                </Pressable>
              )}
            </Card>
            {!open ? (
              <Text style={{ color: c.faint, fontSize: 13, textAlign: 'center' }}>
                Tap the password to show it. Press and hold to copy.
              </Text>
            ) : null}

            {!wifi.wifibrocast ? (
              <Notice>
                This network is hidden. The code still works, but some older phones need the name typed
                in by hand.
              </Notice>
            ) : null}

            <Button title="Send as text" variant="secondary" icon="share-outline" onPress={shareAsText} />
          </>
        ) : null}
      </LoadGate>
    </Screen>
  );
}
