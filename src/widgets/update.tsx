import type { ComponentType } from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetRepresentation } from 'react-native-android-widget';

import { buildSnapshot, saveSnapshot, type WidgetData } from '@/lib/snapshot';
import type { AllStatus, SysInfo } from '@/lib/types';

import { CompactWidget, StatusWidget, type WidgetScheme } from './widgets';

type WidgetComponent = ComponentType<{ data: WidgetData; scheme: WidgetScheme; busy?: boolean }>;

/** Widget names as declared in app.json. */
export const WIDGETS: Record<string, WidgetComponent> = {
  MifiStatus: StatusWidget,
  MifiCompact: CompactWidget,
};

export function renderWidget(
  Widget: WidgetComponent,
  data: WidgetData,
  busy = false
): WidgetRepresentation {
  return {
    light: <Widget data={data} scheme="light" busy={busy} />,
    dark: <Widget data={data} scheme="dark" busy={busy} />,
  };
}

/** Redraws every widget currently on the home screen with the given data. */
export async function updateAllWidgets(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    Object.entries(WIDGETS).map(([widgetName, Widget]) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: () => renderWidget(Widget, data),
        widgetNotFound: () => {},
      }).catch(() => {})
    )
  );
}

let lastPushed = '';

/**
 * Called by the app whenever it has fresh status, so widgets track what the app shows.
 * Skips the redraw when nothing visible has changed.
 */
export async function syncWidgets(status: AllStatus, sys: SysInfo): Promise<void> {
  const snapshot = buildSnapshot(status, sys);
  const { at, ...visible } = snapshot;
  const fingerprint = JSON.stringify(visible) + Math.floor(at / 60000);
  if (fingerprint === lastPushed) return;
  lastPushed = fingerprint;
  await saveSnapshot(snapshot);
  await updateAllWidgets({ snapshot, state: 'ok' });
}

/** Called on sign-out so widgets stop showing live-looking data. */
export async function markWidgetsSignedOut(snapshot: WidgetData['snapshot']): Promise<void> {
  lastPushed = '';
  await updateAllWidgets({ snapshot, state: 'signin' });
}
