import { describe, expect, it } from 'vitest';
import {
	createWorld,
	dropCount,
	lensOpacity,
	MAX_LENS_DROPS,
	precipKindOf,
	type Random,
	SPLASH_FRAMES,
	SPLASH_LIFE,
	spawnDrop,
	spawnLensDrop,
	splashFrame,
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
		expect(dropCount('rain', { width: 600, height: 600 })).toBe(100);
		expect(dropCount('rain', { width: 10_000, height: 10_000 })).toBe(600);
		expect(dropCount('rain', { width: 0, height: 0 })).toBe(0);
	});

	it('雪比雨少', () => {
		expect(dropCount('snow', SIZE)).toBeLessThan(dropCount('rain', SIZE));
	});
});

describe('spawnDrop', () => {
	it('新的雨滴從畫面上方外面開始，落點在地面範圍內', () => {
		const rand = seeded(1);
		for (let i = 0; i < 200; i += 1) {
			const drop = spawnDrop('rain', SIZE, rand);
			expect(drop.y).toBeLessThan(0);
			expect(drop.landY).toBeGreaterThanOrEqual(SIZE.height * 0.6);
			expect(drop.landY).toBeLessThanOrEqual(SIZE.height);
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
		expect(near.length).toBeGreaterThan(far.length);
	});

	it('雪花落到畫面底下才重來', () => {
		const flake = spawnDrop('snow', SIZE, seeded(2));
		expect(flake.landY).toBeGreaterThan(SIZE.height);
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

	it('雨滴落地時濺起水花，水花過一陣子消失', () => {
		const world: World = {
			...createWorld('rain', SIZE, seeded(6)),
			drops: [{ x: 100, y: 699, depth: 0.5, speed: 1000, length: 20, landY: 700, phase: 0 }],
		};
		const landed = stepWorld(world, 0.01, { width: 1, height: 1 }, seeded(7));
		expect(landed.splashes).toEqual([{ x: 100, y: 700, depth: 0.5, age: 0 }]);
		expect(landed.drops).toHaveLength(dropCount('rain', { width: 1, height: 1 }));
		const gone = stepWorld(landed, SPLASH_LIFE, { width: 1, height: 1 }, seeded(8));
		expect(gone.splashes).toEqual([]);
	});

	it('雪落地不會濺水花', () => {
		const world: World = {
			...createWorld('snow', SIZE, seeded(9)),
			drops: [{ x: 100, y: 899, depth: 0.5, speed: 1000, length: 4, landY: 900, phase: 0 }],
		};
		expect(stepWorld(world, 0.01, SIZE, seeded(10)).splashes).toEqual([]);
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

describe('splashFrame', () => {
	it('依時間播放 4 格水花動畫', () => {
		expect(splashFrame(0)).toBe(0);
		expect(splashFrame(SPLASH_LIFE * 0.3)).toBe(1);
		expect(splashFrame(SPLASH_LIFE * 0.99)).toBe(SPLASH_FRAMES - 1);
		expect(splashFrame(SPLASH_LIFE * 2)).toBe(SPLASH_FRAMES - 1);
	});
});
