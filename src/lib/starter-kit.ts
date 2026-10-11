/**
 * 新手禮包：第一次來的訪客會看到一個束口袋，點開拿到幾樣入門物品。打開過就不再出現（localStorage）。
 */
import type { GiveItem } from './commands';

export interface KitEntry {
	readonly item: GiveItem;
	readonly count: number;
}

/** 禮包內容：能帶著逛網站、看得出用法的物品 */
export const STARTER_KIT: readonly KitEntry[] = [
	{ item: 'map', count: 1 },
	{ item: 'compass', count: 1 },
	{ item: 'firework_rocket', count: 3 },
	{ item: 'cake', count: 1 },
	{ item: 'name_tag', count: 1 },
];

export const STARTER_KIT_KEY = 'starter-kit';

export function starterKitOpened(): boolean {
	try {
		return localStorage.getItem(STARTER_KIT_KEY) !== null;
	} catch {
		// 無法讀取時當作打開過，免得每頁都跳出來
		return true;
	}
}

export function markStarterKitOpened(): void {
	try {
		localStorage.setItem(STARTER_KIT_KEY, 'opened');
	} catch {
		// 無法儲存時下次還會再出現
	}
}
