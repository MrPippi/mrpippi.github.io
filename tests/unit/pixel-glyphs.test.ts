import { describe, expect, it } from 'vitest';
import { PIXEL_GLYPHS, toRects } from '../../src/lib/pixel-glyphs';

describe('toRects', () => {
	it('同一列連續的實心格合併成一個 rect', () => {
		expect(toRects(['XX.X', '....', 'XXXX'])).toEqual([
			{ x: 0, y: 0, w: 2 },
			{ x: 3, y: 0, w: 1 },
			{ x: 0, y: 2, w: 4 },
		]);
	});

	it.each(Object.entries(PIXEL_GLYPHS))('%s 是 8×8 且至少有一格', (_, rows) => {
		expect(rows).toHaveLength(8);
		expect(rows.every((row) => row.length === 8)).toBe(true);
		expect(toRects(rows).length).toBeGreaterThan(0);
	});
});
