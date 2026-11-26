import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { ListCard, LoadGate, Screen } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import type { ConnectedDevice } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

function DeviceRow({ device, last }: { device: ConnectedDevice; last: boolean }) {
  const c = useColors();
  const toast = useToast();
  const wired = device.devtypestr?.toUpperCase() !== 'WIFI';

  async function copyDetails() {
    await Clipboard.setStringAsync(`${device.devname}  ${device.devip}  ${device.devmac}`);
    toast.success('Device details copied');
  }

  return (
    <Pressable
      onLongPress={copyDetails}
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
          backgroundColor: c.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={wired ? 'git-network-outline' : 'wifi'} size={20} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>
          {device.devname || 'Unknown device'}
        </Text>
        <Text numberOfLines={1} style={{ color: c.sub, fontSize: 13 }}>
          {device.devip} · {device.devmac?.toUpperCase()}
        </Text>
      </View>
      <Text style={{ color: c.faint, fontSize: 12, fontWeight: '600' }}>
        {wired ? device.devtypestr || 'Wired' : 'Wi-Fi'}
      </Text>
    </Pressable>
  );
}

export default function DevicesScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useRouterData(api.devices, {
    intervalMs: 15000,
  });
  const count = data?.length ?? 0;

  return (
    <Screen
      title="Devices"
      subtitle={data ? `${count} connected` : undefined}
      refreshing={refreshing}
      onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        {count === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 56, gap: space.md }}>
            <Ionicons name="wifi-outline" size={40} color={c.faint} />
            <Text style={{ color: c.sub, fontSize: 15 }}>No devices are connected</Text>
          </View>
        ) : (
          <>
            <ListCard>
              {data?.map((device, i) => (
                <DeviceRow
                  key={device.devmac || device.devip}
                  device={device}
                  last={i === count - 1}
                />
              ))}
            </ListCard>
            <Text style={{ color: c.faint, fontSize: 13, textAlign: 'center' }}>
              Press and hold a device to copy its details
            </Text>
          </>
        )}
      </LoadGate>
    </Screen>
  );
}
