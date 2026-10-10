/**
 * /kill 噴裝：死掉時背包清空，東西存在 sessionStorage；死亡畫面載入後把它們噴到畫面上，
 * 重生之前點一下就能撿回來，離開死亡畫面就沒了（和遊戲一樣）。
 */
import { dropStack, emptyInventory } from './hotbar';
import { ITEM_SIZE } from './item-drop';
import { parseInventory, type Stack } from './inventory';
import { isGiveItem } from './commands';

const STORAGE_KEY = 'death-drops';

/** 死掉：把背包裡的東西收起來，等死亡畫面噴出來 */
export function dieWithItems(): void {
	const stacks = emptyInventory();
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
	} catch {
		// 存不了就直接沒了
	}
}

function takeDrops(): readonly Stack[] {
	try {
		const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
		sessionStorage.removeItem(STORAGE_KEY);
		return parseInventory(raw, isGiveItem).filter((slot): slot is Stack => slot !== null);
	} catch {
		return [];
	}
}

/** 死亡畫面：從畫面中央把東西噴到下半部各處，一直留著直到被撿走或離開 */
export function spillDeathDrops(): void {
	const stacks = takeDrops();
	const width = window.innerWidth;
	const height = window.innerHeight;
	const from = { x: width / 2, y: height * 0.6 };
	stacks.forEach((stack) => {
		const land = {
			x: Math.round(width * 0.1 + Math.random() * (width * 0.8 - ITEM_SIZE)),
			y: Math.round(height * 0.72 + Math.random() * (height * 0.18 - ITEM_SIZE)),
		};
		dropStack(stack, from, { land, despawnMs: null });
	});
}
