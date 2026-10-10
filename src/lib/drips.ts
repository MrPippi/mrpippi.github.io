/**
 * 按鈕上的雨珠（純邏輯，不碰 DOM；畫面由 precipitation-canvas.ts 畫在鏡頭 canvas 上）。
 * - 雨珠：雨打在按鈕上，留下一格方塊像素的水珠，過幾秒淡掉。
 * - 滴水：按鈕下緣掛著水滴，慢慢拉長，然後往下掉、越掉越快、淡掉（像原版的 dripping water 粒子）。
 * 位置都存成相對於按鈕的比例，捲動或換版面時跟著按鈕走；按鈕以 index 對應 surfaces 陣列。
 * 所有函式都回傳新的物件，不修改傳入的狀態。
 */
import type { Random } from './precipitation';

/** 看得到的按鈕傳 true，看不到的（被藏起來、捲出畫面）傳 false */
export type SurfaceVisibility = readonly boolean[];

export interface Bead {
	readonly surface: number;
	/** 在按鈕上的位置（0~1） */
	readonly fx: number;
	readonly fy: number;
	/** 邊長（px） */
	readonly size: number;
	readonly age: number;
	readonly life: number;
}

export interface Drip {
	readonly surface: number;
	readonly fx: number;
	readonly age: number;
	/** 掛在下緣多久才掉下去（秒） */
	readonly hang: number;
	/** 已經往下掉了多遠（px） */
	readonly fall: number;
	/** 往下的速度（px／秒） */
	readonly velocity: number;
}

export interface DripState {
	readonly beads: readonly Bead[];
	readonly drips: readonly Drip[];
}

type Range = readonly [number, number];

/** 每顆按鈕每秒平均多出幾顆雨珠／幾滴水 */
export const BEAD_RATE = 0.6;
export const DRIP_RATE = 0.3;
export const MAX_BEADS_PER_SURFACE = 5;
export const MAX_DRIPS_PER_SURFACE = 2;
/** 掉到這麼遠就消失（px） */
export const DRIP_FALL_DISTANCE = 90;
/** 重力加速度（px／秒²） */
const GRAVITY = 900;
const BEAD_SIZE: Range = [4, 6];
const BEAD_LIFE: Range = [2, 4.5];
const DRIP_HANG: Range = [0.6, 1.6];

const lerp = ([min, max]: Range, t: number): number => min + (max - min) * t;

export const EMPTY_DRIPS: DripState = { beads: [], drips: [] };

/** 出現時是滿的，最後 40% 的時間淡掉 */
export function fadeOut(age: number, life: number): number {
	const fadeStart = life * 0.6;
	return age <= fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / (life - fadeStart));
}

/** 掛著的水滴長度比例：0（剛冒出來）~ 1（快掉了） */
export function hangProgress(drip: Drip): number {
	return Math.min(1, drip.age / drip.hang);
}

/** 掉下去之後越遠越淡 */
export function dripOpacity(drip: Drip): number {
	return Math.max(0, 1 - drip.fall / DRIP_FALL_DISTANCE);
}

function spawnBead(surface: number, rand: Random): Bead {
	return {
		surface,
		fx: 0.05 + rand() * 0.9,
		fy: 0.12 + rand() * 0.6,
		size: Math.round(lerp(BEAD_SIZE, rand())),
		age: 0,
		life: lerp(BEAD_LIFE, rand()),
	};
}

function spawnDrip(surface: number, rand: Random): Drip {
	return { surface, fx: 0.06 + rand() * 0.88, age: 0, hang: lerp(DRIP_HANG, rand()), fall: 0, velocity: 0 };
}

function stepDrip(drip: Drip, dt: number): Drip {
	const age = drip.age + dt;
	if (age < drip.hang) return { ...drip, age };
	const velocity = drip.velocity + GRAVITY * dt;
	return { ...drip, age, velocity, fall: drip.fall + velocity * dt };
}

const countOn = (items: readonly { readonly surface: number }[], surface: number): number =>
	items.filter((item) => item.surface === surface).length;

/** 往前推進 dt 秒：雨珠老化、水滴往下掉，看得到的按鈕上隨機多出新的；看不到的按鈕上的會被清掉 */
export function stepDrips(state: DripState, dt: number, visible: SurfaceVisibility, rand: Random): DripState {
	const onScreen = (item: { readonly surface: number }): boolean => visible[item.surface] === true;
	const agedBeads = state.beads
		.filter(onScreen)
		.map((bead) => ({ ...bead, age: bead.age + dt }))
		.filter((bead) => bead.age < bead.life);
	const movedDrips = state.drips
		.filter(onScreen)
		.map((drip) => stepDrip(drip, dt))
		.filter((drip) => drip.fall < DRIP_FALL_DISTANCE);

	const surfaces = visible.flatMap((shown, index) => (shown ? [index] : []));
	const newBeads = surfaces
		.filter((s) => countOn(agedBeads, s) < MAX_BEADS_PER_SURFACE && rand() < BEAD_RATE * dt)
		.map((s) => spawnBead(s, rand));
	const newDrips = surfaces
		.filter((s) => countOn(movedDrips, s) < MAX_DRIPS_PER_SURFACE && rand() < DRIP_RATE * dt)
		.map((s) => spawnDrip(s, rand));

	return { beads: [...agedBeads, ...newBeads], drips: [...movedDrips, ...newDrips] };
}
