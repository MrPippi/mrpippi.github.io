import { describe, expect, it } from 'vitest';
import {
	type Drip,
	DRIP_FALL_DISTANCE,
	dripOpacity,
	EMPTY_DRIPS,
	fadeOut,
	hangProgress,
	MAX_BEADS_PER_SURFACE,
	MAX_DRIPS_PER_SURFACE,
	stepDrips,
} from '../../src/lib/drips';

/** 每次都「中」的亂數：0 一定小於機率 */
const always = (): number => 0;
const never = (): number => 0.999;

const drip = (overrides: Partial<Drip> = {}): Drip => ({
	surface: 0,
	fx: 0.5,
	age: 0,
	hang: 1,
	fall: 0,
	velocity: 0,
	...overrides,
});

describe('stepDrips', () => {
	it('只在看得到的按鈕上長出雨珠和水滴', () => {
		const next = stepDrips(EMPTY_DRIPS, 0.1, [true, false, true], always);
		expect(next.beads.map((b) => b.surface)).toEqual([0, 2]);
		expect(next.drips.map((d) => d.surface)).toEqual([0, 2]);
	});

	it('機率沒中就不長', () => {
		expect(stepDrips(EMPTY_DRIPS, 0.1, [true, true], never)).toEqual(EMPTY_DRIPS);
	});

	it('每顆按鈕有上限', () => {
		let state = EMPTY_DRIPS;
		for (let i = 0; i < 50; i += 1) state = stepDrips(state, 0.01, [true], always);
		expect(state.beads.length).toBeLessThanOrEqual(MAX_BEADS_PER_SURFACE);
		expect(state.drips.length).toBeLessThanOrEqual(MAX_DRIPS_PER_SURFACE);
	});

	it('按鈕看不到（捲出畫面、換頁）時清掉上面的雨珠', () => {
		const state = stepDrips(EMPTY_DRIPS, 0.1, [true], always);
		expect(stepDrips(state, 0.1, [false], never)).toEqual(EMPTY_DRIPS);
	});

	it('水滴先掛著，時間到才往下掉、越掉越快，掉夠遠就消失', () => {
		const state = { beads: [], drips: [drip({ hang: 1 })] };
		const hanging = stepDrips(state, 0.5, [true], never);
		expect(hanging.drips[0]?.fall).toBe(0);

		const falling = stepDrips(stepDrips(hanging, 0.49, [true], never), 0.05, [true], never);
		const first = falling.drips[0]?.fall ?? 0;
		expect(first).toBeGreaterThan(0);
		const faster = stepDrips(falling, 0.05, [true], never);
		expect((faster.drips[0]?.fall ?? 0) - first).toBeGreaterThan(first);

		let gone = faster;
		for (let i = 0; i < 40; i += 1) gone = stepDrips(gone, 0.05, [true], never);
		expect(gone.drips).toEqual([]);
	});

	it('雨珠時間到就消失', () => {
		const state = stepDrips(EMPTY_DRIPS, 0.01, [true], always);
		const life = state.beads[0]?.life ?? 0;
		// 機率很大時同一步會長出新的，所以只看原本那顆（age 會超過 life）還在不在
		expect(stepDrips(state, life, [true], never).beads.every((b) => b.age === 0)).toBe(true);
	});

	it('不修改傳入的狀態', () => {
		const state = { beads: [], drips: [drip()] };
		const before = JSON.stringify(state);
		stepDrips(state, 2, [true], always);
		expect(JSON.stringify(state)).toBe(before);
	});
});

describe('外觀', () => {
	it('掛著的水滴慢慢拉長', () => {
		expect(hangProgress(drip({ age: 0 }))).toBe(0);
		expect(hangProgress(drip({ age: 0.5 }))).toBe(0.5);
		expect(hangProgress(drip({ age: 3 }))).toBe(1);
	});

	it('掉越遠越淡', () => {
		expect(dripOpacity(drip({ fall: 0 }))).toBe(1);
		expect(dripOpacity(drip({ fall: DRIP_FALL_DISTANCE / 2 }))).toBeCloseTo(0.5);
		expect(dripOpacity(drip({ fall: DRIP_FALL_DISTANCE * 2 }))).toBe(0);
	});

	it('雨珠前段不透明，最後淡掉', () => {
		expect(fadeOut(0, 2)).toBe(1);
		expect(fadeOut(1.6, 2)).toBeCloseTo(0.5);
		expect(fadeOut(2, 2)).toBe(0);
	});
});
