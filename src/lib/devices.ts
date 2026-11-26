import { readJson, writeJson } from './store';
import type { ConnectedDevice } from './types';

/** What the app remembers about a device that has connected to the hotspot. */
export interface KnownDevice {
  mac: string;
  /** Name the device reported the last time it was seen. */
  name: string;
  /** Name the user gave it, if any. */
  nickname?: string;
  /** False until the user confirms they recognise it. */
  trusted: boolean;
  firstSeen: number;
  lastSeen: number;
  lastIp: string;
  type: string;
}

export type DeviceRegistry = Record<string, KnownDevice>;

const KEY = 'devices.registry';

export function normalizeMac(mac: string): string {
  return mac.trim().toLowerCase();
}

export function displayName(device: Pick<KnownDevice, 'name' | 'nickname'>): string {
  return device.nickname?.trim() || device.name || 'Unknown device';
}

/**
 * Folds the currently connected devices into the registry.
 *
 * The very first observation is treated as the baseline: everything connected then is
 * trusted, so installing the app does not flag the user's own devices. After that, a MAC
 * address never seen before is returned in `newcomers` and stays untrusted until confirmed.
 */
export function mergeSeen(
  registry: DeviceRegistry,
  connected: ConnectedDevice[],
  now: number
): { registry: DeviceRegistry; newcomers: KnownDevice[] } {
  const baseline = Object.keys(registry).length === 0;
  const next: DeviceRegistry = { ...registry };
  const newcomers: KnownDevice[] = [];

  for (const device of connected) {
    if (!device.devmac) continue;
    const mac = normalizeMac(device.devmac);
    const existing = next[mac];
    if (existing) {
      next[mac] = {
        ...existing,
        name: device.devname || existing.name,
        lastSeen: now,
        lastIp: device.devip || existing.lastIp,
        type: device.devtypestr || existing.type,
      };
    } else {
      const added: KnownDevice = {
        mac,
        name: device.devname || '',
        trusted: baseline,
        firstSeen: now,
        lastSeen: now,
        lastIp: device.devip || '',
        type: device.devtypestr || '',
      };
      next[mac] = added;
      if (!baseline) newcomers.push(added);
    }
  }
  return { registry: next, newcomers };
}

export function loadRegistry(): Promise<DeviceRegistry> {
  return readJson<DeviceRegistry>(KEY, {});
}

// Registry updates are read-modify-write, so they run one at a time.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

/** Records who is connected right now and reports devices never seen before. */
export function recordConnected(
  connected: ConnectedDevice[]
): Promise<{ registry: DeviceRegistry; newcomers: KnownDevice[] }> {
  return serial(async () => {
    const result = mergeSeen(await loadRegistry(), connected, Date.now());
    await writeJson(KEY, result.registry);
    return result;
  });
}

export function updateDevice(
  mac: string,
  changes: Partial<Pick<KnownDevice, 'nickname' | 'trusted'>>
): Promise<DeviceRegistry> {
  return serial(async () => {
    const registry = await loadRegistry();
    const key = normalizeMac(mac);
    if (registry[key]) {
      registry[key] = { ...registry[key], ...changes };
      await writeJson(KEY, registry);
    }
    return registry;
  });
}

export function forgetDevice(mac: string): Promise<DeviceRegistry> {
  return serial(async () => {
    const registry = await loadRegistry();
    delete registry[normalizeMac(mac)];
    await writeJson(KEY, registry);
    return registry;
  });
}
