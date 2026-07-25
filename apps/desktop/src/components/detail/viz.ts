/**
 * Chart tokens for the project detail page.
 *
 * The categorical order below is validated against this app's chart surface
 * (#0f172a, slate-900): every adjacent pair clears the colour-vision-deficiency
 * separation floor and every slot clears 3:1 contrast against the surface.
 * Slots are assigned in fixed order and never cycled — an eighth-and-beyond
 * language folds into the neutral "Other" slot instead of reusing a hue.
 */
export const SERIES = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
] as const;

export const NEUTRAL_SERIES = '#64748b';

/** Single-hue sequential ramp for the punchcard, low -> high on a dark surface. */
export const SEQUENTIAL = ['#1e293b', '#184f95', '#256abf', '#3987e5', '#5598e7', '#86b6ef'];

export const STATUS: Record<string, string> = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
  info: '#64748b',
};

export const MAX_SERIES = SERIES.length;

/**
 * Maps the project's languages to fixed colour slots. Ranking is by size within
 * this project and stays stable for the life of one analysis, so a language
 * never changes colour between the map, the bar and the legend.
 */
export function buildLanguageColors(languages: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  languages.slice(0, MAX_SERIES).forEach((language, index) => {
    colors.set(language, SERIES[index]);
  });
  return colors;
}

export function colorFor(colors: Map<string, string>, language: string | null | undefined): string {
  if (!language) return NEUTRAL_SERIES;
  return colors.get(language) ?? NEUTRAL_SERIES;
}

/** Picks the sequential step for a 0..1 intensity. */
export function sequentialStep(intensity: number): string {
  if (intensity <= 0) return SEQUENTIAL[0];
  const index = Math.min(SEQUENTIAL.length - 1, 1 + Math.floor(intensity * (SEQUENTIAL.length - 1)));
  return SEQUENTIAL[index];
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${k < 10 ? k.toFixed(1) : Math.round(k)}k`;
  }
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatPercent(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 0.1) return '<0.1%';
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatRelativeDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  const years = days / 365;
  return `${years < 10 ? years.toFixed(1) : Math.round(years)} yr ago`;
}

export function formatDuration(days: number): string {
  if (days < 60) return `${days} days`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

// ---------------------------------------------------------------------------
// Squarified treemap
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Tile<T> extends Rect {
  item: T;
}

interface Scaled<T> {
  item: T;
  area: number;
}

/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk). Lays items out so tiles
 * stay as close to square as possible, which keeps small tiles legible instead
 * of degenerating into slivers.
 */
export function squarify<T>(items: T[], value: (item: T) => number, rect: Rect): Tile<T>[] {
  const positive = items.filter((item) => value(item) > 0);
  const total = positive.reduce((sum, item) => sum + value(item), 0);
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) return [];

  const area = rect.w * rect.h;
  const queue: Scaled<T>[] = positive
    .slice()
    .sort((a, b) => value(b) - value(a))
    .map((item) => ({ item, area: (value(item) / total) * area }));

  const tiles: Tile<T>[] = [];
  let remaining: Rect = { ...rect };
  let row: Scaled<T>[] = [];

  while (queue.length > 0) {
    const side = Math.min(remaining.w, remaining.h);
    const next = queue[0];

    if (row.length === 0 || worstAspect([...row, next], side) <= worstAspect(row, side)) {
      row.push(next);
      queue.shift();
    } else {
      remaining = placeRow(row, remaining, tiles);
      row = [];
    }
  }

  if (row.length > 0) placeRow(row, remaining, tiles);

  return tiles;
}

function worstAspect<T>(row: Scaled<T>[], side: number): number {
  if (row.length === 0 || side <= 0) return Infinity;
  const sum = row.reduce((s, r) => s + r.area, 0);
  if (sum <= 0) return Infinity;
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  const side2 = side * side;
  const sum2 = sum * sum;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

function placeRow<T>(row: Scaled<T>[], rect: Rect, out: Tile<T>[]): Rect {
  const sum = row.reduce((s, r) => s + r.area, 0);
  if (sum <= 0) return rect;

  // Rows are laid along the shorter side so each strip stays compact.
  const vertical = rect.w >= rect.h;
  const thickness = vertical ? sum / rect.h : sum / rect.w;
  let offset = 0;

  for (const entry of row) {
    const length = entry.area / thickness;
    out.push(
      vertical
        ? { x: rect.x, y: rect.y + offset, w: thickness, h: length, item: entry.item }
        : { x: rect.x + offset, y: rect.y, w: length, h: thickness, item: entry.item }
    );
    offset += length;
  }

  return vertical
    ? { x: rect.x + thickness, y: rect.y, w: rect.w - thickness, h: rect.h }
    : { x: rect.x, y: rect.y + thickness, w: rect.w, h: rect.h - thickness };
}
