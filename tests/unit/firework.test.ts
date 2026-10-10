import { describe, expect, it } from 'vitest';
import { FIREWORK_COLORS, planFirework, SPARK_COUNT } from '../../src/lib/firework';

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

	it('火花平均散開成一圈，距離在範圍內，顏色是染料色', () => {
		const plan = planFirework(viewport, Math.random);
		expect(plan.sparks).toHaveLength(SPARK_COUNT);
		for (const spark of plan.sparks) {
			const reach = Math.hypot(spark.dx, spark.dy);
			expect(reach).toBeGreaterThanOrEqual(69);
			expect(reach).toBeLessThanOrEqual(141);
			expect(Object.values(FIREWORK_COLORS)).toContain(spark.color);
		}
	});

	it('最多兩種顏色', () => {
		const colors = new Set(planFirework(viewport, Math.random).sparks.map((s) => s.color));
		expect(colors.size).toBeLessThanOrEqual(2);
	});
});
