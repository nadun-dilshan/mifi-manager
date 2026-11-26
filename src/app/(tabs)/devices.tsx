import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ListCard, LoadGate, Notice, Screen, SectionLabel } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { displayName, type KnownDevice, normalizeMac } from '@/lib/devices';
import { formatRelative } from '@/lib/format';
import { noteConnected } from '@/lib/monitor';
import { radius, space, useColors } from '@/theme';

async function loadDevices() {
  const connected = await api.devices();
  // Remember who is here (and announce anyone new) before showing the list.
  const { registry } = await noteConnected(connected);
  const onlineMacs = new Set(connected.map((d) => normalizeMac(d.devmac)));
  const online = connected
    .map((d) => registry[normalizeMac(d.devmac)])
    .filter((d): d is KnownDevice => d !== undefined);
  const offline = Object.values(registry)
    .filter((d) => !onlineMacs.has(d.mac))
    .sort((a, b) => b.lastSeen - a.lastSeen);
  return { online, offline, at: Date.now() };
}

function DeviceRow({
  device,
  online,
  last,
  now,
}: {
  device: KnownDevice;
  online: boolean;
  last: boolean;
  now: number;
}) {
  const c = useColors();
  const wired = device.type !== '' && device.type.toUpperCase() !== 'WIFI';
  const isNew = !device.trusted;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/device/[mac]',
          params: { mac: device.mac, online: online ? '1' : '0' },
        })
      }
      android_ripple={{ color: c.border }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: isNew ? c.warnSoft : online ? c.accentSoft : c.input,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons
          name={isNew ? 'help' : wired ? 'git-network-outline' : 'wifi'}
          size={20}
          color={isNew ? c.warn : online ? c.accent : c.faint}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>
          {displayName(device)}
        </Text>
        <Text numberOfLines={1} style={{ color: c.sub, fontSize: 13 }}>
          {online
            ? `${device.lastIp} · ${device.mac.toUpperCase()}`
            : `Last seen ${formatRelative(device.lastSeen, now)}`}
        </Text>
      </View>
      {isNew ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radius.pill,
            backgroundColor: c.warnSoft,
          }}>
          <Text style={{ color: c.warn, fontSize: 11, fontWeight: '700' }}>NEW</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={c.faint} />
    </Pressable>
  );
}

export default function DevicesScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useRouterData(loadDevices, {
    intervalMs: 15000,
  });
  const online = data?.online ?? [];
  const offline = data?.offline ?? [];
  const now = data?.at ?? 0;
  const unrecognised = online.filter((d) => !d.trusted).length;

  return (
    <Screen
      title="Devices"
      subtitle={data ? `${online.length} connected` : undefined}
      refreshing={refreshing}
      onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        {unrecognised > 0 ? (
          <Notice tone="warn">
            {unrecognised === 1
              ? '1 connected device is new. Tap it to name it and mark it as trusted.'
              : `${unrecognised} connected devices are new. Tap each one to name it and mark it as trusted.`}
          </Notice>
        ) : null}

        {online.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: space.md }}>
            <Ionicons name="wifi-outline" size={40} color={c.faint} />
            <Text style={{ color: c.sub, fontSize: 15 }}>No devices are connected</Text>
          </View>
        ) : (
          <ListCard>
            {online.map((device, i) => (
              <DeviceRow
                key={device.mac}
                device={device}
                online
                last={i === online.length - 1}
                now={now}
              />
            ))}
          </ListCard>
        )}

        {offline.length > 0 ? (
          <>
            <SectionLabel>Seen before</SectionLabel>
            <ListCard>
              {offline.map((device, i) => (
                <DeviceRow
                  key={device.mac}
                  device={device}
                  online={false}
                  last={i === offline.length - 1}
                  now={now}
                />
              ))}
            </ListCard>
          </>
        ) : null}
      </LoadGate>
    </Screen>
  );
}
