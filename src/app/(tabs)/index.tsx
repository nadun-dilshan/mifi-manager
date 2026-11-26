import { Text, View } from 'react-native';

import { Card, LoadGate, Pill, Row, Screen, SignalBars, Stat } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { formatUptime, signalQuality, toNumber } from '@/lib/format';
import { space, useColors } from '@/theme';
import { syncWidgets } from '@/widgets/update';

async function loadDashboard() {
  const status = await api.allStatus();
  const sys = await api.sysInfo();
  const overview = await api.overview();
  // Keep home-screen widgets in step with what the app is showing.
  void syncWidgets(status, sys);
  return { status, sys, overview };
}

export default function HomeScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useRouterData(loadDashboard, {
    intervalMs: 10000,
  });

  const status = data?.status;
  const sys = data?.sys;
  const overview = data?.overview;

  const quality = signalQuality(status?.signalStrength);
  const simOk = status ? status.simCardState !== 'invalid' : true;
  const online = status?.internetState === 'connected';
  const battery = toNumber(sys?.batcap);
  const temperature = toNumber(sys?.cputemp);
  const deviceCount = (toNumber(sys?.wifinum) ?? 0) + (toNumber(sys?.ethnum) ?? 0);

  const connection = !simOk
    ? ({ label: 'No SIM card', tone: 'danger' } as const)
    : online
      ? ({ label: 'Connected', tone: 'success' } as const)
      : ({ label: 'No internet', tone: 'warn' } as const);

  return (
    <Screen
      title={status?.carrier || 'Home'}
      subtitle={overview?.SSID}
      refreshing={refreshing}
      onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: space.md, flex: 1 }}>
              <Pill label={connection.label} tone={connection.tone} />
              <View style={{ gap: 2 }}>
                <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>
                  {quality.label}
                </Text>
                <Text style={{ color: c.sub, fontSize: 15 }}>
                  {quality.known ? `Signal ${status?.signalStrength} dBm` : 'No signal reading'}
                </Text>
              </View>
            </View>
            <SignalBars level={quality.level} known={quality.known} size={64} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat
            icon="battery-half"
            label="Battery"
            value={battery !== null ? `${battery}%` : '—'}
            tone={battery !== null && battery <= 15 ? 'danger' : battery !== null && battery <= 30 ? 'warn' : 'default'}
          />
          <Stat icon="phone-portrait-outline" label="Devices" value={String(deviceCount)} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat
            icon="thermometer-outline"
            label="Temperature"
            value={temperature !== null ? `${temperature}°C` : '—'}
          />
          <Stat icon="time-outline" label="Uptime" value={formatUptime(sys?.sysruntime)} />
        </View>

        <Card style={{ paddingVertical: space.xs }}>
          <Row label="Wi-Fi hotspot" value={status?.wifiapstatus === 'on' ? 'On' : 'Off'} />
          <Row label="Network name" value={overview?.SSID} />
          <Row label="SIM card" value={simOk ? 'Ready' : 'Not detected'} />
          <Row label="WAN IP" value={overview?.WANIP} />
          <Row label="Router time" value={sys?.systime} last />
        </Card>
      </LoadGate>
    </Screen>
  );
}
