import {
  evaluateAlerts,
  loadAlertSettings,
  loadAlertState,
  newDeviceMessage,
  saveAlertState,
} from './alerts';
import { type DeviceRegistry, type KnownDevice, loadRegistry, recordConnected } from './devices';
import { recordSample } from './history';
import { present } from './notify';
import type { AllStatus, ConnectedDevice, SysInfo } from './types';

let chain: Promise<unknown> = Promise.resolve();

/**
 * Everything that should happen each time fresh status arrives, whether the app is open or
 * a background check fetched it: log a history point, update the device registry, and raise
 * any alerts that are due.
 *
 * `connected` may be null when the device list was not fetched. `confirmations` is passed to
 * the alert rules (see `evaluateAlerts`). Never throws.
 */
export function processReading(
  status: AllStatus,
  sys: SysInfo,
  connected: ConnectedDevice[] | null,
  confirmations: number
): Promise<{ newcomers: KnownDevice[] }> {
  const run = chain.then(async () => {
    try {
      await recordSample(status, sys);
      const newcomers = connected ? (await recordConnected(connected)).newcomers : [];
      const settings = await loadAlertSettings();
      const previous = await loadAlertState();
      const { messages, state } = evaluateAlerts(
        settings,
        previous,
        { status, sys, newcomers },
        confirmations
      );
      if (JSON.stringify(state) !== JSON.stringify(previous)) await saveAlertState(state);
      await present(messages);
      return { newcomers };
    } catch {
      return { newcomers: [] };
    }
  });
  chain = run;
  return run;
}

/**
 * Records the connected-device list on its own (used by the Devices screen) and announces
 * devices seen for the first time, so a new device is reported whichever screen spots it.
 */
export function noteConnected(
  connected: ConnectedDevice[]
): Promise<{ registry: DeviceRegistry; newcomers: KnownDevice[] }> {
  const run = chain.then(async () => {
    try {
      const result = await recordConnected(connected);
      if (result.newcomers.length > 0) {
        const settings = await loadAlertSettings();
        if (settings.enabled && settings.newDevice) {
          await present([newDeviceMessage(result.newcomers)]);
        }
      }
      return result;
    } catch {
      return { registry: await loadRegistry(), newcomers: [] };
    }
  });
  chain = run;
  return run;
}
