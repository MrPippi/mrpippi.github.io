import { describe, expect, it } from 'vitest';
import { crackLayout, crackStage } from '../../src/lib/crack';

describe('crackStage', () => {
	it('依進度從 0 到 9', () => {
		expect(crackStage(0, 1000)).toBe(0);
		expect(crackStage(450, 1000)).toBe(4);
		expect(crackStage(999, 1000)).toBe(9);
		expect(crackStage(5000, 1000)).toBe(9);
	});
});

describe('crackLayout', () => {
	it('一格大約和按鈕一樣高，寬的按鈕分成好幾格', () => {
		const layout = crackLayout(350, 90, () => 0);
		expect(layout.rows).toBe(1);
		expect(layout.cols).toBe(4);
		expect(layout.orientations).toHaveLength(4);
	});

	it('小按鈕至少 32px 一格', () => {
		expect(crackLayout(200, 20, () => 0)).toMatchObject({ cols: 6, rows: 1 });
	});

	it('每格隨機 8 種方向之一', () => {
		const values = [0, 0.13, 0.26, 0.38, 0.51, 0.63, 0.76, 0.999];
		let i = 0;
		const layout = crackLayout(800, 100, () => values[i++ % values.length] ?? 0);
		expect(new Set(layout.orientations)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
	});
});
