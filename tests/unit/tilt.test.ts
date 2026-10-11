import { describe, expect, it } from 'vitest';
import { approach, TILT_MAX_PX, TILT_RANGE_DEG, tiltOffset } from '../../src/lib/tilt';

const flat = { beta: 40, gamma: 0 };

describe('tiltOffset', () => {
	it('姿勢沒變時不移動', () => {
		const { x, y } = tiltOffset(flat, flat);
		expect(Math.abs(x)).toBe(0);
		expect(Math.abs(y)).toBe(0);
	});

	it('往右傾天空往左移，往前傾天空往上移', () => {
		expect(tiltOffset({ beta: 40, gamma: 15 }, flat).x).toBeCloseTo(-TILT_MAX_PX / 2);
		expect(tiltOffset({ beta: 55, gamma: 0 }, flat).y).toBeCloseTo(-TILT_MAX_PX / 2);
	});

	it('超過範圍時停在最大值', () => {
		expect(tiltOffset({ beta: 40, gamma: TILT_RANGE_DEG * 3 }, flat).x).toBe(-TILT_MAX_PX);
		expect(tiltOffset({ beta: 40, gamma: -TILT_RANGE_DEG * 3 }, flat).x).toBe(TILT_MAX_PX);
	});

	it('橫拿手機時左右改看前後傾', () => {
		expect(tiltOffset({ beta: 55, gamma: 0 }, flat, 90).x).toBeCloseTo(-TILT_MAX_PX / 2);
		expect(tiltOffset({ beta: 55, gamma: 0 }, flat, 270).x).toBeCloseTo(TILT_MAX_PX / 2);
	});
});

describe('approach', () => {
	it('每次往目標靠近一部分', () => {
		expect(approach({ x: 0, y: 0 }, { x: 10, y: -10 }, 0.5)).toEqual({ x: 5, y: -5 });
	});
});
