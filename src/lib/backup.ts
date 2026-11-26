import * as SecureStore from 'expo-secure-store';

import { api } from './api';
import { replaceHost } from './client';
import { errorMessage } from './format';
import type { ApnInfo, ConDetect, DhcpInfo, WifiInfo } from './types';

/** The router settings a backup carries. */
export interface BackupData {
  wifi: WifiInfo;
  dhcp: DhcpInfo;
  conDetect: ConDetect;
  netmode: string;
  usbTether: string;
  /** The access point that was in use, identified by its name and APN string. */
  apn: { apnname: string; apn: string } | null;
}

export interface Backup {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  firmware: string;
  data: BackupData;
}

export type Section = 'conDetect' | 'netmode' | 'usbTether' | 'apn' | 'dhcp' | 'wifi';

/**
 * Restore order. LAN and Wi-Fi come last because applying either one drops the phone's
 * connection to the router.
 */
export const SECTION_ORDER: Section[] = ['conDetect', 'netmode', 'usbTether', 'apn', 'dhcp', 'wifi'];

export const SECTION_LABELS: Record<Section, string> = {
  conDetect: 'Connection check',
  netmode: 'Network mode',
  usbTether: 'USB tethering',
  apn: 'APN',
  dhcp: 'LAN & DHCP',
  wifi: 'Wi-Fi name, password and channel',
};

function currentApn(info: ApnInfo): BackupData['apn'] {
  const apn = info.apnlist?.[info.apncurrent];
  return apn ? { apnname: apn.apnname, apn: apn.apn } : null;
}

/** Reads every backed-up setting from the router as it is now. */
export async function readCurrent(): Promise<BackupData> {
  const wifi = await api.wifi();
  const dhcp = await api.dhcp();
  const conDetect = await api.conDetect();
  const mode = await api.networkMode();
  const usb = await api.usbTether();
  const apns = await api.apns();
  return {
    wifi,
    dhcp,
    conDetect,
    netmode: mode.netmode,
    usbTether: usb.usbstatus,
    apn: currentApn(apns),
  };
}

export async function captureBackup(name: string): Promise<Backup> {
  const data = await readCurrent();
  const overview = await api.overview();
  const createdAt = Date.now();
  return {
    version: 1,
    id: createdAt.toString(36),
    name: name.trim() || defaultBackupName(createdAt),
    createdAt,
    firmware: overview.SYSVER ?? '',
    data,
  };
}

export function defaultBackupName(timestamp: number): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/** Which sections of a backup differ from the router's current settings. */
export function diffBackup(backup: BackupData, current: BackupData): Section[] {
  const changed = new Set<Section>();
  const b = backup;
  const c = current;

  if (
    b.conDetect.state !== c.conDetect.state ||
    b.conDetect.ipaddr1 !== c.conDetect.ipaddr1 ||
    b.conDetect.ipaddr2 !== c.conDetect.ipaddr2 ||
    b.conDetect.ipaddr3 !== c.conDetect.ipaddr3
  ) {
    changed.add('conDetect');
  }
  if (b.netmode !== c.netmode) changed.add('netmode');
  if (b.usbTether !== c.usbTether) changed.add('usbTether');
  if (b.apn && (b.apn.apn !== c.apn?.apn || b.apn.apnname !== c.apn?.apnname)) changed.add('apn');
  if (
    b.dhcp.gwip !== c.dhcp.gwip ||
    b.dhcp.netmask !== c.dhcp.netmask ||
    b.dhcp.dhcpserver !== c.dhcp.dhcpserver ||
    b.dhcp.ippoolstart !== c.dhcp.ippoolstart ||
    b.dhcp.ippoolend !== c.dhcp.ippoolend ||
    b.dhcp.leasetime !== c.dhcp.leasetime
  ) {
    changed.add('dhcp');
  }
  // The hotspot's on/off state is deliberately not restored: a restore must never switch it off.
  if (
    b.wifi.wifissid !== c.wifi.wifissid ||
    b.wifi.wifipass !== c.wifi.wifipass ||
    b.wifi.wifichan !== c.wifi.wifichan ||
    b.wifi.wifiauth !== c.wifi.wifiauth ||
    b.wifi.wifibrocast !== c.wifi.wifibrocast
  ) {
    changed.add('wifi');
  }
  return SECTION_ORDER.filter((section) => changed.has(section));
}

export interface RestoreResult {
  applied: Section[];
  skipped: { section: Section; reason: string }[];
  /** Set when a step failed; later steps were not attempted. */
  failed: { section: Section; message: string } | null;
}

/** Applies the chosen sections of a backup, safest first. */
export async function restoreBackup(
  backup: BackupData,
  sections: Section[],
  current: BackupData
): Promise<RestoreResult> {
  const result: RestoreResult = { applied: [], skipped: [], failed: null };
  let networkRestarting = false;

  for (const section of SECTION_ORDER) {
    if (!sections.includes(section)) continue;
    try {
      if (section === 'conDetect') {
        await api.setConDetect(backup.conDetect);
      } else if (section === 'netmode') {
        await api.setNetworkMode(backup.netmode);
      } else if (section === 'usbTether') {
        await api.setUsbTether(backup.usbTether === '1');
      } else if (section === 'apn') {
        const wanted = backup.apn;
        const list = (await api.apns()).apnlist ?? [];
        const match =
          list.find((a) => a.apn === wanted?.apn && a.apnname === wanted?.apnname) ??
          list.find((a) => a.apn === wanted?.apn);
        if (!match) {
          result.skipped.push({
            section,
            reason: `“${wanted?.apnname}” is not on the router any more. Add it under APN, then select it.`,
          });
          continue;
        }
        await api.useApn(match);
      } else if (section === 'dhcp') {
        await api.setDhcp(backup.dhcp);
        networkRestarting = true;
        if (backup.dhcp.gwip !== current.dhcp.gwip) await replaceHost(backup.dhcp.gwip);
      } else if (section === 'wifi') {
        if (networkRestarting) {
          result.skipped.push({
            section,
            reason:
              'The router is restarting its network after the LAN change. Reconnect, then restore again to apply Wi-Fi.',
          });
          continue;
        }
        await api.setWifi({ ...backup.wifi, wifistate: current.wifi.wifistate });
      }
      result.applied.push(section);
    } catch (err) {
      result.failed = { section, message: errorMessage(err) };
      break;
    }
  }
  return result;
}

/* ---------- Storage (encrypted, because backups contain the Wi-Fi password) ---------- */

const INDEX_KEY = 'mifi_backups';
const itemKey = (id: string) => `mifi_backup_${id}`;
export const MAX_BACKUPS = 10;

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Saved backups, newest first. */
export async function listBackups(): Promise<Backup[]> {
  const backups: Backup[] = [];
  for (const id of await readIndex()) {
    try {
      const raw = await SecureStore.getItemAsync(itemKey(id));
      const parsed = raw ? parseBackupText(raw) : null;
      if (parsed) backups.push({ ...parsed, id });
    } catch {
      // Skip an unreadable entry rather than hiding the rest.
    }
  }
  return backups.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveBackup(backup: Backup): Promise<void> {
  const ids = (await readIndex()).filter((id) => id !== backup.id);
  if (ids.length >= MAX_BACKUPS) {
    throw new Error(`You can keep up to ${MAX_BACKUPS} backups. Delete one first.`);
  }
  await SecureStore.setItemAsync(itemKey(backup.id), JSON.stringify(backup));
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...ids, backup.id]));
}

export async function deleteBackup(id: string): Promise<void> {
  const ids = (await readIndex()).filter((existing) => existing !== id);
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(ids));
  await SecureStore.deleteItemAsync(itemKey(id));
}

/* ---------- Export / import as text ---------- */

export function exportText(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

const isString = (v: unknown): v is string => typeof v === 'string';

/** Validates pasted or stored backup text. Returns null when it is not a usable backup. */
export function parseBackupText(text: string): Backup | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Partial<Backup>;
  const d = b.data as Partial<BackupData> | undefined;
  if (b.version !== 1 || !d) return null;

  const wifi = d.wifi;
  const dhcp = d.dhcp;
  const con = d.conDetect;
  const wifiOk =
    !!wifi &&
    isString(wifi.wifissid) &&
    wifi.wifissid.length > 0 &&
    isString(wifi.wifipass) &&
    isString(wifi.wifichan) &&
    isString(wifi.wifiauth) &&
    typeof wifi.wifibrocast === 'boolean';
  const dhcpOk =
    !!dhcp &&
    isString(dhcp.gwip) &&
    isString(dhcp.netmask) &&
    isString(dhcp.ippoolstart) &&
    isString(dhcp.ippoolend) &&
    isString(dhcp.leasetime) &&
    typeof dhcp.dhcpserver === 'boolean';
  const conOk =
    !!con && isString(con.state) && isString(con.ipaddr1) && isString(con.ipaddr2) && isString(con.ipaddr3);
  const apnOk = d.apn === null || (!!d.apn && isString(d.apn.apn) && isString(d.apn.apnname));
  if (!wifiOk || !dhcpOk || !conOk || !apnOk || !isString(d.netmode) || !isString(d.usbTether)) {
    return null;
  }

  const createdAt = typeof b.createdAt === 'number' ? b.createdAt : Date.now();
  return {
    version: 1,
    id: isString(b.id) && /^[a-z0-9]+$/i.test(b.id) ? b.id : createdAt.toString(36),
    name: isString(b.name) && b.name.trim() ? b.name.trim() : defaultBackupName(createdAt),
    createdAt,
    firmware: isString(b.firmware) ? b.firmware : '',
    data: {
      wifi: { ...wifi, wifistate: isString(wifi.wifistate) ? wifi.wifistate : 'open' },
      dhcp,
      conDetect: con,
      netmode: d.netmode,
      usbTether: d.usbTether,
      apn: d.apn ?? null,
    } as BackupData,
  };
}
