import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { Snapshot } from '@/lib/snapshot';
import type { AllStatus, SysInfo } from '@/lib/types';

/**
 * Home-screen widgets rely on native Android code that exists only in a real build of
 * this app. Expo Go does not contain it, and merely importing the widget library there
 * crashes the app, so everything widget-related is loaded lazily through this file.
 */
export const widgetsSupported =
  Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type UpdateModule = typeof import('./update');

function update(): UpdateModule | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return widgetsSupported ? (require('./update') as UpdateModule) : null;
}

/** Registers the background task that draws the widgets. Call once at startup. */
export function registerWidgets(): void {
  if (!widgetsSupported) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { registerWidgetTaskHandler } =
    require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./task-handler') as typeof import('./task-handler');
  /* eslint-enable @typescript-eslint/no-require-imports */
  registerWidgetTaskHandler(widgetTaskHandler);
}

/** Pushes fresh status to any widgets on the home screen. */
export async function syncWidgets(status: AllStatus, sys: SysInfo): Promise<void> {
  await update()?.syncWidgets(status, sys);
}

/** Switches widgets to their "sign in" state. */
export async function markWidgetsSignedOut(snapshot: Snapshot | null): Promise<void> {
  await update()?.markWidgetsSignedOut(snapshot);
}
