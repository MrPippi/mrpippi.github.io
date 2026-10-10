/**
 * 雨雪粒子（純邏輯，不碰 DOM；畫面由 precipitation-canvas.ts 每格呼叫 stepWorld 後畫出來）。
 * - 雨：每滴各自往下掉，近的大而快、遠的小而慢，落到地面時濺起原版水花（particle/splash_0~3）。
 * - 雪：一片片慢慢飄落，左右擺動。
 * - 鏡頭水滴：下雨時偶爾有雨滴打在「畫面」上，停一下、往下滑，再慢慢淡掉。
 * 所有函式都回傳新的物件，不修改傳入的狀態；隨機數由外部傳入，測試可以固定結果。
 */
import type { Weather } from './weather';

export type PrecipKind = 'rain' | 'snow';
export type Random = () => number;

export interface Size {
	readonly width: number;
	readonly height: number;
}

export interface Drop {
	readonly x: number;
	readonly y: number;
	/** 0（遠）~ 1（近）：越近越大、越快、越不透明 */
	readonly depth: number;
	/** px／秒 */
	readonly speed: number;
	/** 雨絲長度；雪花是邊長 */
	readonly length: number;
	/** 落到這個高度就濺起水花（雪則從上面重新飄下來） */
	readonly landY: number;
	/** 雪花左右擺動的相位 */
	readonly phase: number;
}

export interface Splash {
	readonly x: number;
	readonly y: number;
	readonly depth: number;
	readonly age: number;
}

export interface LensDrop {
	readonly x: number;
	readonly y: number;
	/** 水滴大小（像素格數） */
	readonly size: number;
	readonly age: number;
	readonly life: number;
	/** 往下滑的速度（px／秒），0 表示停在原地 */
	readonly slide: number;
	/** 滑過的距離，用來畫水痕 */
	readonly travelled: number;
}

export interface World {
	readonly kind: PrecipKind;
	readonly time: number;
	readonly drops: readonly Drop[];
	readonly splashes: readonly Splash[];
	readonly lens: readonly LensDrop[];
}

export const SPLASH_FRAMES = 4;
/** 水花動畫長度（秒） */
export const SPLASH_LIFE = 0.3;
/** 同時最多幾滴鏡頭水滴 */
export const MAX_LENS_DROPS = 8;

type Range = readonly [number, number];

interface KindSettings {
	/** 每平方像素幾滴 */
	readonly density: number;
	readonly maxCount: number;
	readonly speed: Range;
	readonly length: Range;
	/** 地面從畫面多高開始（0 頂端 ~ 1 底部） */
	readonly ground: number;
	/** 每秒平均幾滴打到鏡頭上 */
	readonly lensRate: number;
}

const SETTINGS: Readonly<Record<PrecipKind, KindSettings>> = {
	rain: { density: 1 / 3600, maxCount: 600, speed: [650, 1500], length: [12, 52], ground: 0.6, lensRate: 1.2 },
	snow: { density: 1 / 9000, maxCount: 240, speed: [30, 100], length: [2, 7], ground: 1, lensRate: 0 },
};

const LENS_SIZE: Range = [4, 9];
const LENS_LIFE: Range = [2.5, 5];
const LENS_SLIDE: Range = [12, 60];
/** 有多少比例的鏡頭水滴會往下滑 */
const LENS_SLIDE_CHANCE = 0.45;

const lerp = ([min, max]: Range, t: number): number => min + (max - min) * t;

export function precipKindOf(weather: Weather): PrecipKind | undefined {
	if (weather === 'rain' || weather === 'thunder') return 'rain';
	if (weather === 'snow') return 'snow';
	return undefined;
}

export function dropCount(kind: PrecipKind, size: Size): number {
	const { density, maxCount } = SETTINGS[kind];
	return Math.min(maxCount, Math.round(size.width * size.height * density));
}

/**
 * 產生一滴雨／一片雪。
 * anywhere：散在整個畫面（剛開始下時用）；否則從畫面上方外面開始掉，錯開一點高度。
 */
export function spawnDrop(kind: PrecipKind, size: Size, rand: Random, anywhere = false): Drop {
	const settings = SETTINGS[kind];
	const depth = rand() ** 2; // 遠的比近的多
	const length = lerp(settings.length, depth);
	const groundTop = size.height * settings.ground;
	// 近的落在比較下面（離鏡頭近），加一點隨機
	const landY =
		kind === 'snow' ? size.height + length : groundTop + (size.height - groundTop) * (depth * 0.7 + rand() * 0.3);
	const y = anywhere ? rand() * landY : -length - rand() * size.height * 0.25;
	return {
		x: rand() * size.width,
		y,
		depth,
		speed: lerp(settings.speed, depth) * (0.9 + rand() * 0.2),
		length,
		landY,
		phase: rand() * Math.PI * 2,
	};
}

export function spawnLensDrop(size: Size, rand: Random): LensDrop {
	const slides = rand() < LENS_SLIDE_CHANCE;
	return {
		x: rand() * size.width,
		y: rand() * size.height * 0.85,
		size: Math.round(lerp(LENS_SIZE, rand())),
		age: 0,
		life: lerp(LENS_LIFE, rand()),
		slide: slides ? lerp(LENS_SLIDE, rand()) : 0,
		travelled: 0,
	};
}

export function createWorld(kind: PrecipKind, size: Size, rand: Random): World {
	const drops = Array.from({ length: dropCount(kind, size) }, () => spawnDrop(kind, size, rand, true));
	return { kind, time: 0, drops, splashes: [], lens: [] };
}

export function splashFrame(age: number): number {
	return Math.min(SPLASH_FRAMES - 1, Math.floor((age / SPLASH_LIFE) * SPLASH_FRAMES));
}

/** 鏡頭水滴的透明度：出現時是滿的，最後 40% 的時間淡掉 */
export function lensOpacity(drop: LensDrop): number {
	const fadeStart = drop.life * 0.6;
	return drop.age <= fadeStart ? 1 : Math.max(0, 1 - (drop.age - fadeStart) / (drop.life - fadeStart));
}

/** 往前推進 dt 秒：雨雪移動、落地的換成新的、水花與鏡頭水滴老化，數量跟著畫面大小調整 */
export function stepWorld(world: World, dt: number, size: Size, rand: Random): World {
	const { kind } = world;
	const landed: Drop[] = [];
	const moved = world.drops.map((drop) => {
		const y = drop.y + drop.speed * dt;
		if (y < drop.landY) return { ...drop, y };
		landed.push(drop);
		return spawnDrop(kind, size, rand);
	});

	const target = dropCount(kind, size);
	const drops =
		moved.length >= target
			? moved.slice(0, target)
			: [...moved, ...Array.from({ length: target - moved.length }, () => spawnDrop(kind, size, rand))];

	const newSplashes: Splash[] =
		kind === 'rain' ? landed.map((drop) => ({ x: drop.x, y: drop.landY, depth: drop.depth, age: 0 })) : [];
	const splashes = [...world.splashes.map((s) => ({ ...s, age: s.age + dt })), ...newSplashes].filter(
		(s) => s.age < SPLASH_LIFE,
	);

	const aged = world.lens
		.map((drop) => {
			const distance = drop.slide * dt;
			return { ...drop, age: drop.age + dt, y: drop.y + distance, travelled: drop.travelled + distance };
		})
		.filter((drop) => drop.age < drop.life);
	const hitsLens = aged.length < MAX_LENS_DROPS && rand() < SETTINGS[kind].lensRate * dt;
	const lens = hitsLens ? [...aged, spawnLensDrop(size, rand)] : aged;

	return { kind, time: world.time + dt, drops, splashes, lens };
}
