import { Platform } from 'react-native';

import type { AlertMessage } from './alerts';

/**
 * Thin wrapper over expo-notifications.
 *
 * The library is loaded on first use rather than at startup: importing it has side effects
 * (and prints a push-notification warning inside Expo Go) that are pointless while alerts
 * are switched off.
 */

type Notifications = typeof import('expo-notifications');

const CHANNEL_ID = 'router-alerts';

let cached: Notifications | null | undefined;
let prepared = false;

function lib(): Notifications | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = Platform.OS === 'web' ? null : (require('expo-notifications') as Notifications);
    } catch {
      cached = null;
    }
  }
  return cached;
}

async function prepare(n: Notifications): Promise<void> {
  if (prepared) return;
  prepared = true;
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    // Android 13+ only shows its permission prompt once a channel exists.
    await n.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Router alerts',
      description: 'Low battery, lost connection, new devices and overheating',
      importance: n.AndroidImportance.HIGH,
    });
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function notificationPermission(): Promise<PermissionState> {
  const n = lib();
  if (!n) return 'unavailable';
  try {
    await prepare(n);
    const status = await n.getPermissionsAsync();
    return status.granted ? 'granted' : status.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Asks for permission if needed. Resolves true when notifications may be shown. */
export async function requestNotificationPermission(): Promise<boolean> {
  const n = lib();
  if (!n) return false;
  try {
    await prepare(n);
    const current = await n.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await n.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Shows the given alerts now. Does nothing without permission; never throws. */
export async function present(messages: AlertMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const n = lib();
  if (!n) return;
  try {
    await prepare(n);
    if (!(await n.getPermissionsAsync()).granted) return;
    for (const message of messages) {
      await n.scheduleNotificationAsync({
        content: { title: message.title, body: message.body, data: { key: message.key } },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      });
    }
  } catch {
    // A notification that cannot be shown must not break the status refresh that raised it.
  }
}
