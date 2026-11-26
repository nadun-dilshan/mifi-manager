import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { syncWidgets } from '@/widgets/bridge';

import { api } from './api';
import { hasCredentials, hydrate } from './client';
import { processReading } from './monitor';

const TASK_NAME = 'mifi-background-check';
const TIMEOUT_MS = 6000;

/**
 * One background visit to the router: read status, then log history, update known devices,
 * raise alerts and refresh widgets. Needs a remembered login and the hotspot's Wi-Fi.
 */
export async function runBackgroundCheck(): Promise<void> {
  await hydrate();
  if (!hasCredentials()) return;
  const options = { timeoutMs: TIMEOUT_MS };
  const status = await api.allStatus(options);
  const sys = await api.sysInfo(options);
  const devices = await api.devices(options).catch(() => null);
  await processReading(status, sys, devices, 1);
  await syncWidgets(status, sys).catch(() => {});
}

// Tasks must be defined at module load so Android can run them without any screen mounted.
try {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await runBackgroundCheck();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      // Usually just "not on the hotspot's Wi-Fi right now".
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
} catch {
  // Background tasks are unavailable in this environment (for example Expo Go on Android).
}

/**
 * Turns the periodic check on or off. Android runs it at most every 15 minutes, and only
 * with a network connection and enough battery. Resolves false when unsupported here.
 */
export async function setBackgroundChecks(enabled: boolean): Promise<boolean> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (enabled && !registered) {
      await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
    } else if (!enabled && registered) {
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    }
    return true;
  } catch {
    return false;
  }
}
