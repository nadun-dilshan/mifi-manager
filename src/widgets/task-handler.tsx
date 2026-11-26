import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { cachedWidgetData, refreshWidgetData } from '@/lib/snapshot';

import { renderWidget, updateAllWidgets, WIDGETS } from './update';
import { REFRESH_ACTION } from './widgets';

/**
 * Runs in the background whenever Android asks a widget to draw: when it is added,
 * on the 30-minute update tick, on resize, and when the refresh control is tapped.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const Widget = WIDGETS[props.widgetInfo.widgetName];
  if (!Widget) return;

  switch (props.widgetAction) {
    case 'WIDGET_DELETED':
      return;

    case 'WIDGET_RESIZED':
      props.renderWidget(renderWidget(Widget, await cachedWidgetData()));
      return;

    case 'WIDGET_CLICK':
      if (props.clickAction !== REFRESH_ACTION) return;
    // A refresh tap does the same work as a scheduled update.
    // eslint-disable-next-line no-fallthrough
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE': {
      // Draw what we already know straight away, then replace it with fresh values.
      props.renderWidget(renderWidget(Widget, await cachedWidgetData(), true));
      const fresh = await refreshWidgetData();
      props.renderWidget(renderWidget(Widget, fresh));
      // Keep the other widget (if placed) consistent with this one.
      await updateAllWidgets(fresh);
      return;
    }
  }
}
