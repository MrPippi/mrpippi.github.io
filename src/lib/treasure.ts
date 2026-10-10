/**
 * 埋藏的寶藏（/treasure/）：寶箱裡的戰利品，每樣只能拿一次（記在 localStorage）。
 */
import type { GiveItem } from './commands';

export interface Loot {
	/** 寶箱 9×3 格裡的第幾格 */
	readonly slot: number;
	readonly item: GiveItem;
	readonly count: number;
}

export const CHEST_SLOTS = 27;

export const TREASURE_LOOT: readonly Loot[] = [
	{ slot: 1, item: 'diamond', count: 3 },
	{ slot: 5, item: 'gold_ingot', count: 7 },
	{ slot: 10, item: 'enchanted_book', count: 1 },
	{ slot: 13, item: 'heart_of_the_sea', count: 1 },
	{ slot: 16, item: 'experience_bottle', count: 5 },
	{ slot: 21, item: 'totem_of_undying', count: 1 },
	{ slot: 25, item: 'firework_rocket', count: 3 },
];

const STORAGE_KEY = 'treasure-looted';

export function lootedSlots(): readonly number[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((v): v is number => Number.isInteger(v)) : [];
	} catch {
		return [];
	}
}

export function markLooted(slot: number): void {
	const looted = lootedSlots();
	if (looted.includes(slot)) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...looted, slot]));
	} catch {
		// 存不了就只在這次有效
	}
}

/** 還沒被拿走的戰利品 */
export function remainingLoot(looted: readonly number[]): readonly Loot[] {
	return TREASURE_LOOT.filter((loot) => !looted.includes(loot.slot));
}
