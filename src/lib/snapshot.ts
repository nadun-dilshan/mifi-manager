import * as SecureStore from 'expo-secure-store';

import { api } from './api';
import { hasCredentials, hydrate, RouterError } from './client';
import { toNumber } from './format';
import type { AllStatus, SysInfo } from './types';

/** The handful of values the home-screen widgets show, kept so they can render instantly. */
export interface Snapshot {
  /** When these values were read from the router (ms since epoch). */
  at: number;
  carrier: string;
  signal: number | null;
  internet: boolean;
  simOk: boolean;
  hotspotOn: boolean;
  battery: number | null;
  devices: number | null;
}

/** `ok` fresh data, `offline` router unreachable, `signin` no saved login to refresh with. */
export type WidgetState = 'ok' | 'offline' | 'signin';

export interface WidgetData {
  snapshot: Snapshot | null;
  state: WidgetState;
}

const SNAPSHOT_KEY = 'mifi_snapshot';
const WIDGET_TIMEOUT_MS = 6000;

export function buildSnapshot(status: AllStatus, sys: SysInfo): Snapshot {
  return {
    at: Date.now(),
    carrier: status.carrier || 'Hotspot',
    signal: typeof status.signalStrength === 'number' ? status.signalStrength : null,
    internet: status.internetState === 'connected',
    simOk: status.simCardState !== 'invalid',
    hotspotOn: status.wifiapstatus === 'on',
    battery: toNumber(sys.batcap),
    devices: toNumber(sys.wifinum),
  };
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await SecureStore.getItemAsync(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  try {
    await SecureStore.setItemAsync(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Widgets fall back to their empty state.
  }
}

/** What the widgets should show right now without touching the network. */
export async function cachedWidgetData(): Promise<WidgetData> {
  await hydrate();
  const snapshot = await loadSnapshot();
  return { snapshot, state: hasCredentials() ? 'ok' : 'signin' };
}

/** Reads fresh values from the router using the saved login. Never throws. */
export async function refreshWidgetData(): Promise<WidgetData> {
  await hydrate();
  if (!hasCredentials()) {
    return { snapshot: await loadSnapshot(), state: 'signin' };
  }
  try {
    const status = await api.allStatus({ timeoutMs: WIDGET_TIMEOUT_MS });
    const sys = await api.sysInfo({ timeoutMs: WIDGET_TIMEOUT_MS });
    const snapshot = buildSnapshot(status, sys);
    await saveSnapshot(snapshot);
    return { snapshot, state: 'ok' };
  } catch (err) {
    const needsSignIn =
      err instanceof RouterError && (err.kind === 'auth' || err.kind === 'no-credentials');
    return { snapshot: await loadSnapshot(), state: needsSignIn ? 'signin' : 'offline' };
  }
}
