import { router } from 'expo-router';
import { Text } from 'react-native';

import { ListCard, NavRow, Screen, SectionLabel } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { confirm, useAction } from '@/hooks/useAction';
import { api } from '@/lib/api';
import { loadSnapshot } from '@/lib/snapshot';
import { useColors } from '@/theme';
import { markWidgetsSignedOut } from '@/widgets/bridge';

export default function SettingsScreen() {
  const c = useColors();
  const auth = useAuth();
  const { busy, run } = useAction();

  function restart() {
    confirm({
      title: 'Restart the router?',
      message: 'Every device will lose its connection for about a minute.',
      confirmLabel: 'Restart',
      onConfirm: () => run(api.reboot, 'The router is restarting. It will be back in about a minute.'),
    });
  }

  function factoryReset() {
    confirm({
      title: 'Erase all router settings?',
      message:
        'The Wi-Fi name and password, APN, and admin password all return to the factory defaults printed on the router. Every device will be disconnected and must rejoin with the default Wi-Fi password.',
      confirmLabel: 'Erase and reset',
      destructive: true,
      onConfirm: () =>
        run(api.factoryReset, 'Factory reset started. Rejoin the default Wi-Fi when it returns.'),
    });
  }

  async function signOut() {
    const snapshot = await loadSnapshot();
    await auth.signOut();
    void markWidgetsSignedOut(snapshot);
  }

  return (
    <Screen title="Settings" subtitle={`${auth.username} · ${auth.host}`}>
      <SectionLabel>Hotspot</SectionLabel>
      <ListCard>
        <NavRow
          icon="wifi"
          title="Wi-Fi hotspot"
          detail="Name, password, channel, on/off"
          onPress={() => router.push('/settings/wifi')}
          last
        />
      </ListCard>

      <SectionLabel>Mobile data</SectionLabel>
      <ListCard>
        <NavRow
          icon="cellular"
          title="Mobile network"
          detail="Network mode, SIM card, USB tethering"
          onPress={() => router.push('/settings/mobile')}
        />
        <NavRow
          icon="globe-outline"
          title="APN"
          detail="Access point used for mobile data"
          onPress={() => router.push('/settings/apn')}
        />
        <NavRow
          icon="pulse"
          title="Connection check"
          detail="Addresses used to detect a dropped link"
          onPress={() => router.push('/settings/connection')}
          last
        />
      </ListCard>

      <SectionLabel>Local network</SectionLabel>
      <ListCard>
        <NavRow
          icon="git-network-outline"
          title="LAN & DHCP"
          detail="Router address and IP range"
          onPress={() => router.push('/settings/lan')}
          last
        />
      </ListCard>

      <SectionLabel>System</SectionLabel>
      <ListCard>
        <NavRow
          icon="information-circle-outline"
          title="Device info"
          detail="Firmware, IMEI, SIM identifiers"
          onPress={() => router.push('/settings/device-info')}
        />
        <NavRow
          icon="key-outline"
          title="Admin password"
          detail="Change the router sign-in password"
          onPress={() => router.push('/settings/password')}
        />
        <NavRow icon="refresh" title="Restart router" onPress={busy ? () => {} : restart} chevron={false} />
        <NavRow
          icon="trash-outline"
          title="Factory reset"
          tone="danger"
          onPress={busy ? () => {} : factoryReset}
          chevron={false}
          last
        />
      </ListCard>

      <SectionLabel>Account</SectionLabel>
      <ListCard>
        <NavRow
          icon="log-out-outline"
          title="Sign out"
          detail="Forgets the saved password on this phone"
          onPress={signOut}
          chevron={false}
          last
        />
      </ListCard>

      <Text style={{ color: c.faint, fontSize: 12, textAlign: 'center' }}>MiFi Manager 1.0.0</Text>
    </Screen>
  );
}
