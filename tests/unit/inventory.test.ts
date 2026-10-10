import { describe, expect, it } from 'vitest';
import { addItems, EMPTY_INVENTORY, INVENTORY_SIZE, type Inventory, parseInventory } from '../../src/lib/inventory';

const withSlots = (slots: Record<number, { item: string; count: number }>): Inventory =>
	EMPTY_INVENTORY.map((_, i) => slots[i] ?? null);

describe('addItems', () => {
	it('空背包：放進第一格', () => {
		const result = addItems(EMPTY_INVENTORY, 'cake', 1, 1);
		expect(result.inventory[0]).toEqual({ item: 'cake', count: 1 });
		expect(result.slots).toEqual([0]);
		expect(result.leftover).toBe(0);
	});

	it('先補滿同物品的堆疊，再用空格', () => {
		const start = withSlots({ 0: { item: 'map', count: 1 }, 2: { item: 'redstone', count: 60 } });
		const result = addItems(start, 'redstone', 10, 64);
		expect(result.inventory[2]).toEqual({ item: 'redstone', count: 64 });
		expect(result.inventory[1]).toEqual({ item: 'redstone', count: 6 });
		expect(result.slots).toEqual([2, 1]);
	});

	it('不能疊的物品每個佔一格', () => {
		const result = addItems(EMPTY_INVENTORY, 'cake', 3, 1);
		expect(result.inventory.slice(0, 4)).toEqual([
			{ item: 'cake', count: 1 },
			{ item: 'cake', count: 1 },
			{ item: 'cake', count: 1 },
			null,
		]);
	});

	it('背包滿了：放不下的算 leftover，原本的背包不變', () => {
		const full = EMPTY_INVENTORY.map(() => ({ item: 'cake', count: 1 }));
		const result = addItems(full, 'map', 5, 64);
		expect(result.leftover).toBe(5);
		expect(result.slots).toEqual([]);
		expect(result.inventory).toEqual(full);
		expect(full).toHaveLength(INVENTORY_SIZE);
	});

	it('不改動傳進來的背包', () => {
		const start = withSlots({ 0: { item: 'map', count: 1 } });
		const snapshot = JSON.stringify(start);
		addItems(start, 'map', 5, 64);
		expect(JSON.stringify(start)).toBe(snapshot);
	});
});

describe('parseInventory', () => {
	const isItem = (id: string): boolean => ['cake', 'map'].includes(id);

	it('格式不對、不認識的物品當作空格，長度固定 36', () => {
		const parsed = parseInventory(
			[{ item: 'cake', count: 2 }, { item: 'dirt', count: 1 }, { item: 'map', count: 0 }, 'x', null],
			isItem,
		);
		expect(parsed).toHaveLength(INVENTORY_SIZE);
		expect(parsed.slice(0, 4)).toEqual([{ item: 'cake', count: 2 }, null, null, null]);
	});

	it('不是陣列時回傳空背包', () => {
		expect(parseInventory({ a: 1 }, isItem)).toEqual(EMPTY_INVENTORY);
	});
});
