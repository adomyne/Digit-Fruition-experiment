/**
 * The hero chart's data and helpers, shared by the markup (Section.astro)
 * and its script. The numbers live in heroChart.json: one row per day, in
 * date order. Swap that file for real data; nothing else needs to change.
 * The dummy rows were traced from the Figma chart vector (node 142:1189),
 * one row per day from Oct 15 to Dec 29 (see notes.md).
 */
import data from './heroChart.json';

export type Series = 'sales' | 'acos';
export type MetricKey = 'spend' | 'sales' | 'acos' | 'impressions';
export type Day = Record<MetricKey, number> & { date: string };

export const days: Day[] = data.days;
export const axis = data.axis;
export const currency = data.currency;
export const LAST = days.length - 1;
/** The day the guide rests on: defaultDate, or the last day if it isn't in the data. */
const found = days.findIndex((d) => d.date === data.defaultDate);
export const defaultIndex = found >= 0 ? found : LAST;

/** Position of day i across the plot, 0 to 1. */
export const xOf = (i: number) => (LAST > 0 ? i / LAST : 0.5);
/** The day nearest to x (0 to 1). */
export const dayAt = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * LAST);

/** A value's height on its own axis: 0 is the baseline, 1 the top gridline.
 *  Values above the axis maximum go past 1 and are clipped by the plot. */
export const level = (s: Series, v: number) => v / (s === 'sales' ? axis.salesMax : axis.acosMax);

/** A series' value at x, straight between days (for the dot while it slides). */
export function valueAt(s: Series, x: number): number {
  if (LAST < 1) return days[0][s];
  const p = Math.min(1, Math.max(0, x)) * LAST;
  const i = Math.min(LAST - 1, Math.floor(p));
  return days[i][s] + (days[i + 1][s] - days[i][s]) * (p - i);
}

/** SVG path of a series in a 1000 x 250 box (the top gridline is y 0). */
export const linePath = (s: Series) =>
  days.map((d, i) => `${i ? 'L' : 'M'}${(xOf(i) * 1000).toFixed(1)} ${(250 - level(s, d[s]) * 250).toFixed(1)}`).join(' ');

/** Axis labels from the top gridline down to 0. */
export function ticks(max: number): number[] {
  return Array.from({ length: axis.steps + 1 }, (_, i) => Math.round((max - (max / axis.steps) * i) * 100) / 100);
}
export const salesTick = (v: number) => `${currency}${v ? `${v / 1000}K` : 0}`;
export const acosTick = (v: number) => `${v}%`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2025-12-02" -> "Dec 02", as in the Figma frame. */
export const formatDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(8, 10)}`;

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export interface Metric {
  key: MetricKey;
  label: string;
  /** Set for the two metrics that have a line; their cards toggle focus mode. */
  series?: Series;
  format: (v: number) => string;
}

/** The four cards above the chart, in order. */
export const METRICS: Metric[] = [
  { key: 'spend', label: 'Spend', format: (v) => `${currency} ${money.format(v)}` },
  { key: 'sales', label: 'Sales', series: 'sales', format: (v) => `${currency} ${money.format(v)}` },
  { key: 'acos', label: 'ACOS', series: 'acos', format: (v) => `${money.format(v)}%` },
  { key: 'impressions', label: 'Impressions', format: (v) => whole.format(v) },
];
