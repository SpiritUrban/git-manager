import { describe, expect, it } from 'vitest';
import {
  buildLanguageColors,
  formatBytes,
  formatCount,
  formatPercent,
  sequentialStep,
  squarify,
  SERIES,
  SEQUENTIAL,
  type Rect,
} from '../components/detail/viz.js';

const RECT: Rect = { x: 0, y: 0, w: 400, h: 300 };

function overlaps(a: Rect, b: Rect): boolean {
  const epsilon = 0.001;
  return (
    a.x + a.w > b.x + epsilon &&
    b.x + b.w > a.x + epsilon &&
    a.y + a.h > b.y + epsilon &&
    b.y + b.h > a.y + epsilon
  );
}

describe('squarify', () => {
  const items = [50, 30, 12, 5, 2, 1].map((value, index) => ({ value, id: index }));

  it('produces one tile per positive item', () => {
    const tiles = squarify(items, (i) => i.value, RECT);
    expect(tiles).toHaveLength(items.length);
  });

  it('fills the rectangle without overlapping', () => {
    const tiles = squarify(items, (i) => i.value, RECT);

    const covered = tiles.reduce((sum, tile) => sum + tile.w * tile.h, 0);
    expect(covered).toBeCloseTo(RECT.w * RECT.h, 1);

    for (let i = 0; i < tiles.length; i += 1) {
      for (let j = i + 1; j < tiles.length; j += 1) {
        expect(overlaps(tiles[i], tiles[j])).toBe(false);
      }
    }
  });

  it('keeps every tile inside the bounds', () => {
    for (const tile of squarify(items, (i) => i.value, RECT)) {
      expect(tile.x).toBeGreaterThanOrEqual(-0.001);
      expect(tile.y).toBeGreaterThanOrEqual(-0.001);
      expect(tile.x + tile.w).toBeLessThanOrEqual(RECT.w + 0.001);
      expect(tile.y + tile.h).toBeLessThanOrEqual(RECT.h + 0.001);
    }
  });

  it('gives area in proportion to value', () => {
    const tiles = squarify(items, (i) => i.value, RECT);
    const total = items.reduce((sum, i) => sum + i.value, 0);

    for (const tile of tiles) {
      const expected = (tile.item.value / total) * RECT.w * RECT.h;
      expect(tile.w * tile.h).toBeCloseTo(expected, 1);
    }
  });

  it('drops zero and negative values instead of emitting degenerate tiles', () => {
    const tiles = squarify(
      [{ value: 10 }, { value: 0 }, { value: -4 }],
      (i) => i.value,
      RECT
    );
    expect(tiles).toHaveLength(1);
  });

  it('returns nothing for an empty or collapsed rectangle', () => {
    expect(squarify(items, (i) => i.value, { x: 0, y: 0, w: 0, h: 100 })).toEqual([]);
    expect(squarify([], (i: { value: number }) => i.value, RECT)).toEqual([]);
  });
});

describe('language colours', () => {
  it('assigns fixed slots in order and never cycles', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Lang${i}`);
    const colors = buildLanguageColors(many);

    expect(colors.size).toBe(SERIES.length);
    expect(colors.get('Lang0')).toBe(SERIES[0]);
    expect(colors.get('Lang6')).toBe(SERIES[6]);
    expect(colors.has('Lang7')).toBe(false);
    expect(new Set(colors.values()).size).toBe(SERIES.length);
  });
});

describe('sequential ramp', () => {
  it('maps zero to the empty step and one to the brightest', () => {
    expect(sequentialStep(0)).toBe(SEQUENTIAL[0]);
    expect(sequentialStep(1)).toBe(SEQUENTIAL[SEQUENTIAL.length - 1]);
  });

  it('never skips past the end of the ramp', () => {
    expect(SEQUENTIAL).toContain(sequentialStep(1.5));
  });
});

describe('formatters', () => {
  it('abbreviates counts', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(45_000)).toBe('45k');
    expect(formatCount(2_400_000)).toBe('2.4M');
  });

  it('scales bytes to a readable unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('flags shares too small to round', () => {
    expect(formatPercent(0.0002)).toBe('<0.1%');
    expect(formatPercent(0.5)).toBe('50%');
  });
});
