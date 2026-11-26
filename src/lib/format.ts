import { RouterError } from './client';

export interface SignalQuality {
  /** 0–4 bars. */
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** False when the router reported no usable reading. */
  known: boolean;
}

/** Maps the router's dBm reading to bars. Thresholds follow common LTE signal bands. */
export function signalQuality(dbm: number | null | undefined): SignalQuality {
  if (typeof dbm !== 'number' || !Number.isFinite(dbm) || dbm >= 0 || dbm < -140) {
    return { level: 0, label: 'No signal', known: false };
  }
  if (dbm >= -85) return { level: 4, label: 'Excellent', known: true };
  if (dbm >= -95) return { level: 3, label: 'Good', known: true };
  if (dbm >= -105) return { level: 2, label: 'Fair', known: true };
  if (dbm >= -115) return { level: 1, label: 'Weak', known: true };
  return { level: 0, label: 'Very weak', known: true };
}

export function formatUptime(totalSeconds: number | null | undefined): string {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(totalSeconds)}s`;
}

export function formatClock(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "26 Nov, 14:05" */
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatClock(timestamp)}`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" */
export function formatRelative(timestamp: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Parses the router's numeric strings ("73", "100"); returns null when not a number. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

export function isIPv4(value: string): boolean {
  return IPV4.test(value.trim());
}

function ipToInt(ip: string): number {
  return ip
    .trim()
    .split('.')
    .reduce((acc, part) => acc * 256 + Number(part), 0);
}

export function isNetmask(value: string): boolean {
  if (!isIPv4(value)) return false;
  const bits = ipToInt(value).toString(2).padStart(32, '0');
  return /^1+0+$/.test(bits);
}

export function sameSubnet(a: string, b: string, mask: string): boolean {
  const m = ipToInt(mask);
  // Division instead of bitwise ops: JS bitwise works on signed 32-bit values.
  const size = 2 ** 32 - m;
  return Math.floor(ipToInt(a) / size) === Math.floor(ipToInt(b) / size);
}

export function compareIp(a: string, b: string): number {
  return ipToInt(a) - ipToInt(b);
}

export function errorMessage(err: unknown): string {
  if (err instanceof RouterError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong.';
}

export const WIFI_AUTH_OPTIONS = [
  { value: '4', label: 'WPA2' },
  { value: '1', label: 'WPA' },
  { value: '0', label: 'Open' },
] as const;

export const WIFI_CHANNELS = Array.from({ length: 13 }, (_, i) => String(i + 1));

export const NETWORK_MODE_OPTIONS = [
  { value: '0', label: 'Auto (4G/3G)' },
  { value: '1', label: '4G only' },
  { value: '2', label: '3G only' },
] as const;

export const PDP_OPTIONS = [
  { value: 'IP', label: 'IPv4' },
  { value: 'IPV6', label: 'IPv6' },
  { value: 'IPV4V6', label: 'IPv4/IPv6' },
] as const;

export const APN_AUTH_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1', label: 'PAP' },
  { value: '2', label: 'CHAP' },
  { value: '3', label: 'PAP/CHAP' },
] as const;
