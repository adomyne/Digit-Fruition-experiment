/**
 * Chart series converted from the Figma chart vector (node 142:1188): path
 * points mapped onto the plot's 858px width and the gridline scale. Points
 * with x < 0 sit left of the plot, as in Figma, and are clipped.
 * x is 0..1 across the plot,
 * y is in axis units (thousands of euros on the left, percent on the right,
 * both 0..25 so they share one scale).
 */
export type Point = readonly [x: number, y: number];

export const AXIS_MAX = 25;
export const AXIS_TICKS = [0, 5, 10, 15, 20, 25];

/** Sales (€K), the upper line. */
export const sales: Point[] = [
  [-0.2521, 11.85], [-0.2168, 13.59], [-0.1908, 11.37], [-0.155, 14.43],
  [-0.141, 11.85], [-0.0888, 14.43], [-0.0684, 18.18], [-0.048, 14.43],
  [-0.0036, 10.63], [0.0217, 12.79], [0.0782, 15.57], [0.1013, 19.83],
  [0.142, 16.35], [0.142, 12.79], [0.1673, 10.63], [0.211, 12.79],
  [0.2363, 10.63], [0.28, 12.79], [0.2917, 10.63], [0.3264, 13.59],
  [0.3719, 5.21], [0.4144, 8.83], [0.4358, 12.79], [0.4806, 14.99],
  [0.5064, 12.79], [0.5512, 14.99], [0.588, 11.85], [0.6124, 16.35],
  [0.6671, 17.91], [0.6985, 20.59], [0.7367, 18.71], [0.7643, 21.07],
  [0.8078, 19.83], [0.8249, 22.98], [0.8734, 27.12], [0.8915, 23.79],
  [0.8915, 17.91], [0.9086, 21.07], [0.9384, 26.55], [0.9702, 28.12],
];

/** ACOS (%), the lower line. */
export const acos: Point[] = [
  [-0.2521, 4.49], [-0.2005, 5.43], [-0.1659, 3.07], [-0.1313, 5.43],
  [-0.0655, 6.63], [-0.0341, 4.49], [0.0059, 1.76], [0.029, 4.49],
  [0.0955, 3.27], [0.1271, 5.43], [0.1582, 1.76], [0.1981, 4.49],
  [0.2647, 3.27], [0.3047, 6.0], [0.3296, 3.07], [0.3544, 6.0],
  [0.3883, 10.01], [0.4169, 6.63], [0.4471, 3.07], [0.4611, 6.63],
  [0.5021, 3.84], [0.5257, 6.63], [0.5667, 3.84], [0.6918, 12.38],
  [0.7168, 6.0], [0.7778, 7.12], [0.8104, 3.27], [0.8429, 7.12], [0.8968, 5.0],
  [0.9257, 12.38], [0.9702, 7.12],
];

/** Where the highlight sits at rest (Dec 2). */
export const HIGHLIGHT_X = 0.6895;

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
