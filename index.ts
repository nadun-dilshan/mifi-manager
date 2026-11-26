// Defines the periodic background check. Android can start the app headless to run it, so
// it has to be defined as soon as the bundle loads, before any screen exists.
import './src/lib/background';
import { registerWidgets } from './src/widgets/bridge';

// Home-screen widgets render through a headless task that must be registered at startup.
// This is skipped automatically where widgets are unavailable (Expo Go, iOS).
registerWidgets();

// eslint-disable-next-line import/first
import 'expo-router/entry';
