import type { WifiInfo } from './types';

export interface SecurityIssue {
  id: 'default-admin' | 'open-wifi' | 'default-wifi-password' | 'weak-wifi-password' | 'old-wifi-security';
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  /** Screen where it can be fixed. */
  route: '/settings/password' | '/settings/wifi';
  action: string;
}

/** Admin passwords that ship on routers like this one. */
export const DEFAULT_ADMIN_PASSWORDS = ['admin', 'password', '1234', '12345', '123456', '12345678', ''];

const DEFAULT_WIFI_PASSWORDS = [
  '1234567890',
  '12345678',
  '123456789',
  '0123456789',
  '00000000',
  '11111111',
  '88888888',
  'password',
  'admin123',
];

function isWeak(password: string): boolean {
  if (password.length < 10) return true;
  if (/^\d+$/.test(password)) return true;
  if (/^(.)\1+$/.test(password)) return true;
  return false;
}

/** Lists what an outsider could exploit, most serious first. */
export function securityIssues(input: {
  adminPasswordIsDefault: boolean;
  wifi: WifiInfo | null;
}): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const { wifi } = input;

  if (wifi && wifi.wifiauth === '0') {
    issues.push({
      id: 'open-wifi',
      severity: 'high',
      title: 'Wi-Fi has no password',
      detail: 'Anyone in range can join and use your mobile data.',
      route: '/settings/wifi',
      action: 'Secure Wi-Fi',
    });
  } else if (wifi && DEFAULT_WIFI_PASSWORDS.includes(wifi.wifipass)) {
    issues.push({
      id: 'default-wifi-password',
      severity: 'high',
      title: 'Wi-Fi uses a factory default password',
      detail: 'Default passwords are widely known, so strangers can join easily.',
      route: '/settings/wifi',
      action: 'Change Wi-Fi password',
    });
  }

  if (input.adminPasswordIsDefault) {
    issues.push({
      id: 'default-admin',
      severity: 'high',
      title: 'Admin password is the factory default',
      detail:
        'Anyone connected to the hotspot can open its settings, change the Wi-Fi, or reset it.',
      route: '/settings/password',
      action: 'Change admin password',
    });
  }

  if (wifi && wifi.wifiauth !== '0') {
    if (!DEFAULT_WIFI_PASSWORDS.includes(wifi.wifipass) && isWeak(wifi.wifipass)) {
      issues.push({
        id: 'weak-wifi-password',
        severity: 'medium',
        title: 'Wi-Fi password is easy to guess',
        detail: 'Use at least 10 characters with a mix of letters and numbers.',
        route: '/settings/wifi',
        action: 'Change Wi-Fi password',
      });
    }
    if (wifi.wifiauth === '1') {
      issues.push({
        id: 'old-wifi-security',
        severity: 'medium',
        title: 'Wi-Fi uses older WPA security',
        detail: 'WPA2 is harder to break and works with all current devices.',
        route: '/settings/wifi',
        action: 'Switch to WPA2',
      });
    }
  }

  return issues;
}
