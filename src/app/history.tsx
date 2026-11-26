import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { type ChartPoint, LineChart } from '@/components/LineChart';
import { downsample } from '@/lib/chart';
import { Button, Card, Chips, Notice, Screen } from '@/components/ui';
import { confirm } from '@/hooks/useAction';
import { formatClock, formatDateTime } from '@/lib/format';
import { batteryTrend, clearHistory, formatHoursLeft, loadHistory, type Sample } from '@/lib/history';
import { space, useColors } from '@/theme';

const RANGES = [
  { value: '1', label: '1 hour' },
  { value: '6', label: '6 hours' },
  { value: '24', label: '24 hours' },
] as const;

/** Most points a chart draws; about one for every three pixels of a phone-width plot. */
const MAX_DRAWN_POINTS = 90;

type Metric = 'signal' | 'battery' | 'temp' | 'devices';

const METRICS: {
  key: Metric;
  title: string;
  unit: string;
  yRange?: [number, number];
  /** Words for the smallest and largest value, where "low" and "high" would mislead. */
  extremes: [string, string];
  note?: string;
}[] = [
  {
    key: 'signal',
    title: 'Signal',
    unit: ' dBm',
    extremes: ['Weakest', 'Strongest'],
    note: 'Closer to zero is stronger.',
  },
  { key: 'battery', title: 'Battery', unit: '%', yRange: [0, 100], extremes: ['Lowest', 'Highest'] },
  { key: 'temp', title: 'Temperature', unit: '°C', extremes: ['Coolest', 'Hottest'] },
  { key: 'devices', title: 'Connected devices', unit: '', extremes: ['Fewest', 'Most'] },
];

function series(samples: Sample[], metric: Metric): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const s of samples) {
    const v = s[metric];
    if (v !== null) points.push({ t: s.t, v });
  }
  return points;
}

function MetricCard({
  metric,
  samples,
  domain,
}: {
  metric: (typeof METRICS)[number];
  samples: Sample[];
  domain: [number, number];
}) {
  const c = useColors();
  const [inspected, setInspected] = useState<ChartPoint | null>(null);
  const points = useMemo(
    () => series(samples, metric.key).filter((p) => p.t >= domain[0] && p.t <= domain[1]),
    [samples, metric.key, domain]
  );
  // Longer ranges are averaged into buckets so the line shows the trend, not minute-to-minute
  // jitter. A gap must outlast both five minutes and two buckets before the line is broken.
  const bucketMs = (domain[1] - domain[0]) / MAX_DRAWN_POINTS;
  const drawn = useMemo(() => downsample(points, domain, MAX_DRAWN_POINTS), [points, domain]);
  const maxGapMs = Math.max(5 * 60 * 1000, bucketMs * 2.5);
  const format = (v: number) => `${Math.round(v)}${metric.unit}`;
  const axisFormat = (v: number) => String(Math.round(v));

  const latest = points[points.length - 1];
  const shown = inspected ?? latest;
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const p of points) {
      if (p.v < min) min = p.v;
      if (p.v > max) max = p.v;
      sum += p.v;
    }
    return { min, max, mean: sum / points.length };
  }, [points]);

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: c.sub, fontSize: 14, fontWeight: '600' }}>{metric.title}</Text>
          {metric.note ? <Text style={{ color: c.faint, fontSize: 12 }}>{metric.note}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: c.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>
            {shown ? format(shown.v) : '—'}
          </Text>
          <Text style={{ color: c.faint, fontSize: 12 }}>
            {inspected ? formatDateTime(inspected.t) : latest ? `Latest, ${formatClock(latest.t)}` : 'No readings'}
          </Text>
        </View>
      </View>

      {points.length >= 2 && stats ? (
        <>
          <LineChart
            points={drawn}
            domain={domain}
            maxGapMs={maxGapMs}
            yRange={metric.yRange}
            formatValue={axisFormat}
            formatTime={formatClock}
            onInspect={setInspected}
            accessibilityLabel={`${metric.title} chart. Latest ${format(latest.v)}. ${metric.extremes[0]} ${format(stats.min)}, ${metric.extremes[1].toLowerCase()} ${format(stats.max)}.`}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Summary label={metric.extremes[0]} value={format(stats.min)} />
            <Summary label="Average" value={format(stats.mean)} />
            <Summary label={metric.extremes[1]} value={format(stats.max)} />
          </View>
        </>
      ) : (
        <Text style={{ color: c.faint, fontSize: 13, paddingVertical: space.lg, textAlign: 'center' }}>
          Not enough readings in this period yet.
        </Text>
      )}
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
      <Text style={{ color: c.faint, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const c = useColors();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('6');
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async () => {
    setSamples([...(await loadHistory())]);
    setNow(Date.now());
  }, []);

  // Pick up new readings while the screen stays open (one is logged about every minute).
  useFocusEffect(
    useCallback(() => {
      void reload();
      const id = setInterval(() => void reload(), 30000);
      return () => clearInterval(id);
    }, [reload])
  );

  const domain = useMemo<[number, number]>(
    () => [now - Number(range) * 3_600_000, now],
    [now, range]
  );
  const trend = batteryTrend(samples, now);

  function clear() {
    confirm({
      title: 'Clear history?',
      message: 'All recorded readings on this phone will be deleted. The router is not affected.',
      confirmLabel: 'Clear',
      destructive: true,
      onConfirm: async () => {
        await clearHistory();
        await reload();
      },
    });
  }

  return (
    <Screen>
      <Chips options={RANGES} value={range} onChange={setRange} />

      {trend?.state === 'draining' ? (
        <Notice>
          {`At the current rate (${trend.percentPerHour.toFixed(1)}% an hour) the battery will last about ${formatHoursLeft(trend.hoursLeft)}.`}
        </Notice>
      ) : trend?.state === 'charging' ? (
        <Notice>The battery is charging.</Notice>
      ) : null}

      {samples.length === 0 ? (
        <Card style={{ gap: space.sm }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>No history yet</Text>
          <Text style={{ color: c.sub, fontSize: 14, lineHeight: 20 }}>
            A reading is saved about once a minute while the app is open, and every 15 minutes or so in
            the background when alerts are switched on.
          </Text>
        </Card>
      ) : (
        METRICS.map((metric) => (
          <MetricCard key={metric.key} metric={metric} samples={samples} domain={domain} />
        ))
      )}

      {samples.length > 0 ? (
        <>
          <Text style={{ color: c.faint, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            Touch and drag on a chart to read any point. Gaps mean no reading was taken, for example
            while this phone was away from the hotspot.
          </Text>
          <Button title="Clear history" variant="secondary" onPress={clear} />
        </>
      ) : null}
    </Screen>
  );
}
