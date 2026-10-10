import { describe, expect, it } from 'vitest';
import { bottleXp, orbIcon, splitOrbs } from '../../src/lib/xp';

describe('經驗瓶', () => {
	it('一瓶 3 到 11 點', () => {
		expect(bottleXp(() => 0)).toBe(3);
		expect(bottleXp(() => 0.999)).toBe(11);
	});

	it('拆成原版面額的經驗球，總數不變', () => {
		expect(splitOrbs(11)).toEqual([7, 3, 1]);
		expect(splitOrbs(3)).toEqual([3]);
		expect(splitOrbs(0)).toEqual([]);
		expect(splitOrbs(40).reduce((a, b) => a + b, 0)).toBe(40);
	});

	it('面額越大圖示越大', () => {
		expect(orbIcon(1)).toBe(0);
		expect(orbIcon(3)).toBe(1);
		expect(orbIcon(7)).toBe(2);
		expect(orbIcon(17)).toBe(3);
		expect(orbIcon(2477)).toBe(10);
	});
});
