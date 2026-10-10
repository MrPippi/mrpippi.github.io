import { describe, expect, it } from 'vitest';
import {
	createWorld,
	dropCount,
	lensOpacity,
	MAX_LENS_DROPS,
	precipKindOf,
	type Random,
	spawnDrop,
	spawnLensDrop,
	stepWorld,
	type World,
} from '../../src/lib/precipitation';

const SIZE = { width: 1200, height: 800 };

/** 固定種子的亂數（mulberry32），測試結果每次一樣 */
function seeded(seed: number): Random {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe('precipKindOf', () => {
	it.each([
		['clear', undefined],
		['rain', 'rain'],
		['thunder', 'rain'],
		['snow', 'snow'],
	] as const)('%s → %s', (weather, expected) => {
		expect(precipKindOf(weather)).toBe(expected);
	});
});

describe('dropCount', () => {
	it('依畫面面積決定數量，有上限', () => {
		expect(dropCount('rain', { width: 1000, height: 500 })).toBe(100);
		expect(dropCount('rain', { width: 10_000, height: 10_000 })).toBe(450);
		expect(dropCount('rain', { width: 0, height: 0 })).toBe(0);
	});

	it('雪比雨少', () => {
		expect(dropCount('snow', SIZE)).toBeLessThan(dropCount('rain', SIZE));
	});
});

describe('spawnDrop', () => {
	it('新的雨滴從畫面上方外面開始', () => {
		const rand = seeded(1);
		for (let i = 0; i < 200; i += 1) {
			const drop = spawnDrop('rain', SIZE, rand);
			expect(drop.y).toBeLessThan(0);
			expect(drop.x).toBeGreaterThanOrEqual(0);
			expect(drop.x).toBeLessThan(SIZE.width);
		}
	});

	it('近的雨滴比遠的快、長', () => {
		const sequence = (values: number[]): Random => {
			let i = 0;
			return () => values[i++ % values.length] ?? 0;
		};
		const far = spawnDrop('rain', SIZE, sequence([0.1, 0.5]));
		const near = spawnDrop('rain', SIZE, sequence([0.95, 0.5]));
		expect(near.depth).toBeGreaterThan(far.depth);
		expect(near.speed).toBeGreaterThan(far.speed);
		expect(near.pixel).toBeGreaterThan(far.pixel);
		expect(near.length).toBeGreaterThan(far.length);
	});

	it('雨絲長度是整數格', () => {
		const rand = seeded(20);
		for (let i = 0; i < 100; i += 1) {
			const drop = spawnDrop('rain', SIZE, rand);
			expect(drop.pixel).toBeGreaterThanOrEqual(3);
			expect(drop.pixel).toBeLessThanOrEqual(6);
			expect(Number.isInteger(drop.length / drop.pixel)).toBe(true);
			expect(drop.length / drop.pixel).toBeGreaterThanOrEqual(5);
			expect(drop.length / drop.pixel).toBeLessThanOrEqual(15);
		}
	});

});

describe('stepWorld', () => {
	it('一開始雨滴散在整個畫面上，數量依面積', () => {
		const world = createWorld('rain', SIZE, seeded(3));
		expect(world.drops).toHaveLength(dropCount('rain', SIZE));
		expect(world.drops.some((d) => d.y > SIZE.height / 2)).toBe(true);
	});

	it('雨滴往下掉，不修改原本的狀態', () => {
		const world = createWorld('rain', SIZE, seeded(4));
		const before = JSON.stringify(world);
		const next = stepWorld(world, 0.01, SIZE, seeded(5));
		expect(JSON.stringify(world)).toBe(before);
		const pairs = world.drops.map((d, i) => [d, next.drops[i]] as const).filter(([d, n]) => d.x === n?.x);
		expect(pairs.length).toBeGreaterThan(0);
		pairs.forEach(([d, n]) => expect(n?.y).toBeGreaterThan(d.y));
	});

	it.each(['rain', 'snow'] as const)('%s 一路落到畫面底部才換成新的', (kind) => {
		const drop = { x: 100, y: SIZE.height - 30, depth: 0.5, speed: 1000, length: 20, pixel: 4, fade: false, phase: 0 };
		const world: World = { ...createWorld(kind, SIZE, seeded(6)), drops: [drop] };
		const almost = stepWorld(world, 0.02, SIZE, seeded(7));
		expect(almost.drops[0]).toEqual({ ...drop, y: SIZE.height - 10 });
		const gone = stepWorld(almost, 0.02, SIZE, seeded(8));
		expect(gone.drops[0]?.y).toBeLessThan(0);
	});

	it('視窗變大時補雨滴，變小時減少', () => {
		const world = createWorld('rain', SIZE, seeded(11));
		const big = { width: 2400, height: 1600 };
		expect(stepWorld(world, 0.01, big, seeded(12)).drops).toHaveLength(dropCount('rain', big));
		const small = { width: 300, height: 300 };
		expect(stepWorld(world, 0.01, small, seeded(13)).drops).toHaveLength(dropCount('rain', small));
	});

	it('下雨時會有水滴打在鏡頭上，但有上限；下雪不會', () => {
		const rand = seeded(14);
		let rain = createWorld('rain', SIZE, rand);
		let snow = createWorld('snow', SIZE, rand);
		let most = 0;
		for (let i = 0; i < 600; i += 1) {
			rain = stepWorld(rain, 0.05, SIZE, rand);
			snow = stepWorld(snow, 0.05, SIZE, rand);
			most = Math.max(most, rain.lens.length);
		}
		expect(most).toBeGreaterThan(0);
		expect(most).toBeLessThanOrEqual(MAX_LENS_DROPS);
		expect(snow.lens).toEqual([]);
	});
});

describe('鏡頭水滴', () => {
	it('往下滑的水滴會留下滑過的距離，時間到就消失', () => {
		const drop = { ...spawnLensDrop(SIZE, seeded(15)), slide: 40, life: 1 };
		const world: World = { ...createWorld('rain', { width: 0, height: 0 }, seeded(16)), lens: [drop] };
		const moved = stepWorld(world, 0.5, { width: 0, height: 0 }, () => 0.99);
		expect(moved.lens[0]?.y).toBeCloseTo(drop.y + 20);
		expect(moved.lens[0]?.travelled).toBeCloseTo(20);
		expect(stepWorld(moved, 0.6, { width: 0, height: 0 }, () => 0.99).lens).toEqual([]);
	});

	it('透明度：前段不透明，最後慢慢淡掉', () => {
		const drop = { ...spawnLensDrop(SIZE, seeded(17)), life: 2 };
		expect(lensOpacity({ ...drop, age: 0 })).toBe(1);
		expect(lensOpacity({ ...drop, age: 1.2 })).toBe(1);
		expect(lensOpacity({ ...drop, age: 1.6 })).toBeCloseTo(0.5);
		expect(lensOpacity({ ...drop, age: 2 })).toBe(0);
	});
});
