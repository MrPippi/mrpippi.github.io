import { describe, expect, it } from 'vitest';
import {
	BOUNCE_MS,
	fallKeyframes,
	fallMs,
	GROUND_OFFSET,
	ITEM_SIZE,
	pickupKeyframes,
	planDrop,
	renderedCopies,
	splitCount,
	throwKeyframes,
} from '../../src/lib/item-drop';

const viewport = { width: 1000, height: 800 };

describe('planDrop', () => {
	it('落在畫面底部、按鈕列上方', () => {
		expect(planDrop(viewport, () => 0.5).landY).toBe(800 - GROUND_OFFSET - ITEM_SIZE);
	});

	it('水平位置在畫面內，不貼邊', () => {
		const left = planDrop(viewport, () => 0).x;
		const right = planDrop(viewport, () => 0.999).x;
		expect(left).toBeGreaterThan(0);
		expect(right + ITEM_SIZE).toBeLessThan(viewport.width);
		expect(right).toBeGreaterThan(left);
	});

	it('畫面很矮時至少落在頂端', () => {
		expect(planDrop({ width: 300, height: 50 }, () => 0.5).landY).toBe(0);
	});
});

describe('fallMs', () => {
	it('自由落體：距離四倍，時間兩倍', () => {
		expect(fallMs(400)).toBeCloseTo(fallMs(100) * 2);
	});

	it('一般螢幕高度約一秒內落地', () => {
		expect(fallMs(800)).toBeGreaterThan(500);
		expect(fallMs(800)).toBeLessThan(1000);
	});
});

describe('keyframes', () => {
	const plan = planDrop(viewport, () => 0.5);

	it('從畫面上方掉下來，落地後彈一下停在地面', () => {
		const frames = fallKeyframes(plan);
		expect(frames[0]?.transform).toBe(`translate(${plan.x}px, ${-ITEM_SIZE}px)`);
		expect(frames.at(-1)?.transform).toBe(`translate(${plan.x}px, ${plan.landY}px)`);
		const land = frames[1];
		expect(land?.offset).toBeCloseTo(plan.fallMs / (plan.fallMs + BOUNCE_MS));
		expect(land?.transform).toBe(frames.at(-1)?.transform);
	});

	it('撿起來：中心飛到物品欄的格子並縮小消失', () => {
		const [from, to] = pickupKeyframes(plan, { x: 500, y: 760 });
		expect(from?.transform).toBe(`translate(${plan.x}px, ${plan.landY}px) scale(1)`);
		expect(to?.transform).toBe(`translate(${500 - ITEM_SIZE / 2}px, ${760 - ITEM_SIZE / 2}px) scale(0.3)`);
		expect(to?.opacity).toBe(0);
	});
});

describe('renderedCopies', () => {
	it.each([
		[1, 1],
		[2, 2],
		[16, 2],
		[17, 3],
		[33, 4],
		[49, 5],
		[64, 5],
	])('%i 個疊成 %i 個', (count, copies) => {
		expect(renderedCopies(count)).toBe(copies);
	});
});

describe('splitCount', () => {
	it.each([
		[1, [1]],
		[3, [1, 1, 1]],
		[8, [1, 1, 1, 1, 1, 1, 1, 1]],
		[10, [2, 2, 1, 1, 1, 1, 1, 1]],
		[64, [8, 8, 8, 8, 8, 8, 8, 8]],
		[0, []],
	])('%i 個分成 %j', (count, parts) => {
		expect(splitCount(count)).toEqual(parts);
	});

	it('總數不變', () => {
		expect(splitCount(37, 5).reduce((a, b) => a + b, 0)).toBe(37);
	});
});

describe('throwKeyframes', () => {
	it('從格子中心往上拋，最後落在指定位置', () => {
		const frames = throwKeyframes({ x: 500, y: 760 }, { x: 600, y: 650 });
		expect(frames[0]?.transform).toBe(`translate(${500 - ITEM_SIZE / 2}px, ${760 - ITEM_SIZE / 2}px)`);
		expect(frames[1]?.transform).toBe(`translate(${(476 + 600) / 2}px, 560px)`);
		expect(frames.at(-1)?.transform).toBe('translate(600px, 650px)');
	});
});
