import { toNumber } from './format';
import { readJson, remove, writeJson } from './store';
import type { AllStatus, SysInfo } from './types';

/** One reading of the router's vital signs. */
export interface Sample {
  /** When it was taken (ms since epoch). */
  t: number;
  signal: number | null;
  battery: number | null;
  temp: number | null;
  devices: number | null;
  online: boolean;
}

const KEY = 'history.samples';
/** At one sample a minute this is a full day of continuous use. */
const MAX_SAMPLES = 1440;
const MIN_GAP_MS = 55_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function toSample(status: AllStatus, sys: SysInfo, now: number): Sample {
  const signal = status.signalStrength;
  return {
    t: now,
    signal: typeof signal === 'number' && signal < 0 && signal >= -140 ? signal : null,
    battery: toNumber(sys.batcap),
    temp: toNumber(sys.cputemp),
    devices: toNumber(sys.wifinum),
    online: status.internetState === 'connected',
  };
}

/** Adds a sample unless one was stored less than a minute ago; drops old and excess ones. */
export function appendSample(samples: Sample[], sample: Sample): Sample[] {
  const last = samples[samples.length - 1];
  if (last && sample.t - last.t < MIN_GAP_MS) return samples;
  const kept = samples.filter((s) => sample.t - s.t <= MAX_AGE_MS);
  kept.push(sample);
  return kept.length > MAX_SAMPLES ? kept.slice(kept.length - MAX_SAMPLES) : kept;
}

let cache: Sample[] | null = null;

export async function loadHistory(): Promise<Sample[]> {
  if (cache === null) cache = await readJson<Sample[]>(KEY, []);
  return cache;
}

export async function recordSample(status: AllStatus, sys: SysInfo): Promise<void> {
  const current = await loadHistory();
  const next = appendSample(current, toSample(status, sys, Date.now()));
  if (next !== current) {
    cache = next;
    await writeJson(KEY, next);
  }
}

export async function clearHistory(): Promise<void> {
  cache = [];
  await remove(KEY);
}

export type BatteryTrend =
  | { state: 'draining'; hoursLeft: number; percentPerHour: number }
  | { state: 'charging'; percentPerHour: number }
  | { state: 'steady' };

const TREND_WINDOW_MS = 90 * 60 * 1000;
const TREND_MIN_SPAN_MS = 10 * 60 * 1000;

/**
 * Estimates battery time left from the recent drain rate (least-squares fit over the last
 * 90 minutes). Returns null until there are at least ten minutes of readings to go on.
 */
export function batteryTrend(samples: Sample[], now: number): BatteryTrend | null {
  const recent = samples.filter(
    (s): s is Sample & { battery: number } => s.battery !== null && now - s.t <= TREND_WINDOW_MS
  );
  if (recent.length < 3) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (last.t - first.t < TREND_MIN_SPAN_MS) return null;

  const hours = (t: number) => (t - first.t) / 3_600_000;
  const n = recent.length;
  const meanX = recent.reduce((sum, s) => sum + hours(s.t), 0) / n;
  const meanY = recent.reduce((sum, s) => sum + s.battery, 0) / n;
  let num = 0;
  let den = 0;
  for (const s of recent) {
    num += (hours(s.t) - meanX) * (s.battery - meanY);
    den += (hours(s.t) - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;

  if (slope <= -0.5) {
    return { state: 'draining', hoursLeft: last.battery / -slope, percentPerHour: -slope };
  }
  if (slope >= 0.5) return { state: 'charging', percentPerHour: slope };
  return { state: 'steady' };
}

export function formatHoursLeft(hours: number): string {
  if (hours >= 48) return 'more than 2 days';
  if (hours >= 1) {
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes >= 5 && whole < 10 ? `${whole} h ${minutes} min` : `${whole} h`;
  }
  return `${Math.max(1, Math.round(hours * 60))} min`;
}
