import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card, LoadGate, Notice, Pill, Row, Screen, SectionLabel, SignalBars, Stat } from '@/components/ui';
import { confirm, useAction } from '@/hooks/useAction';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { passwordIsOneOf } from '@/lib/client';
import { loadRegistry, normalizeMac } from '@/lib/devices';
import { formatUptime, signalQuality, toNumber } from '@/lib/format';
import { batteryTrend, formatHoursLeft, loadHistory } from '@/lib/history';
import { processReading } from '@/lib/monitor';
import { DEFAULT_ADMIN_PASSWORDS, securityIssues } from '@/lib/security';
import { radius, space, useColors } from '@/theme';
import { syncWidgets } from '@/widgets/bridge';

const SIM_SWITCH_MS = 20000;

/** Polled every 10 seconds while Home is open. */
async function loadDashboard() {
  const status = await api.allStatus();
  const sys = await api.sysInfo();
  const overview = await api.overview();
  const connected = await api.devices().catch(() => null);

  // Log history, update known devices and raise any alerts, then keep widgets in step.
  await processReading(status, sys, connected, 2);
  void syncWidgets(status, sys);

  const registry = await loadRegistry();
  const unrecognised = (connected ?? []).filter(
    (d) => registry[normalizeMac(d.devmac)]?.trusted === false
  ).length;
  const trend = batteryTrend(await loadHistory(), Date.now());
  return { status, sys, overview, unrecognised, trend };
}

/** Slower-changing details, read once each time Home is opened. */
async function loadExtras() {
  const wifi = await api.wifi();
  const config = await api.config();
  const sim = config.simnum > 1 ? await api.sim() : null;
  return { wifi, config, sim };
}

type IconName = keyof typeof Ionicons.glyphMap;

function ActionTile({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: c.border }}
      style={{
        // Three tiles to a row.
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: space.md,
        paddingHorizontal: space.xs,
        borderRadius: radius.md,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
        opacity: disabled ? 0.5 : 1,
      }}>
      <Ionicons name={icon} size={22} color={c.accent} />
      <Text numberOfLines={1} style={{ color: c.text, fontSize: 12, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useRouterData(loadDashboard, {
    intervalMs: 10000,
  });
  const extras = useRouterData(loadExtras);
  const { busy, run } = useAction();

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

  const trend = data?.trend ?? null;
  const batteryDetail =
    trend?.state === 'draining'
      ? `About ${formatHoursLeft(trend.hoursLeft)} left`
      : trend?.state === 'charging'
        ? 'Charging'
        : undefined;

  const issues = extras.data
    ? securityIssues({
        adminPasswordIsDefault: passwordIsOneOf(DEFAULT_ADMIN_PASSWORDS),
        wifi: extras.data.wifi,
      })
    : [];
  const unrecognised = data?.unrecognised ?? 0;

  // With two SIM slots, offer a one-tap switch to the other one.
  const sim = extras.data?.sim ?? null;
  const otherSlot = sim && extras.data?.config.simnum === 2 ? (sim.simset === 0 ? 1 : 0) : null;
  const simNeedsPassword = extras.data?.config.simhaspwd === true;

  function restart() {
    confirm({
      title: 'Restart the router?',
      message: 'Every device will lose its connection for about a minute.',
      confirmLabel: 'Restart',
      onConfirm: () => run(api.reboot, 'The router is restarting. It will be back in about a minute.'),
    });
  }

  function switchSim() {
    if (otherSlot === null || !sim) return;
    if (simNeedsPassword) {
      // Protected units ask for a SIM password; that flow lives on the full screen.
      router.push('/settings/mobile');
      return;
    }
    confirm({
      title: `Switch to SIM ${otherSlot + 1}?`,
      message: 'Mobile data will be unavailable for about 20 seconds while the router switches.',
      confirmLabel: 'Switch',
      onConfirm: async () => {
        const ok = await run(async () => {
          await api.setSim(otherSlot, sim.spassw ?? '');
          await new Promise((resolve) => setTimeout(resolve, SIM_SWITCH_MS));
        }, `Now using SIM ${otherSlot + 1}`);
        if (ok) await extras.reload();
      },
    });
  }

  return (
    <Screen
      title={status?.carrier || 'Home'}
      subtitle={overview?.SSID}
      refreshing={refreshing}
      onRefresh={() => {
        refresh();
        void extras.reload();
      }}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        {issues.length > 0 ? (
          <Notice
            tone={issues.some((i) => i.severity === 'high') ? 'danger' : 'warn'}
            action={{ label: 'Review and fix', onPress: () => router.push('/security') }}>
            {issues.length === 1
              ? `Security: ${issues[0].title.toLowerCase()}.`
              : `${issues.length} security issues leave this hotspot easy to get into.`}
          </Notice>
        ) : null}
        {unrecognised > 0 ? (
          <Notice
            tone="warn"
            action={{ label: 'See devices', onPress: () => router.push('/devices') }}>
            {unrecognised === 1
              ? 'A new device is connected to your hotspot.'
              : `${unrecognised} new devices are connected to your hotspot.`}
          </Notice>
        ) : null}

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
            detail={batteryDetail}
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

        <SectionLabel>Quick actions</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <ActionTile icon="qr-code-outline" label="Share Wi-Fi" onPress={() => router.push('/settings/wifi-share')} />
          <ActionTile icon="locate-outline" label="Signal finder" onPress={() => router.push('/signal')} />
          <ActionTile icon="stats-chart-outline" label="History" onPress={() => router.push('/history')} />
          {otherSlot !== null ? (
            <ActionTile
              icon="swap-horizontal-outline"
              label={`Use SIM ${otherSlot + 1}`}
              onPress={switchSim}
              disabled={busy}
            />
          ) : null}
          <ActionTile icon="save-outline" label="Backup" onPress={() => router.push('/settings/backup')} />
          <ActionTile icon="refresh" label="Restart" onPress={restart} disabled={busy} />
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
