/**
 * Chart series traced from the Figma frame (the plot is one vector there). x is 0..1 across the plot,
 * y is in axis units (thousands of euros on the left, percent on the right,
 * both 0..25 so they share one scale).
 */
export type Point = readonly [x: number, y: number];

export const AXIS_MAX = 25;
export const AXIS_TICKS = [0, 5, 10, 15, 20, 25];

/** Sales (€K), the upper line. */
export const sales: Point[] = [
  [0, 10.5], [0.023, 12], [0.078, 15], [0.105, 19], [0.144, 15.5], [0.145, 12],
  [0.167, 10.8], [0.211, 12.5], [0.238, 10.5], [0.281, 12.2], [0.292, 10.8],
  [0.328, 13], [0.372, 5.6], [0.414, 8.6], [0.438, 12.4], [0.481, 14.5],
  [0.508, 12.3], [0.552, 14.2], [0.589, 11.2], [0.613, 15.5], [0.669, 16.7],
  [0.694, 19.3], [0.738, 17.7], [0.763, 19.7], [0.809, 18.8], [0.825, 21.5],
  [0.872, 25], [0.891, 22], [0.894, 16.7], [0.938, 25], [0.969, 26.3],
];

/** ACOS (%), the lower line. */
export const acos: Point[] = [
  [0.003, 1.5], [0.028, 4], [0.098, 3], [0.128, 5.6], [0.159, 1.4], [0.198, 4],
  [0.266, 3], [0.302, 5.5], [0.33, 2.7], [0.391, 9.3], [0.448, 2.8], [0.463, 6],
  [0.503, 3.4], [0.527, 5.8], [0.569, 3.3], [0.6875, 11], [0.719, 5.7],
  [0.777, 6.4], [0.809, 3], [0.844, 6.4], [0.898, 4.6], [0.925, 11.4],
  [0.969, 6.6],
];

/** Where the highlight sits at rest (Dec 2). */
export const HIGHLIGHT_X = 0.6875;

/** Top bar color per card, as in the frame: Sales dark orange, ACOS light. */
export const metrics = [
  { label: 'Spend', value: '€ 24,000.00', bar: null },
  { label: 'Sales', value: '€ 270,000.00', bar: 'accent' },
  { label: 'ACOS', value: '8.72%', bar: 'accent-light' },
  { label: 'Impressions', value: '21,000,00', bar: null },
] as const;

/** SVG path in a 1000 x 250 box (y flipped so 0 is the baseline). */
export function toPath(points: readonly Point[]): string {
  return points
    .map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(250 - (y / AXIS_MAX) * 250).toFixed(1)}`)
    .join(' ');
}

/** Linear interpolation of a series at x (0..1). */
export function valueAt(points: readonly Point[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return x1 === x0 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}
