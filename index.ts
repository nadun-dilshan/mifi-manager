import { registerWidgets } from './src/widgets/bridge';

// Home-screen widgets render through a headless task that must be registered at startup.
// This is skipped automatically where widgets are unavailable (Expo Go, iOS).
registerWidgets();

// eslint-disable-next-line import/first
import 'expo-router/entry';
