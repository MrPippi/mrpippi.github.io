import { describe, expect, it } from 'vitest';
import {
	addItems,
	EMPTY_INVENTORY,
	INVENTORY_SIZE,
	type Inventory,
	isEmpty,
	damageSlot,
	enchantSlot,
	findItem,
	parseInventory,
	removeItems,
} from '../../src/lib/inventory';

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

describe('removeItems', () => {
	const start = withSlots({ 0: { item: 'map', count: 5 }, 1: { item: 'cake', count: 1 } });

	it('拿出一個，剩下的留在格子裡', () => {
		const result = removeItems(start, 0, 1);
		expect(result.removed).toEqual({ item: 'map', count: 1 });
		expect(result.inventory[0]).toEqual({ item: 'map', count: 4 });
	});

	it('拿光了格子變空，最多只拿到格子裡有的數量', () => {
		const result = removeItems(start, 0, 99);
		expect(result.removed).toEqual({ item: 'map', count: 5 });
		expect(result.inventory[0]).toBeNull();
	});

	it('空格拿不到東西，背包不變', () => {
		const result = removeItems(start, 5, 1);
		expect(result.removed).toBeNull();
		expect(result.inventory).toBe(start);
	});

	it('不改動傳進來的背包', () => {
		removeItems(start, 1, 1);
		expect(start[1]).toEqual({ item: 'cake', count: 1 });
	});
});

describe('isEmpty', () => {
	it('全部空格才算空', () => {
		expect(isEmpty(EMPTY_INVENTORY)).toBe(true);
		expect(isEmpty(withSlots({ 30: { item: 'map', count: 1 } }))).toBe(false);
	});
});

describe('耐久度與附魔', () => {
	const start = withSlots({ 0: { item: 'diamond_pickaxe', count: 1 }, 1: { item: 'map', count: 3 } });

	it('工具用掉耐久度，用完就壞掉消失', () => {
		const once = damageSlot(start, 0, 1, 3);
		expect(once.inventory[0]).toEqual({ item: 'diamond_pickaxe', count: 1, damage: 1 });
		expect(once.broke).toBe(false);
		const last = damageSlot(damageSlot(once.inventory, 0, 1, 3).inventory, 0, 1, 3);
		expect(last.broke).toBe(true);
		expect(last.inventory[0]).toBeNull();
	});

	it('附魔過的堆疊不會和新拿到的疊在一起', () => {
		const enchanted = enchantSlot(start, 1);
		expect(enchanted[1]).toEqual({ item: 'map', count: 3, enchanted: true });
		const result = addItems(enchanted, 'map', 2, 64);
		expect(result.inventory[1]).toEqual({ item: 'map', count: 3, enchanted: true });
		expect(result.inventory[2]).toEqual({ item: 'map', count: 2 });
	});

	it('拿出物品時保留附魔與耐久度', () => {
		const removed = removeItems(enchantSlot(start, 1), 1, 1);
		expect(removed.removed).toEqual({ item: 'map', count: 1, enchanted: true });
		expect(removed.inventory[1]).toEqual({ item: 'map', count: 2, enchanted: true });
	});

	it('讀回存檔時保留附魔與耐久度，丟掉亂寫的欄位', () => {
		const parsed = parseInventory(
			[{ item: 'map', count: 1, damage: 2, enchanted: true, extra: 1 }, { item: 'map', count: 1, damage: -1 }],
			() => true,
		);
		expect(parsed[0]).toEqual({ item: 'map', count: 1, damage: 2, enchanted: true });
		expect(parsed[1]).toEqual({ item: 'map', count: 1 });
	});

	it('找物品所在的格子', () => {
		expect(findItem(start, 'map')).toBe(1);
		expect(findItem(start, 'cake')).toBe(-1);
	});
});
