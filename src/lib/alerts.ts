import { displayName, type KnownDevice } from './devices';
import { toNumber } from './format';
import { readJson, writeJson } from './store';
import type { AllStatus, SysInfo } from './types';

export interface AlertSettings {
  /** Master switch for notifications. */
  enabled: boolean;
  lowBattery: boolean;
  batteryThreshold: number;
  internetDown: boolean;
  newDevice: boolean;
  overheat: boolean;
  tempThreshold: number;
  simMissing: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: false,
  lowBattery: true,
  batteryThreshold: 20,
  internetDown: true,
  newDevice: true,
  overheat: true,
  tempThreshold: 85,
  simMissing: true,
};

/** Which conditions have already been announced, so each is reported once per occurrence. */
export interface AlertState {
  lowBattery: boolean;
  overheat: boolean;
  simMissing: boolean;
  internetDown: boolean;
  /** Consecutive readings with no internet, used to ignore one-off blips. */
  offlineStreak: number;
}

export const INITIAL_ALERT_STATE: AlertState = {
  lowBattery: false,
  overheat: false,
  simMissing: false,
  internetDown: false,
  offlineStreak: 0,
};

export interface AlertMessage {
  key: string;
  title: string;
  body: string;
}

export interface Reading {
  status: AllStatus;
  sys: SysInfo;
  /** Devices seen for the first time in this reading. */
  newcomers: KnownDevice[];
}

export function newDeviceMessage(newcomers: KnownDevice[]): AlertMessage {
  const names = newcomers.map(displayName);
  return {
    key: `newDevice:${newcomers.map((d) => d.mac).join(',')}`,
    title: names.length === 1 ? 'New device joined your hotspot' : 'New devices joined your hotspot',
    body:
      names.length === 1
        ? `${names[0]} (${newcomers[0].lastIp}) connected for the first time.`
        : `${names.join(', ')} connected for the first time.`,
  };
}

/** How far a value must recover past its threshold before the alert can fire again. */
const HYSTERESIS = 5;

/**
 * Decides which notifications a reading should produce.
 *
 * Alerts are edge-triggered: each fires when its condition starts and is re-armed only
 * after the condition clears. `confirmations` is how many readings in a row must show no
 * internet before saying so (2 while the app polls every few seconds, 1 for sparse
 * background checks).
 */
export function evaluateAlerts(
  settings: AlertSettings,
  previous: AlertState,
  reading: Reading,
  confirmations: number
): { messages: AlertMessage[]; state: AlertState } {
  const messages: AlertMessage[] = [];
  const state: AlertState = { ...previous };
  const { status, sys } = reading;
  const carrier = status.carrier || 'Hotspot';

  // Battery
  const battery = toNumber(sys.batcap);
  if (battery !== null) {
    if (battery <= settings.batteryThreshold) {
      if (!previous.lowBattery && settings.lowBattery) {
        messages.push({
          key: 'lowBattery',
          title: 'Hotspot battery low',
          body: `${battery}% left. Plug the router in to keep it running.`,
        });
      }
      state.lowBattery = true;
    } else if (battery > settings.batteryThreshold + HYSTERESIS) {
      state.lowBattery = false;
    }
  }

  // Temperature
  const temp = toNumber(sys.cputemp);
  if (temp !== null) {
    if (temp >= settings.tempThreshold) {
      if (!previous.overheat && settings.overheat) {
        messages.push({
          key: 'overheat',
          title: 'Hotspot is running hot',
          body: `${temp}°C. Move it out of the sun or off soft surfaces.`,
        });
      }
      state.overheat = true;
    } else if (temp < settings.tempThreshold - HYSTERESIS) {
      state.overheat = false;
    }
  }

  // SIM
  const simMissing = status.simCardState === 'invalid';
  if (simMissing && !previous.simMissing && settings.simMissing) {
    messages.push({
      key: 'simMissing',
      title: 'SIM card not detected',
      body: 'The router cannot find its SIM card, so mobile data is unavailable.',
    });
  }
  state.simMissing = simMissing;

  // Internet (a missing SIM is already reported above)
  const offline = !simMissing && status.internetState !== 'connected';
  state.offlineStreak = offline ? previous.offlineStreak + 1 : 0;
  if (offline) {
    if (!previous.internetDown && state.offlineStreak >= confirmations) {
      if (settings.internetDown) {
        messages.push({
          key: 'internetDown',
          title: 'Internet connection lost',
          body: `${carrier} mobile data is not connected.`,
        });
      }
      state.internetDown = true;
    }
  } else {
    if (previous.internetDown && settings.internetDown && !simMissing) {
      messages.push({
        key: 'internetBack',
        title: 'Internet is back',
        body: `${carrier} mobile data has reconnected.`,
      });
    }
    state.internetDown = false;
  }

  // New devices
  if (settings.newDevice && reading.newcomers.length > 0) {
    messages.push(newDeviceMessage(reading.newcomers));
  }

  return { messages: settings.enabled ? messages : [], state };
}

const SETTINGS_KEY = 'alerts.settings';
const STATE_KEY = 'alerts.state';

export async function loadAlertSettings(): Promise<AlertSettings> {
  return { ...DEFAULT_ALERT_SETTINGS, ...(await readJson<Partial<AlertSettings>>(SETTINGS_KEY, {})) };
}

export function saveAlertSettings(settings: AlertSettings): Promise<void> {
  return writeJson(SETTINGS_KEY, settings);
}

export async function loadAlertState(): Promise<AlertState> {
  return { ...INITIAL_ALERT_STATE, ...(await readJson<Partial<AlertState>>(STATE_KEY, {})) };
}

export function saveAlertState(state: AlertState): Promise<void> {
  return writeJson(STATE_KEY, state);
}
