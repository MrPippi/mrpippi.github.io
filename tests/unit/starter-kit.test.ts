import { afterEach, describe, expect, it, vi } from 'vitest';
import { GIVE_ITEMS } from '../../src/lib/commands';
import { markStarterKitOpened, STARTER_KIT, starterKitOpened } from '../../src/lib/starter-kit';

describe('新手禮包', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('內容都是拿得到的物品，數量在 1–64', () => {
		STARTER_KIT.forEach(({ item, count }) => {
			expect(GIVE_ITEMS[item]).toBeTruthy();
			expect(count).toBeGreaterThanOrEqual(1);
			expect(count).toBeLessThanOrEqual(64);
		});
		expect(new Set(STARTER_KIT.map((e) => e.item)).size).toBe(STARTER_KIT.length);
	});

	it('打開後記住', () => {
		const store = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		});
		expect(starterKitOpened()).toBe(false);
		markStarterKitOpened();
		expect(starterKitOpened()).toBe(true);
	});

	it('無法讀取儲存空間時當作打開過', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
		});
		expect(starterKitOpened()).toBe(true);
	});
});
