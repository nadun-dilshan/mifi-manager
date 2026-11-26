import { useMemo, useState } from 'react';
import { type GestureResponderEvent, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { type ChartPoint, linePath, nearestIndex, project, scaleFor } from '@/lib/chart';
import { useColors } from '@/theme';

export type { ChartPoint } from '@/lib/chart';

interface LineChartProps {
  /** Readings in time order. */
  points: ChartPoint[];
  /** Time span the x-axis covers. */
  domain: [number, number];
  /** Fixed y-axis bounds, e.g. [0, 100] for a percentage. Chosen from the data when omitted. */
  yRange?: [number, number];
  height?: number;
  formatValue: (value: number) => string;
  formatTime: (time: number) => string;
  /** The line is broken, not bridged, across gaps longer than this. */
  maxGapMs?: number;
  /** Called with the reading under the finger, and with null when it lifts. */
  onInspect?: (point: ChartPoint | null) => void;
  /** Spoken summary for screen readers. */
  accessibilityLabel?: string;
}

/** Space reserved left of the plot for y-axis labels, and below it for time labels. */
export const CHART_GUTTER = 40;
export const CHART_X_LABELS = 18;
export const CHART_TOP = 8;
export const CHART_RIGHT = 10;

/**
 * A single-series line chart over time.
 *
 * One measure per chart and one y-axis. Missing stretches are left as gaps so the line
 * never implies readings that were not taken. Touch and drag to read off any point.
 */
export function LineChart({
  points,
  domain,
  yRange,
  height = 150,
  formatValue,
  formatTime,
  maxGapMs = 5 * 60 * 1000,
  onInspect,
  accessibilityLabel,
}: LineChartProps) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - CHART_GUTTER - CHART_RIGHT);
  const plotHeight = height - CHART_TOP - CHART_X_LABELS;

  const visible = useMemo(
    () => points.filter((p) => p.t >= domain[0] && p.t <= domain[1]),
    [points, domain]
  );
  const scale = useMemo(() => scaleFor(visible, yRange), [visible, yRange]);
  const projection = useMemo(
    () =>
      project({ left: CHART_GUTTER, top: CHART_TOP, width: plotWidth, height: plotHeight }, domain, scale),
    [plotWidth, plotHeight, domain, scale]
  );
  const { path, loneDots } = useMemo(
    () => linePath(visible, projection, maxGapMs),
    [visible, projection, maxGapMs]
  );

  function inspect(event: GestureResponderEvent) {
    if (plotWidth <= 0) return;
    const index = nearestIndex(visible, projection, event.nativeEvent.locationX);
    if (index < 0) return;
    setActive(index);
    onInspect?.(visible[index]);
  }

  function release() {
    setActive(null);
    onInspect?.(null);
  }

  const last = visible[visible.length - 1];
  const focus = active !== null ? visible[active] : undefined;
  const marker = focus ?? last;
  const xLabels = [domain[0], (domain[0] + domain[1]) / 2, domain[1]];
  const { x, y } = projection;

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            {scale.ticks.map((tick) => (
              <Line
                key={tick}
                x1={CHART_GUTTER}
                x2={width - CHART_RIGHT}
                y1={y(tick)}
                y2={y(tick)}
                stroke={c.border}
                strokeWidth={1}
              />
            ))}
            {focus ? (
              <Line
                x1={x(focus.t)}
                x2={x(focus.t)}
                y1={CHART_TOP}
                y2={CHART_TOP + plotHeight}
                stroke={c.faint}
                strokeWidth={1}
              />
            ) : null}
            {path ? (
              <Path
                d={path}
                stroke={c.chart}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ) : null}
            {loneDots.map((p) => (
              <Circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={2} fill={c.chart} />
            ))}
            {marker ? (
              // The ring in the surface colour keeps the marker readable where it sits on the line.
              <Circle
                cx={x(marker.t)}
                cy={y(marker.v)}
                r={4.5}
                fill={c.chart}
                stroke={c.card}
                strokeWidth={2}
              />
            ) : null}
          </Svg>

          {scale.ticks.map((tick) => (
            <Text
              key={tick}
              numberOfLines={1}
              style={{
                position: 'absolute',
                left: 0,
                width: CHART_GUTTER - 6,
                top: y(tick) - 7,
                textAlign: 'right',
                color: c.faint,
                fontSize: 10,
              }}>
              {formatValue(tick)}
            </Text>
          ))}
          {xLabels.map((time, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={{
                position: 'absolute',
                top: height - CHART_X_LABELS + 4,
                left: i === 0 ? CHART_GUTTER : i === 1 ? CHART_GUTTER + plotWidth / 2 - 30 : undefined,
                right: i === 2 ? CHART_RIGHT : undefined,
                width: 60,
                textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
                color: c.faint,
                fontSize: 10,
              }}>
              {formatTime(time)}
            </Text>
          ))}

          {/* Transparent touch layer: a child-free view, so touch positions are relative to the chart. */}
          <View
            style={{ position: 'absolute', left: 0, top: 0, width, height: height - CHART_X_LABELS }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={inspect}
            onResponderMove={inspect}
            onResponderRelease={release}
            onResponderTerminate={release}
          />
        </>
      ) : null}
    </View>
  );
}
