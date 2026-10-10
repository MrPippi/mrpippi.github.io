/**
 * 畫面下方的物品欄（<Hotbar />）：/give 拿到的物品放進背包並畫出前 9 格。
 * 背包存在 localStorage，下次來還在；背包有東西時物品欄一直顯示，空了就隱藏。
 *
 * 操作（和遊戲一樣）：
 * - 數字鍵 1–9、滑鼠在物品欄上滾動：選格子
 * - Q 丟出一個、Ctrl+Q 丟出一整格（按住 Q 會一直丟）
 * - 點選中的格子、或在格子上按右鍵：使用物品（用一次少一個）
 * - 手機：點格子選取、再點一次使用；長按丟出，按住不放會一直丟
 */
import { langFromDocument, t } from '../i18n';
import { type GiveItem, GIVE_ITEMS, isGiveItem, stackSize } from './commands';
import {
	addItems,
	EMPTY_INVENTORY,
	HOTBAR_SIZE,
	type Inventory,
	isEmpty,
	parseInventory,
	removeItems,
} from './inventory';
import type { Point } from './item-drop';
import { throwItem } from './item-drop-anim';
import { useItem } from './item-use';

const STORAGE_KEY = 'inventory';
/** /give 之後物品還在路上時，物品欄先顯示這麼久 */
const INCOMING_MS = 6000;
const LONG_PRESS_MS = 450;
const REPEAT_MS = 150;

let selected = 0;
let incomingUntil = 0;

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

function itemName(item: string): string {
	return isGiveItem(item) ? t(langFromDocument()).commands.items[item] : item;
}

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

function render(inventory: Inventory = loadInventory()): void {
	const el = root();
	if (!el) return;
	const { inventory: dict } = t(langFromDocument());
	el.setAttribute('aria-label', dict.label);
	el.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((slot) => {
		const index = Number(slot.dataset.slot);
		const stack = inventory[index];
		slot.replaceChildren(...(stack ? slotContent(stack.item, stack.count) : []));
		slot.setAttribute('aria-label', stack ? dict.slot(itemName(stack.item), stack.count) : dict.empty);
		slot.setAttribute('aria-pressed', String(index === selected));
	});
	el.style.setProperty('--selected', String(selected));
	const visible = !isEmpty(inventory) || Date.now() < incomingUntil;
	el.classList.toggle('visible', visible);
	el.toggleAttribute('inert', !visible);
}

function setInventory(inventory: Inventory): void {
	saveInventory(inventory);
	render(inventory);
}

function showName(label: string): void {
	const name = root()?.querySelector<HTMLElement>('[data-hotbar-name]');
	if (!name) return;
	name.textContent = label;
	// 重新觸發淡出動畫
	name.classList.remove('show');
	void name.offsetWidth;
	name.classList.add('show');
}

function centerOf(el: Element | null | undefined): Point | undefined {
	const rect = el?.getBoundingClientRect();
	return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
}

const slotElement = (index: number): Element | null | undefined => root()?.querySelector(`[data-slot="${index}"]`);

/** /give 時先顯示物品欄（物品還在掉落中，背包可能還是空的） */
export function showHotbar(): void {
	incomingUntil = Date.now() + INCOMING_MS;
	render();
	window.setTimeout(() => render(), INCOMING_MS);
}

/** 這些物品會放進哪一格：回傳那一格的畫面中心（放進看不到的背包格時是物品欄中央） */
export function slotCenter(item: GiveItem, count: number): Point | undefined {
	const [first] = addItems(loadInventory(), item, count, stackSize(item)).slots;
	return centerOf(first !== undefined && first < HOTBAR_SIZE ? slotElement(first) : root()?.querySelector('.bar'));
}

/** 撿起物品：放進背包、選到那一格、顯示物品名稱 */
export function receiveItems(item: GiveItem, count: number, label: string): void {
	const result = addItems(loadInventory(), item, count, stackSize(item));
	const [first] = result.slots;
	if (first !== undefined && first < HOTBAR_SIZE) selected = first;
	// 背包有東西了，不用再特別保持顯示；之後丟光就會隱藏
	incomingUntil = 0;
	setInventory(result.inventory);
	showName(label);
}

function select(index: number): void {
	selected = ((index % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE;
	const inventory = loadInventory();
	render(inventory);
	const stack = inventory[selected];
	if (stack) showName(itemName(stack.item));
}

/** 丟出選中格子的一個（all：整格） */
function dropSelected(all: boolean): void {
	const inventory = loadInventory();
	const from = centerOf(slotElement(selected));
	const { inventory: next, removed } = removeItems(inventory, selected, all ? Infinity : 1);
	if (!removed || !isGiveItem(removed.item)) return;
	setInventory(next);
	if (from) throwItem(GIVE_ITEMS[removed.item], removed.count, from);
}

/** 使用選中格子的物品（用掉一個） */
function useSelected(): void {
	const { inventory: next, removed } = removeItems(loadInventory(), selected, 1);
	if (!removed || !isGiveItem(removed.item)) return;
	setInventory(next);
	useItem(removed.item);
}

const isVisible = (): boolean => root()?.classList.contains('visible') ?? false;

/** 正在輸入框裡打字時不攔截按鍵 */
function isTyping(event: KeyboardEvent): boolean {
	if (event.altKey || event.isComposing) return true;
	const active = document.activeElement;
	return active instanceof HTMLElement && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
}

function onKeydown(event: KeyboardEvent): void {
	if (!isVisible() || isTyping(event)) return;
	const ctrl = event.ctrlKey || event.metaKey;
	if (!ctrl && /^[1-9]$/.test(event.key)) {
		event.preventDefault();
		select(Number(event.key) - 1);
	} else if (event.key === 'q' || event.key === 'Q') {
		event.preventDefault();
		dropSelected(ctrl);
	}
}

function bindSlot(slot: HTMLButtonElement): void {
	const index = Number(slot.dataset.slot);
	let pressTimer = 0;
	let repeatTimer = 0;
	let longPressed = false;
	let pointerType = 'mouse';

	const stop = (): void => {
		window.clearTimeout(pressTimer);
		window.clearInterval(repeatTimer);
	};
	slot.addEventListener('pointerdown', (event) => {
		pointerType = event.pointerType;
		if (event.button !== 0) return;
		longPressed = false;
		stop();
		// 長按：選到這格並丟出一個，按住不放每隔一下再丟一個
		pressTimer = window.setTimeout(() => {
			longPressed = true;
			if (selected !== index) select(index);
			dropSelected(false);
			repeatTimer = window.setInterval(() => dropSelected(false), REPEAT_MS);
		}, LONG_PRESS_MS);
	});
	['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => slot.addEventListener(type, stop));
	slot.addEventListener('click', () => {
		if (longPressed) {
			longPressed = false;
			return;
		}
		if (selected === index) useSelected();
		else select(index);
	});
	// 右鍵使用；手機長按也會觸發 contextmenu，那時只擋掉選單
	slot.addEventListener('contextmenu', (event) => {
		event.preventDefault();
		if (pointerType !== 'mouse') return;
		select(index);
		useSelected();
	});
}

/** 只綁一次（物品欄在換頁時保留） */
export function initHotbar(): void {
	const el = root();
	if (!el) return;
	el.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(bindSlot);
	el.addEventListener(
		'wheel',
		(event) => {
			if (!isVisible() || event.deltaY === 0) return;
			event.preventDefault();
			select(selected + Math.sign(event.deltaY));
		},
		{ passive: false },
	);
	document.addEventListener('keydown', onKeydown);
	// 換頁（可能換語言）時更新格子的名稱
	document.addEventListener('astro:page-load', () => render());
	render();
}
