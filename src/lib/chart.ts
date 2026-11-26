/** Geometry for the line charts, kept free of React so it can be tested on its own. */

export interface ChartPoint {
  /** Time (ms since epoch). */
  t: number;
  v: number;
}

export interface Scale {
  lo: number;
  hi: number;
  ticks: number[];
}

/** Rounds a range out to clean numbers and returns the tick values to label. */
export function niceScale(min: number, max: number): Scale {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rough = (max - min) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = lo; value <= hi + step / 1000; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return { lo, hi, ticks };
}

/** The y-scale for a set of readings: fixed bounds when given, otherwise fitted to the data. */
export function scaleFor(points: ChartPoint[], yRange?: [number, number]): Scale {
  if (yRange) {
    const [lo, hi] = yRange;
    return { lo, hi, ticks: [lo, (lo + hi) / 2, hi] };
  }
  if (points.length === 0) return { lo: 0, hi: 1, ticks: [0, 1] };
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  return niceScale(min, max);
}

/** The rectangle the line is drawn in, in pixels. */
export interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Projection {
  x: (t: number) => number;
  y: (v: number) => number;
}

export function project(frame: Frame, domain: [number, number], scale: Scale): Projection {
  const span = domain[1] - domain[0] || 1;
  const range = scale.hi - scale.lo || 1;
  return {
    x: (t) => frame.left + ((t - domain[0]) / span) * frame.width,
    y: (v) => frame.top + (1 - (v - scale.lo) / range) * frame.height,
  };
}

/**
 * SVG path for the line. Readings further apart than `maxGapMs` are not joined, so a gap in
 * the data shows as a gap in the line. A reading with gaps on both sides cannot form a
 * segment and is returned in `loneDots` to be drawn as a dot.
 */
export function linePath(
  points: ChartPoint[],
  projection: Projection,
  maxGapMs: number
): { path: string; loneDots: ChartPoint[] } {
  let path = '';
  const loneDots: ChartPoint[] = [];
  let runLength = 0;
  points.forEach((p, i) => {
    const previous = points[i - 1];
    const startsRun = !previous || p.t - previous.t > maxGapMs;
    if (startsRun) {
      if (runLength === 1 && previous) loneDots.push(previous);
      runLength = 0;
    }
    path += `${startsRun ? 'M' : 'L'}${projection.x(p.t).toFixed(1)} ${projection.y(p.v).toFixed(1)}`;
    runLength += 1;
  });
  const last = points[points.length - 1];
  if (runLength === 1 && last && points.length > 1) loneDots.push(last);
  return { path, loneDots };
}

/** Index of the reading closest to a horizontal touch position, or -1 when there are none. */
export function nearestIndex(points: ChartPoint[], projection: Projection, touchX: number): number {
  let nearest = -1;
  let best = Infinity;
  points.forEach((p, i) => {
    const distance = Math.abs(projection.x(p.t) - touchX);
    if (distance < best) {
      best = distance;
      nearest = i;
    }
  });
  return nearest;
}

/**
 * Thins a long series for drawing by averaging readings into equal time buckets across the
 * domain. Empty buckets stay empty, so gaps in the data survive. Returns the input unchanged
 * when it already has few enough points.
 */
export function downsample(
  points: ChartPoint[],
  domain: [number, number],
  maxPoints: number
): ChartPoint[] {
  if (points.length <= maxPoints || maxPoints < 1) return points;
  const bucketMs = (domain[1] - domain[0]) / maxPoints;
  if (bucketMs <= 0) return points;
  const buckets = new Map<number, { t: number; v: number; n: number }>();
  for (const p of points) {
    const index = Math.min(maxPoints - 1, Math.max(0, Math.floor((p.t - domain[0]) / bucketMs)));
    const bucket = buckets.get(index);
    if (bucket) {
      bucket.t += p.t;
      bucket.v += p.v;
      bucket.n += 1;
    } else {
      buckets.set(index, { t: p.t, v: p.v, n: 1 });
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, b]) => ({ t: b.t / b.n, v: b.v / b.n }));
}
