import { Ionicons } from '@expo/vector-icons';
import { Linking, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, ListCard, NavRow, Screen, SectionLabel } from '@/components/ui';
import {
  APP_NAME,
  APP_VERSION,
  DEVELOPER_NAME,
  DEVELOPER_URL,
  RELEASES_URL,
  REPO_URL,
} from '@/lib/app-info';
import { space, useColors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const HIGHLIGHTS: { icon: IconName; text: string }[] = [
  { icon: 'speedometer-outline', text: 'Live signal, battery, temperature and connected devices' },
  { icon: 'wifi', text: 'Wi-Fi name, password, channel and hotspot on/off' },
  { icon: 'cellular', text: 'Network mode, SIM slot, APN and USB tethering' },
  { icon: 'apps-outline', text: 'Home-screen widgets for a quick glance' },
  { icon: 'lock-closed-outline', text: 'Your login stays on this phone, stored encrypted' },
];

export default function AboutScreen() {
  const c = useColors();
  const toast = useToast();

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error('Could not open the link. Check that a browser is installed.');
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 23,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 32 }}>
            {[0.4, 0.6, 0.8, 1].map((h) => (
              <View
                key={h}
                style={{ width: 6.5, height: 32 * h, borderRadius: 2, backgroundColor: c.onAccent }}
              />
            ))}
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ color: c.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>
            {APP_NAME}
          </Text>
          <Text style={{ color: c.sub, fontSize: 14 }}>Version {APP_VERSION}</Text>
        </View>
      </View>

      <Card style={{ gap: space.lg }}>
        <Text style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
          {APP_NAME} is a simpler way to look after a 4G MiFi pocket hotspot. It replaces the
          router&apos;s built-in web page with an app made for a phone screen, and talks to the
          router directly over its Wi-Fi.
        </Text>
        <View style={{ gap: space.md }}>
          {HIGHLIGHTS.map((item) => (
            <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons name={item.icon} size={18} color={c.accent} />
              <Text style={{ flex: 1, color: c.sub, fontSize: 14, lineHeight: 20 }}>{item.text}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionLabel>Developer</SectionLabel>
      <ListCard>
        <NavRow
          icon="person-outline"
          title={`Developed by ${DEVELOPER_NAME}`}
          detail="nadun.me"
          onPress={() => open(DEVELOPER_URL)}
          external
          last
        />
      </ListCard>

      <SectionLabel>Updates</SectionLabel>
      <ListCard>
        <NavRow
          icon="cloud-download-outline"
          title="Check for updates"
          detail="Opens the releases page on GitHub"
          onPress={() => open(RELEASES_URL)}
          external
        />
        <NavRow
          icon="logo-github"
          title="Source code"
          detail="github.com/nadun-dilshan/mifi-manager"
          onPress={() => open(REPO_URL)}
          external
          last
        />
      </ListCard>

      <Text style={{ color: c.faint, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
        You are running version {APP_VERSION}. Compare it with the latest release to see if a newer
        one is available.
      </Text>
    </Screen>
  );
}
