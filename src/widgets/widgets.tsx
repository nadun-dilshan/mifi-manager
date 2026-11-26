import { FlexWidget, type HexColor, SvgWidget, TextWidget } from 'react-native-android-widget';

import { formatClock, signalQuality } from '@/lib/format';
import type { WidgetData } from '@/lib/snapshot';

/** Click action handled by the widget task to re-read status from the router. */
export const REFRESH_ACTION = 'REFRESH';

export type WidgetScheme = 'light' | 'dark';

interface Palette {
  bg: HexColor;
  tile: HexColor;
  text: HexColor;
  sub: HexColor;
  off: HexColor;
  good: HexColor;
  fair: HexColor;
  bad: HexColor;
}

const PALETTES: Record<WidgetScheme, Palette> = {
  light: {
    bg: '#FFFFFF',
    tile: '#F1F3F6',
    text: '#0F172A',
    sub: '#64748B',
    off: '#D5D9E0',
    good: '#16A34A',
    fair: '#D97706',
    bad: '#DC2626',
  },
  dark: {
    bg: '#141924',
    tile: '#1E2533',
    text: '#F1F5F9',
    sub: '#94A3B8',
    off: '#364153',
    good: '#34D399',
    fair: '#FBBF24',
    bad: '#F87171',
  },
};

function levelColor(p: Palette, level: number): HexColor {
  if (level >= 3) return p.good;
  if (level === 2) return p.fair;
  return p.bad;
}

function barsSvg(level: number, on: string, off: string): string {
  const bars = [0, 1, 2, 3]
    .map((i) => {
      const h = 9 + i * 5;
      return `<rect x="${i * 7}" y="${24 - h}" width="5" height="${h}" rx="1.6" fill="${i < level ? on : off}"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="24" viewBox="0 0 26 24">${bars}</svg>`;
}

function refreshSvg(color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>` +
    `<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`
  );
}

function batterySvg(percent: number | null, p: Palette): string {
  const pct = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const fill = percent === null ? p.off : pct <= 15 ? p.bad : pct <= 30 ? p.fair : p.good;
  const width = Math.max(1.5, (pct / 100) * 15);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="14" viewBox="0 0 26 14">` +
    `<rect x="1" y="1" width="20" height="12" rx="3.2" fill="none" stroke="${p.sub}" stroke-width="1.6"/>` +
    `<rect x="22.6" y="4.4" width="2.4" height="5.2" rx="1.1" fill="${p.sub}"/>` +
    `<rect x="3.5" y="3.5" width="${width.toFixed(1)}" height="7" rx="1.4" fill="${fill}"/></svg>`
  );
}

interface WidgetProps {
  data: WidgetData;
  scheme: WidgetScheme;
  /** True while a refresh is in progress. */
  busy?: boolean;
}

function describe(data: WidgetData, busy: boolean | undefined) {
  const s = data.snapshot;
  const quality = signalQuality(s?.signal);
  const stale = data.state !== 'ok';

  let headline = s?.carrier ?? 'MiFi';
  let detail: string;
  if (data.state === 'signin') {
    headline = s?.carrier ?? 'MiFi Manager';
    detail = 'Open the app to sign in';
  } else if (!s) {
    detail = busy ? 'Checking…' : 'Not connected to the hotspot';
  } else if (data.state === 'offline') {
    detail = 'Not connected to the hotspot';
  } else if (!s.simOk) {
    detail = 'No SIM card';
  } else if (!s.internet) {
    detail = 'No internet';
  } else {
    detail = quality.known ? `Connected · ${quality.label}` : 'Connected';
  }
  return { s, quality, stale, headline, detail };
}

/** 4×2 widget: carrier, connection state, battery, devices, last update. */
export function StatusWidget({ data, scheme, busy }: WidgetProps) {
  const p = PALETTES[scheme];
  const { s, quality, stale, headline, detail } = describe(data, busy);
  const barColor = stale || !quality.known ? p.sub : levelColor(p, quality.level);
  const valueColor = stale ? p.sub : p.text;

  const tiles: { label: string; value: string }[] = [
    { label: 'Battery', value: s?.battery != null ? `${s.battery}%` : '—' },
    { label: 'Devices', value: s?.devices != null ? String(s.devices) : '—' },
    { label: busy ? 'Updating' : 'Updated', value: s ? formatClock(s.at) : '—' },
  ];

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${headline}. ${detail}.`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: p.bg,
        borderRadius: 24,
        padding: 14,
      }}>
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 12 }}>
        <SvgWidget
          svg={barsSvg(stale ? 0 : quality.level, barColor, p.off)}
          style={{ width: 30, height: 28 }}
        />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            text={headline}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 17, fontWeight: '700', color: p.text }}
          />
          <TextWidget
            text={detail}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 12, color: p.sub }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction={REFRESH_ACTION}
          accessibilityLabel="Refresh"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: p.tile,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <SvgWidget svg={refreshSvg(busy ? p.off : p.sub)} style={{ width: 16, height: 16 }} />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        {tiles.map((tile) => (
          <FlexWidget
            key={tile.label}
            style={{
              flex: 1,
              flexDirection: 'column',
              backgroundColor: p.tile,
              borderRadius: 14,
              paddingVertical: 8,
              paddingHorizontal: 10,
            }}>
            <TextWidget
              text={tile.value}
              maxLines={1}
              style={{ fontSize: 17, fontWeight: '700', color: valueColor }}
            />
            <TextWidget text={tile.label} maxLines={1} style={{ fontSize: 11, color: p.sub }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

/** 2×1 widget: signal bars and battery. Tap to refresh. */
export function CompactWidget({ data, scheme, busy }: WidgetProps) {
  const p = PALETTES[scheme];
  const { s, quality, stale, headline, detail } = describe(data, busy);
  const barColor = stale || !quality.known ? p.sub : levelColor(p, quality.level);
  const battery = s?.battery ?? null;

  return (
    <FlexWidget
      clickAction={REFRESH_ACTION}
      accessibilityLabel={`${headline}. ${detail}. Battery ${battery ?? 'unknown'} percent. Tap to refresh.`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 10,
        backgroundColor: p.bg,
        borderRadius: 22,
        paddingHorizontal: 12,
      }}>
      <SvgWidget
        svg={barsSvg(stale ? 0 : quality.level, barColor, p.off)}
        style={{ width: 24, height: 22 }}
      />
      <SvgWidget svg={batterySvg(stale ? null : battery, p)} style={{ width: 26, height: 14 }} />
      <TextWidget
        text={battery !== null ? `${battery}%` : '—'}
        maxLines={1}
        style={{ fontSize: 15, fontWeight: '700', color: stale ? p.sub : p.text }}
      />
    </FlexWidget>
  );
}
