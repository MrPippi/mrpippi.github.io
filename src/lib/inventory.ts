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
	/** 已經用掉的耐久度（工具才有） */
	readonly damage?: number;
	/** 附魔過（顯示紫色光澤） */
	readonly enchanted?: boolean;
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

/** 沒附魔、沒用過的 item 堆疊（新拿到的可以疊上去） */
function isPlain(slot: Slot, item: string): slot is Stack {
	return slot !== null && slot.item === item && !slot.enchanted && !slot.damage;
}

/** 把 count 個 item 放進背包：先補滿同物品的堆疊，再依序放進空格 */
export function addItems(inventory: Inventory, item: string, count: number, maxStack: number): AddResult {
	let remaining = Math.max(0, Math.floor(count));
	const slots: number[] = [];
	const fill = (slot: Slot, index: number): Slot => {
		if (remaining === 0) return slot;
		const current = isPlain(slot, item) ? slot.count : slot === null ? 0 : maxStack;
		const added = Math.min(remaining, maxStack - current);
		if (added <= 0) return slot;
		remaining -= added;
		slots.push(index);
		return { item, count: current + added };
	};
	// 兩輪：第一輪只補同物品的堆疊（附魔過或用過的不疊），第二輪才用空格
	const topped = inventory.map((slot, i) => (isPlain(slot, item) ? fill(slot, i) : slot));
	const placed = topped.map((slot, i) => (slot === null ? fill(slot, i) : slot));
	return { inventory: placed, slots, leftover: remaining };
}

function isStack(value: unknown): value is Stack {
	if (typeof value !== 'object' || value === null) return false;
	const { item, count } = value as Record<string, unknown>;
	return typeof item === 'string' && typeof count === 'number' && Number.isInteger(count) && count > 0;
}

/** 只留下認得的欄位 */
function cleanStack(slot: Stack): Stack {
	const damage = typeof slot.damage === 'number' && Number.isInteger(slot.damage) && slot.damage > 0 ? slot.damage : 0;
	return {
		item: slot.item,
		count: slot.count,
		...(damage > 0 ? { damage } : {}),
		...(slot.enchanted === true ? { enchanted: true } : {}),
	};
}

/** 讀回存起來的背包；格式不對的格子當作空格 */
export function parseInventory(value: unknown, isItem: (id: string) => boolean): Inventory {
	if (!Array.isArray(value)) return EMPTY_INVENTORY;
	return EMPTY_INVENTORY.map((_, i) => {
		const slot: unknown = value[i];
		return isStack(slot) && isItem(slot.item) ? cleanStack(slot) : null;
	});
}

export interface RemoveResult {
	readonly inventory: Inventory;
	/** 拿出來的物品；那一格是空的就是 null */
	readonly removed: Stack | null;
}

/** 從第 index 格拿出最多 count 個（丟出或使用） */
export function removeItems(inventory: Inventory, index: number, count: number): RemoveResult {
	const slot = inventory[index];
	const amount = Math.min(Math.max(0, Math.floor(count)), slot?.count ?? 0);
	if (!slot || amount === 0) return { inventory, removed: null };
	const left = slot.count - amount;
	return {
		inventory: inventory.map((s, i) => (i === index ? (left > 0 ? { ...slot, count: left } : null) : s)),
		removed: { ...slot, count: amount },
	};
}

export function isEmpty(inventory: Inventory): boolean {
	return inventory.every((slot) => slot === null);
}

/** 把第 index 格換成 update 的結果（格子是空的就不變） */
function updateSlot(inventory: Inventory, index: number, update: (slot: Stack) => Slot): Inventory {
	const slot = inventory[index];
	return slot ? inventory.map((s, i) => (i === index ? update(slot) : s)) : inventory;
}

export interface DamageResult {
	readonly inventory: Inventory;
	/** 這次用完耐久度、工具壞掉了 */
	readonly broke: boolean;
}

/** 工具用掉 amount 點耐久度；用完就從格子裡消失 */
export function damageSlot(inventory: Inventory, index: number, amount: number, durability: number): DamageResult {
	const slot = inventory[index];
	if (!slot) return { inventory, broke: false };
	const damage = (slot.damage ?? 0) + amount;
	const broke = damage >= durability;
	return { inventory: updateSlot(inventory, index, (s) => (broke ? null : { ...s, damage })), broke };
}

/** 幫第 index 格的物品附魔 */
export function enchantSlot(inventory: Inventory, index: number): Inventory {
	return updateSlot(inventory, index, (s) => ({ ...s, enchanted: true }));
}

/** 背包裡第一個放著 item 的格子；沒有就是 -1 */
export function findItem(inventory: Inventory, item: string): number {
	return inventory.findIndex((slot) => slot?.item === item);
}

/** 放回一個拿出來的堆疊：附魔過或用過的放進第一個空格（保留狀態），普通的照 addItems 疊上去 */
export function addStack(inventory: Inventory, stack: Stack, maxStack: number): AddResult {
	if (!stack.enchanted && !stack.damage) return addItems(inventory, stack.item, stack.count, maxStack);
	const empty = inventory.indexOf(null);
	if (empty === -1) return { inventory, slots: [], leftover: stack.count };
	return { inventory: inventory.map((s, i) => (i === empty ? stack : s)), slots: [empty], leftover: 0 };
}
