import { describe, expect, it } from 'vitest';
import { explosionMs, planExplosion, PUFF_COUNT, PUFF_MS, shakeKeyframes } from '../../src/lib/explosion';

const viewport = { width: 1000, height: 800 };
const mid = (): number => 0.5;

describe('planExplosion', () => {
	it('預設 12 團粒子', () => {
		expect(planExplosion(viewport, mid)).toHaveLength(PUFF_COUNT);
	});

	it('粒子圍繞畫面中央，不超出散開範圍', () => {
		let i = 0;
		const sequence = [0, 1, 0.999, 0.999, 1]; // 角度 0、最遠、最大、最晚、最亮
		const [puff] = planExplosion(viewport, () => sequence[i++ % sequence.length] ?? 0, 1);
		const centerX = (puff?.x ?? 0) + (puff?.size ?? 0) / 2;
		const centerY = (puff?.y ?? 0) + (puff?.size ?? 0) / 2;
		expect(centerX).toBeCloseTo(500 + 800 * 0.25, -1);
		expect(centerY).toBeCloseTo(400, -1);
	});

	it('大小、延遲與亮度在範圍內', () => {
		for (const puff of planExplosion(viewport, Math.random, 50)) {
			expect(puff.size).toBeGreaterThanOrEqual(76);
			expect(puff.size).toBeLessThanOrEqual(180);
			expect(puff.delay).toBeLessThanOrEqual(250);
			expect(puff.brightness).toBeGreaterThanOrEqual(0.6);
			expect(puff.brightness).toBeLessThanOrEqual(1);
		}
	});
});

describe('explosionMs', () => {
	it('最晚的粒子播完才結束', () => {
		const puffs = planExplosion(viewport, mid, 3);
		expect(explosionMs(puffs)).toBe((puffs[0]?.delay ?? 0) + PUFF_MS);
		expect(explosionMs([])).toBe(PUFF_MS);
	});
});

describe('shakeKeyframes', () => {
	it('幅度越來越小，最後回到原位', () => {
		const frames = shakeKeyframes();
		expect(frames[0]?.transform).toBe('translate(12px, -6px)');
		expect(frames.at(-1)?.transform).toMatch(/^translate\(0px, -?0px\)$/);
	});
});
