import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { useToast } from '@/components/toast';
import { Button, Card, Field, Notice, Row, Screen, ToggleRow } from '@/components/ui';
import { confirm } from '@/hooks/useAction';
import {
  forgetDevice,
  type KnownDevice,
  loadRegistry,
  normalizeMac,
  updateDevice,
} from '@/lib/devices';
import { formatDateTime, formatRelative } from '@/lib/format';
import { space, useColors } from '@/theme';

export default function DeviceScreen() {
  const c = useColors();
  const toast = useToast();
  const params = useLocalSearchParams<{ mac: string; online?: string }>();
  const mac = normalizeMac(String(params.mac ?? ''));
  const online = params.online === '1';

  const [device, setDevice] = useState<KnownDevice | null>(null);
  const [missing, setMissing] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadRegistry().then((registry) => {
      if (cancelled) return;
      const found = registry[mac] ?? null;
      setDevice(found);
      setMissing(found === null);
      setNickname(found?.nickname ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [mac]);

  if (missing) {
    return (
      <Screen>
        <Notice tone="warn">This device is no longer in the list.</Notice>
      </Screen>
    );
  }
  if (!device) return <Screen>{null}</Screen>;

  const nameChanged = nickname.trim() !== (device.nickname ?? '');

  async function saveName() {
    const registry = await updateDevice(mac, { nickname: nickname.trim() || undefined });
    setDevice(registry[mac] ?? null);
    toast.success(nickname.trim() ? 'Name saved' : 'Name cleared');
  }

  async function setTrusted(trusted: boolean) {
    const registry = await updateDevice(mac, { trusted });
    setDevice(registry[mac] ?? null);
  }

  function forget() {
    confirm({
      title: 'Forget this device?',
      message: online
        ? 'Its name and history will be removed. Because it is connected right now, it will show up again as a new device.'
        : 'Its name and history will be removed. If it connects again it will be reported as a new device.',
      confirmLabel: 'Forget',
      destructive: true,
      onConfirm: async () => {
        await forgetDevice(mac);
        router.back();
      },
    });
  }

  async function copy(label: string, value: string) {
    await Clipboard.setStringAsync(value);
    toast.success(`${label} copied`);
  }

  const now = Date.now();

  return (
    <Screen>
      {!device.trusted ? (
        <Notice tone="warn">
          This device connected for the first time recently. If you recognise it, mark it as trusted.
          If you do not, change the Wi-Fi password to remove it.
        </Notice>
      ) : null}

      <Card style={{ gap: space.lg }}>
        <Field
          label="Name"
          value={nickname}
          onChangeText={setNickname}
          placeholder={device.name || 'Give this device a name'}
          autoCapitalize="words"
          maxLength={40}
          hint={device.name ? `Reports itself as “${device.name}”.` : 'This device does not report a name.'}
        />
        {nameChanged ? <Button title="Save name" onPress={saveName} /> : null}
        <ToggleRow
          title="Trusted"
          detail="Trusted devices are not flagged as new."
          value={device.trusted}
          onValueChange={setTrusted}
        />
      </Card>

      <Card style={{ paddingVertical: space.xs }}>
        <Row label="Status" value={online ? 'Connected now' : `Last seen ${formatRelative(device.lastSeen, now)}`} />
        <Row label="IP address" value={device.lastIp} onLongPress={() => copy('IP address', device.lastIp)} />
        <Row
          label="MAC address"
          value={device.mac.toUpperCase()}
          onLongPress={() => copy('MAC address', device.mac.toUpperCase())}
        />
        <Row label="Connection" value={device.type === 'WIFI' ? 'Wi-Fi' : device.type || null} />
        <Row label="First seen" value={formatDateTime(device.firstSeen)} last />
      </Card>

      <Text style={{ color: c.faint, fontSize: 13, lineHeight: 18 }}>
        Many phones use a different, random MAC address for each network or after a reset, so one
        phone can appear here more than once. The router has no way to block a single device.
      </Text>

      <Button title="Forget this device" variant="danger" icon="trash-outline" onPress={forget} />
    </Screen>
  );
}
