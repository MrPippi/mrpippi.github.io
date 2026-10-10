/**
 * /give 拿到的物品：和遊戲一樣有 36 格背包，前 9 格是畫面下方的物品欄。
 * 同樣的物品會先疊到已有的堆疊（每格上限依物品而定），疊滿再放進第一個空格；放不下的就不要了。
 * 純函式，不碰 DOM；畫面在 hotbar.ts。
 */

export const HOTBAR_SIZE = 9;
export const INVENTORY_SIZE = 36;
/** 一次 /give 最多幾個 */
export const MAX_GIVE_COUNT = 64;

export interface Stack {
	readonly item: string;
	readonly count: number;
}

export type Slot = Stack | null;
export type Inventory = readonly Slot[];

export interface AddResult {
	readonly inventory: Inventory;
	/** 這次放進去的格子（依放入順序） */
	readonly slots: readonly number[];
	/** 放不下的數量 */
	readonly leftover: number;
}

export const EMPTY_INVENTORY: Inventory = Array.from({ length: INVENTORY_SIZE }, () => null);

/** 把 count 個 item 放進背包：先補滿同物品的堆疊，再依序放進空格 */
export function addItems(inventory: Inventory, item: string, count: number, maxStack: number): AddResult {
	let remaining = Math.max(0, Math.floor(count));
	const slots: number[] = [];
	const fill = (slot: Slot, index: number): Slot => {
		if (remaining === 0) return slot;
		const current = slot?.item === item ? slot.count : slot === null ? 0 : maxStack;
		const added = Math.min(remaining, maxStack - current);
		if (added <= 0) return slot;
		remaining -= added;
		slots.push(index);
		return { item, count: current + added };
	};
	// 兩輪：第一輪只補同物品的堆疊，第二輪才用空格
	const topped = inventory.map((slot, i) => (slot?.item === item ? fill(slot, i) : slot));
	const placed = topped.map((slot, i) => (slot === null ? fill(slot, i) : slot));
	return { inventory: placed, slots, leftover: remaining };
}

function isStack(value: unknown): value is Stack {
	if (typeof value !== 'object' || value === null) return false;
	const { item, count } = value as Record<string, unknown>;
	return typeof item === 'string' && typeof count === 'number' && Number.isInteger(count) && count > 0;
}

/** 讀回存起來的背包；格式不對的格子當作空格 */
export function parseInventory(value: unknown, isItem: (id: string) => boolean): Inventory {
	if (!Array.isArray(value)) return EMPTY_INVENTORY;
	return EMPTY_INVENTORY.map((_, i) => {
		const slot: unknown = value[i];
		return isStack(slot) && isItem(slot.item) ? { item: slot.item, count: slot.count } : null;
	});
}
