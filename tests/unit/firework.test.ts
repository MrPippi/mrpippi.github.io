import { describe, expect, it } from 'vitest';
import { FIREWORK_COLORS, planFirework, SPARK_COUNT, sparkOpacity, sparkPath } from '../../src/lib/firework';

const viewport = { width: 1000, height: 800 };

describe('planFirework', () => {
	it('從畫面中間一帶升空，在上半部炸開', () => {
		for (const rand of [() => 0, () => 0.999]) {
			const plan = planFirework(viewport, rand);
			expect(plan.launchX).toBeGreaterThanOrEqual(250);
			expect(plan.launchX).toBeLessThanOrEqual(750);
			expect(plan.burstY).toBeGreaterThanOrEqual(160);
			expect(plan.burstY).toBeLessThanOrEqual(320);
		}
	});

	it('火花往四面八方散開，初速與壽命在範圍內，顏色是煙火色', () => {
		const plan = planFirework(viewport, Math.random);
		expect(plan.sparks).toHaveLength(SPARK_COUNT);
		for (const spark of plan.sparks) {
			const speed = Math.hypot(spark.vx, spark.vy);
			expect(speed).toBeGreaterThanOrEqual(6.29);
			expect(speed).toBeLessThanOrEqual(12.61);
			expect(spark.life).toBeGreaterThanOrEqual(30);
			expect(spark.life).toBeLessThanOrEqual(42);
			expect(Object.values(FIREWORK_COLORS)).toContain(spark.color);
		}
	});

	it('最多兩種顏色', () => {
		const colors = new Set(planFirework(viewport, Math.random).sparks.map((s) => s.color));
		expect(colors.size).toBeLessThanOrEqual(2);
	});
});

describe('sparkPath', () => {
	const spark = { vx: 10, vy: 0, life: 40, color: '#fff' };
	const path = sparkPath(spark);

	it('從爆炸點開始，每一刻一個位置', () => {
		expect(path).toHaveLength(41);
		expect(path[0]).toEqual({ x: 0, y: 0 });
		expect(path[1]).toEqual({ x: 10, y: 0 });
	});

	it('水平速度因為阻力越來越慢，最後飛不到初速的 11 倍遠', () => {
		const steps = path.slice(1).map((p, i) => p.x - (path[i]?.x ?? 0));
		steps.slice(1).forEach((step, i) => expect(step).toBeLessThan(steps[i] ?? Infinity));
		expect(path.at(-1)?.x).toBeLessThan(10 / (1 - 0.91));
	});

	it('重力讓火花畫弧線往下掉，越掉越快', () => {
		const ys = path.map((p) => p.y);
		expect(ys.at(-1)).toBeGreaterThan(0);
		expect((ys[40] ?? 0) - (ys[39] ?? 0)).toBeGreaterThan((ys[10] ?? 0) - (ys[9] ?? 0));
	});

	it('往上炸的火花先升高再落下', () => {
		const up = sparkPath({ vx: 0, vy: -10, life: 40, color: '#fff' }).map((p) => p.y);
		const top = Math.min(...up);
		expect(top).toBeLessThan(-60);
		expect(up.at(-1)).toBeGreaterThan(top);
	});
});

describe('sparkOpacity', () => {
	it('前 60% 全亮，之後淡出到 0', () => {
		expect(sparkOpacity(0, 40)).toBe(1);
		expect(sparkOpacity(24, 40)).toBe(1);
		expect(sparkOpacity(32, 40)).toBeCloseTo(0.5);
		expect(sparkOpacity(40, 40)).toBe(0);
	});
});
