import { useCallback, useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';

import { useToast } from '@/components/toast';
import { Button, Card, Chips, Divider, Notice, Screen, SectionLabel, ToggleRow } from '@/components/ui';
import {
  type AlertSettings,
  DEFAULT_ALERT_SETTINGS,
  loadAlertSettings,
  saveAlertSettings,
} from '@/lib/alerts';
import { setBackgroundChecks } from '@/lib/background';
import {
  notificationPermission,
  type PermissionState,
  present,
  requestNotificationPermission,
} from '@/lib/notify';
import { space, useColors } from '@/theme';

const BATTERY_LEVELS = [10, 15, 20, 30].map((n) => ({ value: String(n), label: `${n}%` }));
const TEMPERATURES = [75, 80, 85, 90].map((n) => ({ value: String(n), label: `${n}°C` }));

export default function AlertsScreen() {
  const c = useColors();
  const toast = useToast();
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [backgroundOk, setBackgroundOk] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadAlertSettings();
      // Only touch the notification library if alerts are already on.
      const state = stored.enabled ? await notificationPermission() : 'undetermined';
      if (cancelled) return;
      setSettings(stored);
      setPermission(state);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (changes: Partial<AlertSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes };
      void saveAlertSettings(next);
      return next;
    });
  }, []);

  async function toggleEnabled(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        const granted = await requestNotificationPermission();
        setPermission(await notificationPermission());
        if (!granted) {
          toast.error('Notifications are blocked for this app. Allow them in system settings.');
          return;
        }
      }
      await update({ enabled: on });
      setBackgroundOk(await setBackgroundChecks(on));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    await present([
      {
        key: 'test',
        title: 'Test alert',
        body: 'Notifications from MiFi Manager are working.',
      },
    ]);
  }

  const off = !settings.enabled;

  return (
    <Screen>
      <Card>
        <ToggleRow
          title="Alerts"
          detail="Get a notification when something on the hotspot needs attention."
          value={settings.enabled}
          onValueChange={toggleEnabled}
          disabled={!ready || busy}
        />
      </Card>

      {permission === 'denied' ? (
        <Notice tone="warn" action={{ label: 'Open system settings', onPress: () => Linking.openSettings() }}>
          Notifications are blocked for this app, so alerts cannot be shown.
        </Notice>
      ) : null}
      {permission === 'unavailable' ? (
        <Notice tone="warn">Notifications are not available on this device.</Notice>
      ) : null}
      {settings.enabled && !backgroundOk ? (
        <Notice tone="warn">
          Background checks are not available in this build, so alerts only appear while the app is
          open. An installed build of the app does not have this limit.
        </Notice>
      ) : null}

      <SectionLabel>Alert me about</SectionLabel>
      <Card style={{ gap: space.lg, opacity: off ? 0.5 : 1 }}>
        <ToggleRow
          title="Low battery"
          value={settings.lowBattery}
          onValueChange={(lowBattery) => update({ lowBattery })}
          disabled={off}
        />
        {settings.lowBattery ? (
          <Chips
            label="When the battery drops to"
            options={BATTERY_LEVELS}
            value={String(settings.batteryThreshold)}
            onChange={(v) => update({ batteryThreshold: Number(v) })}
            disabled={off}
          />
        ) : null}
        <Divider />
        <ToggleRow
          title="Internet lost or restored"
          value={settings.internetDown}
          onValueChange={(internetDown) => update({ internetDown })}
          disabled={off}
        />
        <Divider />
        <ToggleRow
          title="New device joins"
          detail="A device that has never connected to this hotspot before."
          value={settings.newDevice}
          onValueChange={(newDevice) => update({ newDevice })}
          disabled={off}
        />
        <Divider />
        <ToggleRow
          title="Overheating"
          value={settings.overheat}
          onValueChange={(overheat) => update({ overheat })}
          disabled={off}
        />
        {settings.overheat ? (
          <Chips
            label="When the temperature reaches"
            options={TEMPERATURES}
            value={String(settings.tempThreshold)}
            onChange={(v) => update({ tempThreshold: Number(v) })}
            disabled={off}
          />
        ) : null}
        <Divider />
        <ToggleRow
          title="SIM card missing"
          value={settings.simMissing}
          onValueChange={(simMissing) => update({ simMissing })}
          disabled={off}
        />
      </Card>

      <Button
        title="Send a test alert"
        variant="secondary"
        icon="notifications-outline"
        onPress={sendTest}
        disabled={off}
      />

      <Text style={{ color: c.sub, fontSize: 13, lineHeight: 19 }}>
        While the app is open, alerts arrive within seconds. In the background the phone checks the
        router about every 15 minutes, and only while it is connected to the hotspot&apos;s Wi-Fi and
        Remember me is on. Android may delay checks to save battery.
      </Text>
    </Screen>
  );
}
