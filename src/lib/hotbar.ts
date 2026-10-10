/**
 * 畫面下方的物品欄（<Hotbar />）：/give 拿到的物品放進背包並畫出前 9 格。
 * 背包存在 localStorage，下次來還在。物品欄平常隱藏，用到時出現、閒置 IDLE_MS 後淡出。
 */
import { type GiveItem, GIVE_ITEMS, isGiveItem, stackSize } from './commands';
import { addItems, EMPTY_INVENTORY, HOTBAR_SIZE, type Inventory, parseInventory } from './inventory';
import type { Point } from './item-drop';

const STORAGE_KEY = 'inventory';
const IDLE_MS = 5000;

let hideTimer = 0;
let selected = 0;

export function loadInventory(): Inventory {
	try {
		return parseInventory(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'), isGiveItem);
	} catch {
		return EMPTY_INVENTORY;
	}
}

function saveInventory(inventory: Inventory): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
	} catch {
		// 無法儲存時只在這次瀏覽有效
	}
}

const root = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-hotbar]');

function slotContent(item: string, count: number): readonly HTMLElement[] {
	const img = document.createElement('img');
	img.src = isGiveItem(item) ? GIVE_ITEMS[item] : '';
	img.alt = '';
	if (count <= 1) return [img];
	const label = document.createElement('span');
	label.className = 'count mc-text';
	label.textContent = String(count);
	return [img, label];
}

function render(el: HTMLElement, inventory: Inventory): void {
	el.querySelectorAll<HTMLElement>('[data-slot]').forEach((slot) => {
		const stack = inventory[Number(slot.dataset.slot)];
		slot.replaceChildren(...(stack ? slotContent(stack.item, stack.count) : []));
	});
	el.style.setProperty('--selected', String(selected));
}

/** 顯示物品欄（重新計時，閒置後淡出） */
export function showHotbar(): void {
	const el = root();
	if (!el) return;
	render(el, loadInventory());
	el.classList.add('visible');
	window.clearTimeout(hideTimer);
	hideTimer = window.setTimeout(() => el.classList.remove('visible'), IDLE_MS);
}

/** 這些物品會放進哪一格：回傳那一格的畫面中心（放進背包裡看不到的格子時是物品欄中央） */
export function slotCenter(item: GiveItem, count: number): Point | undefined {
	const el = root();
	if (!el) return undefined;
	const [first] = addItems(loadInventory(), item, count, stackSize(item)).slots;
	const target =
		first !== undefined && first < HOTBAR_SIZE ? el.querySelector(`[data-slot="${first}"]`) : el.querySelector('.bar');
	const rect = target?.getBoundingClientRect();
	return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
}

function showName(el: HTMLElement, label: string): void {
	const name = el.querySelector<HTMLElement>('[data-hotbar-name]');
	if (!name) return;
	name.textContent = label;
	// 重新觸發淡出動畫
	name.classList.remove('show');
	void name.offsetWidth;
	name.classList.add('show');
}

/** 撿起物品：放進背包、選到那一格、顯示物品名稱 */
export function receiveItems(item: GiveItem, count: number, label: string): void {
	const result = addItems(loadInventory(), item, count, stackSize(item));
	saveInventory(result.inventory);
	const [first] = result.slots;
	if (first !== undefined && first < HOTBAR_SIZE) selected = first;
	const el = root();
	if (!el) return;
	showHotbar();
	showName(el, label);
}
