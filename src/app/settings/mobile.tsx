import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Chips, Field, LoadGate, Notice, Screen, ToggleRow } from '@/components/ui';
import { confirm, useAction } from '@/hooks/useAction';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { NETWORK_MODE_OPTIONS } from '@/lib/format';
import { space, useColors } from '@/theme';

const SIM_SWITCH_MS = 20000;

async function loadMobile() {
  const config = await api.config();
  const mode = await api.networkMode();
  const sim = await api.sim();
  const usb = await api.usbTether();
  return { config, mode, sim, usb };
}

export default function MobileScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useRouterData(loadMobile);
  const modeAction = useAction();
  const simAction = useAction();
  const usbAction = useAction();

  // Local selections; null means "showing what the router reports".
  const [mode, setMode] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [simPassword, setSimPassword] = useState('');
  const [usbOn, setUsbOn] = useState<boolean | null>(null);

  const currentMode = data?.mode.netmode ?? '0';
  const selectedMode = mode ?? currentMode;
  const currentSlot = data?.sim.simset ?? 0;
  const selectedSlot = slot ?? currentSlot;
  const simCount = data?.config.simnum ?? 1;
  const usbEnabled = usbOn ?? data?.usb.usbstatus === '1';

  const modeOptions = NETWORK_MODE_OPTIONS.some((o) => o.value === currentMode)
    ? NETWORK_MODE_OPTIONS
    : [...NETWORK_MODE_OPTIONS, { value: currentMode, label: `Mode ${currentMode}` }];
  const simOptions = Array.from({ length: simCount }, (_, i) => ({
    value: String(i),
    label: `SIM ${i + 1}`,
  }));
  // The router asks for the SIM password only when returning to slot 1 on protected units.
  const needsSimPassword =
    simCount > 1 && data?.config.simhaspwd === true && selectedSlot === 0 && currentSlot !== 0;

  function applyMode() {
    confirm({
      title: 'Change network mode?',
      message: 'Mobile data will drop briefly while the router reconnects.',
      confirmLabel: 'Apply',
      onConfirm: async () => {
        const ok = await modeAction.run(() => api.setNetworkMode(selectedMode), 'Network mode changed');
        if (ok) {
          await reload();
          setMode(null);
        }
      },
    });
  }

  function applySim() {
    confirm({
      title: `Switch to SIM ${selectedSlot + 1}?`,
      message: 'Mobile data will be unavailable for about 20 seconds while the router switches.',
      confirmLabel: 'Switch',
      onConfirm: async () => {
        const ok = await simAction.run(async () => {
          await api.setSim(selectedSlot, needsSimPassword ? simPassword : (data?.sim.spassw ?? ''));
          await new Promise((resolve) => setTimeout(resolve, SIM_SWITCH_MS));
        }, 'SIM switched');
        if (ok) {
          await reload();
          setSlot(null);
          setSimPassword('');
        }
      },
    });
  }

  function toggleUsb(next: boolean) {
    setUsbOn(next);
    void usbAction
      .run(() => api.setUsbTether(next), next ? 'USB tethering on' : 'USB tethering off')
      .then(async (ok) => {
        if (ok) await reload();
        setUsbOn(null);
      });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        <Card style={{ gap: space.lg }}>
          <Chips
            label="Network mode"
            options={modeOptions}
            value={selectedMode}
            onChange={setMode}
            disabled={modeAction.busy}
          />
          <Text style={{ color: c.sub, fontSize: 13, lineHeight: 18 }}>
            Auto picks the best available network. Locking to 4G or 3G can help where one of them is
            unstable.
          </Text>
          {selectedMode !== currentMode ? (
            <Button title="Apply network mode" onPress={applyMode} loading={modeAction.busy} />
          ) : null}
        </Card>

        {simCount > 1 ? (
          <Card style={{ gap: space.lg }}>
            <Chips
              label="SIM card"
              options={simOptions}
              value={String(selectedSlot)}
              onChange={(value) => setSlot(Number(value))}
              disabled={simAction.busy}
            />
            <Text style={{ color: c.sub, fontSize: 13 }}>
              In use now: SIM {(data?.sim.simcurrent ?? 0) + 1}
            </Text>
            {needsSimPassword ? (
              <Field
                label="SIM password"
                value={simPassword}
                onChangeText={setSimPassword}
                secret
              />
            ) : null}
            {simAction.busy ? (
              <Notice>Switching SIM. This takes about 20 seconds.</Notice>
            ) : null}
            {selectedSlot !== currentSlot ? (
              <Button
                title={`Switch to SIM ${selectedSlot + 1}`}
                onPress={applySim}
                loading={simAction.busy}
                disabled={needsSimPassword && simPassword.length === 0}
              />
            ) : null}
          </Card>
        ) : null}

        <Card>
          <ToggleRow
            title="USB tethering"
            detail="Share the mobile connection with a computer over the USB cable."
            value={usbEnabled}
            onValueChange={toggleUsb}
            disabled={usbAction.busy}
          />
        </Card>
      </LoadGate>
    </Screen>
  );
}
