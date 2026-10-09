import { describe, expect, it } from 'vitest';
import { randomTrack } from '../../src/lib/music';

const RUNS = 5000;

describe('randomTrack', () => {
	it('第一首（不排除）可能是任何一首', () => {
		const seen = new Set(Array.from({ length: RUNS }, () => randomTrack(-1, 6)));
		expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it.each([0, 3, 5])('剛播完第 %i 首時不會重複，其餘每首都可能', (exclude) => {
		const picks = Array.from({ length: RUNS }, () => randomTrack(exclude, 6));
		expect(picks).not.toContain(exclude);
		expect(new Set(picks).size).toBe(5);
		expect(picks.every((p) => p >= 0 && p < 6)).toBe(true);
	});

	it('只有一首時永遠回傳 0', () => {
		expect(randomTrack(0, 1)).toBe(0);
		expect(randomTrack(-1, 1)).toBe(0);
	});
});
