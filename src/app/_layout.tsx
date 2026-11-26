import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { ToastProvider } from '@/components/toast';
import { AuthProvider, useAuth } from '@/context/auth';
import { useColors } from '@/theme';

function RootNavigator() {
  const c = useColors();
  const { status } = useAuth();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }
  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.bg },
      }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/wifi" options={{ title: 'Wi-Fi hotspot' }} />
        <Stack.Screen name="settings/mobile" options={{ title: 'Mobile network' }} />
        <Stack.Screen name="settings/apn" options={{ title: 'APN' }} />
        <Stack.Screen name="settings/connection" options={{ title: 'Connection check' }} />
        <Stack.Screen name="settings/lan" options={{ title: 'LAN & DHCP' }} />
        <Stack.Screen name="settings/device-info" options={{ title: 'Device info' }} />
        <Stack.Screen name="settings/password" options={{ title: 'Admin password' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const c = useColors();
  const base = c.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: c.accent,
          background: c.bg,
          card: c.card,
          text: c.text,
          border: c.border,
        },
      }}>
      <AuthProvider>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
