import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Chips, Field, LoadGate, Notice, Screen, ToggleRow } from '@/components/ui';
import { confirm, useAction } from '@/hooks/useAction';
import { useDraft } from '@/hooks/useDraft';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { WIFI_AUTH_OPTIONS, WIFI_CHANNELS } from '@/lib/format';
import { space } from '@/theme';

export default function WifiScreen() {
  const { data, error, loading, refreshing, refresh, reload } = useRouterData(api.wifi);
  const { draft, dirty, patch, commit } = useDraft(data);
  const { busy, run } = useAction();
  // Tracks the hotspot switch separately: it applies immediately, unlike the form below.
  const [hotspotOn, setHotspotOn] = useState<boolean | null>(null);
  const isOn = hotspotOn ?? data?.wifistate === 'open';

  const secured = draft ? draft.wifiauth !== '0' : false;
  const ssidError =
    draft && (draft.wifissid.length === 0 || draft.wifissid.length > 32)
      ? 'Use 1 to 32 characters.'
      : null;
  const passError =
    draft && secured && (draft.wifipass.length < 8 || draft.wifipass.length > 32)
      ? 'Use 8 to 32 characters.'
      : null;

  const authOptions = WIFI_AUTH_OPTIONS.some((o) => o.value === draft?.wifiauth)
    ? WIFI_AUTH_OPTIONS
    : [...WIFI_AUTH_OPTIONS, { value: draft?.wifiauth ?? '', label: `Mode ${draft?.wifiauth}` }];
  const channels = WIFI_CHANNELS.includes(draft?.wifichan ?? '1')
    ? WIFI_CHANNELS
    : [draft?.wifichan ?? '', ...WIFI_CHANNELS];

  function toggleHotspot(next: boolean) {
    if (next) {
      setHotspotOn(true);
      void run(api.openWifi, 'Wi-Fi hotspot turned on').then((ok) => {
        if (!ok) setHotspotOn(null);
        void reload();
      });
      return;
    }
    confirm({
      title: 'Turn off the Wi-Fi hotspot?',
      message:
        'Every device, including this phone, will be disconnected. You will not be able to turn it back on from this app over Wi-Fi: use the button on the router or a USB connection.',
      confirmLabel: 'Turn off',
      destructive: true,
      onConfirm: () => {
        setHotspotOn(false);
        void run(api.closeWifi, 'Wi-Fi hotspot turned off').then((ok) => {
          if (!ok) setHotspotOn(null);
        });
      },
    });
  }

  function save() {
    if (!draft) return;
    confirm({
      title: 'Apply Wi-Fi changes?',
      message:
        'Connected devices, including this phone, may be disconnected and need to rejoin using the new details.',
      confirmLabel: 'Apply',
      onConfirm: () =>
        run(async () => {
          await api.setWifi(draft);
          commit(draft);
        }, 'Wi-Fi settings saved'),
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={draft !== null} onRetry={refresh}>
        {draft ? (
          <>
            <Card>
              <ToggleRow
                title="Wi-Fi hotspot"
                detail={isOn ? 'Devices can connect' : 'The hotspot is off'}
                value={isOn}
                onValueChange={toggleHotspot}
                disabled={busy}
              />
            </Card>

            <Card style={{ gap: space.lg }}>
              <Field
                label="Network name (SSID)"
                value={draft.wifissid}
                onChangeText={(wifissid) => patch({ wifissid })}
                error={ssidError}
                maxLength={32}
              />
              <Chips
                label="Security"
                options={authOptions}
                value={draft.wifiauth}
                onChange={(wifiauth) => patch({ wifiauth })}
              />
              {secured ? (
                <Field
                  label="Wi-Fi password"
                  value={draft.wifipass}
                  onChangeText={(wifipass) => patch({ wifipass })}
                  error={passError}
                  secret
                  maxLength={32}
                />
              ) : (
                <Notice tone="warn">
                  An open network lets anyone nearby connect and use your mobile data.
                </Notice>
              )}
              <Chips
                label="Channel"
                options={channels.map((value) => ({ value, label: value }))}
                value={draft.wifichan}
                onChange={(wifichan) => patch({ wifichan })}
              />
              <ToggleRow
                title="Broadcast network name"
                detail="When off, the network is hidden and must be joined by typing its name."
                value={draft.wifibrocast}
                onValueChange={(wifibrocast) => patch({ wifibrocast })}
              />
            </Card>

            <Button
              title="Share with a QR code"
              variant="secondary"
              icon="qr-code-outline"
              onPress={() => router.push('/settings/wifi-share')}
            />

            <Button
              title="Save changes"
              onPress={save}
              loading={busy}
              disabled={!dirty || ssidError !== null || passError !== null}
            />
          </>
        ) : null}
      </LoadGate>
    </Screen>
  );
}
