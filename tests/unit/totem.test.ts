import { describe, expect, it } from 'vitest';
import { sparkPath } from '../../src/lib/firework';
import { TOTEM_TICKS, totemColor, totemFrame, totemFrames, totemSpark } from '../../src/lib/totem';

const viewport = { width: 1000, height: 800 };

describe('totemFrame', () => {
	it('一開始和結束都是小的、在中央，中間放大', () => {
		const frames = totemFrames(1, 1, viewport);
		expect(frames).toHaveLength(TOTEM_TICKS + 1);
		expect(frames[0]?.size).toBeCloseTo(60);
		expect(frames.at(-1)?.size).toBeCloseTo(60, 0);
		expect(Math.max(...frames.map((f) => f.size))).toBeGreaterThan(250);
		expect(frames[0]?.x).toBeCloseTo(0);
	});

	it('轉好幾圈，往偏移方向晃', () => {
		const frames = totemFrames(1, -1, viewport);
		expect(Math.max(...frames.map((f) => f.rotateY))).toBeGreaterThan(800);
		expect(Math.max(...frames.map((f) => f.x))).toBeGreaterThan(0);
		expect(Math.min(...frames.map((f) => f.y))).toBeLessThan(0);
	});

	it('沒有偏移時一直在中央', () => {
		expect(totemFrame(20, 0, 0, viewport)).toMatchObject({ x: 0, y: 0 });
	});
});

describe('圖騰粒子', () => {
	it('顏色是綠色或黃色', () => {
		for (let i = 0; i < 50; i++) {
			const [r, g, b] = (totemColor(Math.random).match(/[0-9a-f]{2}/g) ?? []).map((h) => parseInt(h, 16));
			expect(g).toBeGreaterThan(b ?? 0);
			expect(g).toBeGreaterThanOrEqual((r ?? 0) - 1);
		}
	});

	it('噴出去很快停下，之後往上飄', () => {
		const path = sparkPath(totemSpark(() => 0.5));
		const step = (i: number) => Math.hypot((path[i + 1]?.x ?? 0) - (path[i]?.x ?? 0), (path[i + 1]?.y ?? 0) - (path[i]?.y ?? 0));
		expect(step(0)).toBeGreaterThan(step(5) * 10);
		expect((path.at(-1)?.y ?? 0) < (path[10]?.y ?? 0)).toBe(true);
	});
});
