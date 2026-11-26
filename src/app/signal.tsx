import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { type ChartPoint, LineChart } from '@/components/LineChart';
import { Button, Card, LoadGate, Screen, SignalBars } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { formatClock, signalQuality } from '@/lib/format';
import { signalColor, space, useColors } from '@/theme';

/** How often to ask the router. Only one light request per tick, so this stays gentle on it. */
const POLL_MS = 2500;
const WINDOW_MS = 3 * 60 * 1000;
const MAX_READINGS = 120;

export default function SignalFinderScreen() {
  const c = useColors();
  const { data, error, loading, refresh } = useRouterData(api.allStatus, { intervalMs: POLL_MS });
  const [readings, setReadings] = useState<ChartPoint[]>([]);

  // Every successful poll returns a new object, so this runs once per reading.
  useEffect(() => {
    if (!data) return;
    const quality = signalQuality(data.signalStrength);
    if (!quality.known) return;
    setReadings((current) =>
      [...current, { t: Date.now(), v: data.signalStrength }].slice(-MAX_READINGS)
    );
  }, [data]);

  const quality = signalQuality(data?.signalStrength);
  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    let best = -Infinity;
    let worst = Infinity;
    let sum = 0;
    for (const r of readings) {
      if (r.v > best) best = r.v;
      if (r.v < worst) worst = r.v;
      sum += r.v;
    }
    return { best, worst, mean: sum / readings.length };
  }, [readings]);

  const latest = readings[readings.length - 1];
  const end = latest?.t ?? 0;
  const domain = useMemo<[number, number]>(() => [end - WINDOW_MS, end], [end]);
  const atBest = stats !== null && latest !== undefined && readings.length >= 3 && latest.v >= stats.best;

  return (
    <Screen>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
          <SignalBars level={quality.level} known={quality.known} size={72} />
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: c.text,
                fontSize: 56,
                fontWeight: '700',
                letterSpacing: -1.5,
                fontVariant: ['tabular-nums'],
              }}>
              {quality.known ? data?.signalStrength : '—'}
            </Text>
            <Text style={{ color: c.sub, fontSize: 15 }}>dBm · {quality.label}</Text>
          </View>
          {atBest ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: signalColor(c, 4),
                }}
              />
              <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
                Best spot so far
              </Text>
            </View>
          ) : null}
        </Card>

        {stats ? (
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Figure label="Best" value={`${stats.best}`} />
            <Figure label="Average" value={`${Math.round(stats.mean)}`} />
            <Figure label="Worst" value={`${stats.worst}`} />
          </View>
        ) : null}

        {readings.length >= 2 ? (
          <Card style={{ gap: space.sm }}>
            <Text style={{ color: c.sub, fontSize: 14, fontWeight: '600' }}>Last 3 minutes</Text>
            <LineChart
              points={readings}
              domain={domain}
              height={140}
              maxGapMs={15000}
              formatValue={(v) => String(Math.round(v))}
              formatTime={formatClock}
              accessibilityLabel={`Signal over the last three minutes. Now ${latest?.v} dBm, best ${stats?.best}, worst ${stats?.worst}.`}
            />
          </Card>
        ) : null}

        <Text style={{ color: c.sub, fontSize: 14, lineHeight: 21 }}>
          Move the router around slowly and watch the number. Closer to zero is stronger: −85 is
          excellent, −105 is fair, below −115 is very weak. Near a window and higher up usually helps.
          Wait a few seconds in each spot, because the router reports a new reading only every few
          seconds.
        </Text>

        <Button
          title="Start again"
          variant="secondary"
          icon="refresh"
          onPress={() => setReadings([])}
          disabled={readings.length === 0}
        />
      </LoadGate>
    </Screen>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md }}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ color: c.sub, fontSize: 12 }}>{label}</Text>
    </Card>
  );
}
