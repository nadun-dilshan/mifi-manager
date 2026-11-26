import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widgets/task-handler';

// Home-screen widgets render through a headless task, so the handler has to be
// registered before the router boots the app UI.
registerWidgetTaskHandler(widgetTaskHandler);

// eslint-disable-next-line import/first
import 'expo-router/entry';
