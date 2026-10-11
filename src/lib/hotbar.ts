/**
 * 畫面下方的物品欄（<Hotbar />）：/give 拿到的物品放進背包並畫出前 9 格。
 * 背包存在 localStorage，下次來還在；背包有東西時物品欄一直顯示，空了就隱藏。
 *
 * 操作（和遊戲一樣）：
 * - 數字鍵 1–9、滑鼠在物品欄上滾動：選格子；滑鼠移上去顯示物品提示框
 * - Q 丟出一個、Ctrl+Q 丟出一整格（按住 Q 會一直丟）；丟在地上的物品消失前可以點回來
 * - 點選中的格子、或在格子上按右鍵：使用物品（大多用一次少一個；終界珍珠、山羊角有冷卻時間）
 * - 手機：點格子選取、再點一次使用；長按丟出，按住不放會一直丟
 */
import { langFromDocument, t } from '../i18n';
import { unlock } from './advancements';
import { printToChat } from './chat';
import { type GiveItem, GIVE_ITEMS, isGiveItem, stackSize } from './commands';
import {
	addItems,
	addStack,
	damageSlot,
	EMPTY_INVENTORY,
	enchantSlot,
	findItem,
	HOTBAR_SIZE,
	type Inventory,
	isEmpty,
	parseInventory,
	removeItems,
	type Stack,
} from './inventory';
import type { Point } from './item-drop';
import { throwItem } from './item-drop-anim';
import { refreshTooltip, showTooltipFor } from './tooltip';
import { useItem } from './item-use';
import { playerName } from './player';
import { playBreak, playLevelUp } from './sound';

const STORAGE_KEY = 'inventory';
/** /give 之後物品還在路上時，物品欄先顯示這麼久 */
const INCOMING_MS = 6000;
const LONG_PRESS_MS = 450;
const REPEAT_MS = 150;
/** 冷卻時間（和原版一樣：終界珍珠 1 秒、山羊角 7 秒） */
const COOLDOWN_MS: Partial<Record<GiveItem, number>> = { ender_pearl: 1000, goat_horn: 7000 };
/** 鑽石鎬能挖幾次 */
export const PICKAXE_DURABILITY = 8;

let selected = 0;
let incomingUntil = 0;
/** 用了附魔書、等著選要附魔的物品 */
let enchanting = false;
const cooldowns = new Map<string, { readonly start: number; readonly end: number }>();

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
const dict = () => t(langFromDocument());

function itemName(item: string): string {
	return isGiveItem(item) ? dict().commands.items[item] : item;
}

const iconOf = (item: string): string => (isGiveItem(item) ? GIVE_ITEMS[item] : '');

/** 冷卻的白色遮罩：從下往上縮，負的 animation-delay 讓重畫時接著剛才的進度 */
function cooldownOverlay(item: string): HTMLElement | undefined {
	const cooldown = cooldowns.get(item);
	const now = Date.now();
	if (!cooldown || now >= cooldown.end) return undefined;
	const overlay = document.createElement('span');
	overlay.className = 'cooldown';
	overlay.style.animationDuration = `${cooldown.end - cooldown.start}ms`;
	overlay.style.animationDelay = `${cooldown.start - now}ms`;
	return overlay;
}

/** 耐久度條：剩越少越短、從綠變紅（同原版） */
function durabilityBar(stack: Stack): HTMLElement | undefined {
	if (!stack.damage) return undefined;
	const left = Math.max(0, 1 - stack.damage / PICKAXE_DURABILITY);
	const bar = document.createElement('span');
	bar.className = 'durability';
	const fill = document.createElement('span');
	fill.style.width = `${left * 100}%`;
	fill.style.background = `hsl(${Math.round(left * 120)} 100% 50%)`;
	bar.append(fill);
	return bar;
}

function slotContent(stack: Stack): readonly HTMLElement[] {
	const img = document.createElement('img');
	img.src = iconOf(stack.item);
	img.alt = '';
	const parts: HTMLElement[] = [img];
	if (stack.enchanted) {
		// 附魔光澤只畫在物品的像素上
		const glint = document.createElement('span');
		glint.className = 'glint';
		glint.style.setProperty('--icon', `url(${iconOf(stack.item)})`);
		parts.push(glint);
	}
	const bar = durabilityBar(stack);
	if (bar) parts.push(bar);
	if (stack.count > 1) {
		const label = document.createElement('span');
		label.className = 'count mc-text';
		label.textContent = String(stack.count);
		parts.push(label);
	}
	const overlay = cooldownOverlay(stack.item);
	if (overlay) parts.push(overlay);
	return parts;
}

/** 原版物品提示框：名稱，下面是用途（灰色）、附魔、耐久度 */
function tooltipLines(stack: Stack): string {
	const { inventory } = dict();
	const lines = [
		isGiveItem(stack.item) ? `-${inventory.lore[stack.item]}` : '',
		stack.enchanted ? `+${inventory.enchantedLore}` : '',
		stack.damage ? inventory.durability(PICKAXE_DURABILITY - stack.damage, PICKAXE_DURABILITY) : '',
	];
	return lines.filter(Boolean).join('\n');
}

function renderSlot(slot: HTMLButtonElement, stack: Stack | null, index: number): void {
	const { inventory } = dict();
	slot.replaceChildren(...(stack ? slotContent(stack) : []));
	slot.setAttribute('aria-label', stack ? inventory.slot(itemName(stack.item), stack.count) : inventory.empty);
	slot.setAttribute('aria-pressed', String(index === selected));
	if (stack) {
		slot.dataset.tooltip = inventory.slot(itemName(stack.item), stack.count);
		slot.dataset.tooltipLines = tooltipLines(stack);
		if (stack.enchanted) slot.dataset.tooltipColor = 'aqua';
		else delete slot.dataset.tooltipColor;
	} else {
		delete slot.dataset.tooltip;
		delete slot.dataset.tooltipLines;
		delete slot.dataset.tooltipColor;
	}
}

function render(inventory: Inventory = loadInventory()): void {
	const el = root();
	if (!el) return;
	el.setAttribute('aria-label', dict().inventory.label);
	el.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((slot) => {
		const index = Number(slot.dataset.slot);
		renderSlot(slot, inventory[index] ?? null, index);
	});
	el.style.setProperty('--selected', String(selected));
	// 讓 CSS 知道手上拿什麼（例如拿鑽石鎬時按鈕不能捲動、不跳出長按選單）
	const held = inventory[selected]?.item;
	if (held) document.documentElement.dataset.held = held;
	else delete document.documentElement.dataset.held;
	refreshTooltip();
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

/** 放進第 slots[0] 格時的畫面位置（看不到的背包格就飛到物品欄中央） */
function targetOf(slots: readonly number[]): Point | undefined {
	const [first] = slots;
	return centerOf(first !== undefined && first < HOTBAR_SIZE ? slotElement(first) : root()?.querySelector('.bar'));
}

/** /give 時先顯示物品欄（物品還在掉落中，背包可能還是空的） */
export function showHotbar(): void {
	incomingUntil = Date.now() + INCOMING_MS;
	render();
	window.setTimeout(() => render(), INCOMING_MS);
}

/** 這些物品會放進哪一格：回傳那一格的畫面中心 */
export function slotCenter(item: GiveItem, count: number): Point | undefined {
	return targetOf(addItems(loadInventory(), item, count, stackSize(item)).slots);
}

function stackTarget(stack: Stack): Point | undefined {
	return isGiveItem(stack.item) ? targetOf(addStack(loadInventory(), stack, stackSize(stack.item)).slots) : undefined;
}

/** 放回一個堆疊（撿回丟出的物品、死亡時噴出來的物品），選到那一格 */
export function receiveStack(stack: Stack): void {
	if (!isGiveItem(stack.item)) return;
	const result = addStack(loadInventory(), stack, stackSize(stack.item));
	const [first] = result.slots;
	if (first !== undefined && first < HOTBAR_SIZE) selected = first;
	incomingUntil = 0;
	setInventory(result.inventory);
	showName(itemName(stack.item));
}

/** 撿起 /give 的物品：放進背包、選到那一格、顯示物品名稱 */
export function receiveItems(item: GiveItem, count: number, label: string): void {
	const result = addItems(loadInventory(), item, count, stackSize(item));
	const [first] = result.slots;
	if (first !== undefined && first < HOTBAR_SIZE) selected = first;
	// 背包有東西了，不用再特別保持顯示；之後丟光就會隱藏
	incomingUntil = 0;
	setInventory(result.inventory);
	showName(label);
}

/** 把一個堆疊丟到地上（從 from），可以點回來 */
export function dropStack(stack: Stack, from: Point, options: { readonly land?: Point; readonly despawnMs?: number | null } = {}): void {
	throwItem(iconOf(stack.item), stack.count, from, {
		...options,
		pickup: { target: () => stackTarget(stack), onPickup: () => receiveStack(stack) },
	});
}

/** 用了附魔書：選到的下一個物品就附魔 */
function applyEnchant(index: number): void {
	const inventory = loadInventory();
	const target = inventory[index];
	const book = findItem(inventory, 'enchanted_book');
	if (!target || target.enchanted || target.item === 'enchanted_book' || book === -1) return;
	const { inventory: dictInventory } = dict();
	const enchantment = dictInventory.enchantments[Math.floor(Math.random() * dictInventory.enchantments.length)] ?? '';
	enchanting = false;
	setInventory(removeItems(enchantSlot(inventory, index), book, 1).inventory);
	playLevelUp();
	printToChat(dictInventory.enchanted(itemName(target.item), enchantment));
	// 附魔地圖 = 藏寶圖：地圖上多一個寶藏地點，解鎖隱藏進度
	if (target.item === 'map') {
		printToChat(dictInventory.treasureFound);
		unlock('treasure-map');
	}
}

function select(index: number): void {
	selected = ((index % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE;
	if (enchanting) applyEnchant(selected);
	const inventory = loadInventory();
	render(inventory);
	const stack = inventory[selected];
	if (stack) showName(itemName(stack.item));
}

/** 丟出選中格子的一個（all：整格） */
function dropSelected(all: boolean): void {
	const from = centerOf(slotElement(selected));
	const { inventory: next, removed } = removeItems(loadInventory(), selected, all ? Infinity : 1);
	if (!removed) return;
	setInventory(next);
	if (from) dropStack(removed, from);
}

function startCooldown(item: GiveItem): void {
	const ms = COOLDOWN_MS[item];
	if (!ms) return;
	const start = Date.now();
	cooldowns.set(item, { start, end: start + ms });
	render();
	window.setTimeout(() => render(), ms);
}

const coolingDown = (item: string): boolean => Date.now() < (cooldowns.get(item)?.end ?? 0);

/** 使用選中格子的物品 */
function useSelected(): void {
	const inventory = loadInventory();
	const stack = inventory[selected];
	if (!stack || !isGiveItem(stack.item) || coolingDown(stack.item)) return;
	if (stack.item === 'enchanted_book') {
		enchanting = true;
		printToChat(dict().inventory.enchantPrompt);
		return;
	}
	const result = useItem(stack.item, centerOf(slotElement(selected)), stack.enchanted === true);
	if (result === 'consumed') setInventory(removeItems(inventory, selected, 1).inventory);
	startCooldown(stack.item);
}

/** 手上拿的東西（物品欄顯示時選中的那格） */
export function heldStack(): Stack | null {
	return isVisible() ? (loadInventory()[selected] ?? null) : null;
}

/** 手上的工具用掉一點耐久度，用完就壞掉 */
export function damageHeld(): void {
	const { inventory, broke } = damageSlot(loadInventory(), selected, 1, PICKAXE_DURABILITY);
	setInventory(inventory);
	if (!broke) return;
	playBreak();
	printToChat(dict().inventory.pickaxe(playerName()));
}

/** 用掉背包裡的一個 item（例如名牌掛上去之後） */
export function consumeItem(item: GiveItem): void {
	const inventory = loadInventory();
	const index = findItem(inventory, item);
	if (index !== -1) setInventory(removeItems(inventory, index, 1).inventory);
}

export function hasItem(item: GiveItem): boolean {
	return findItem(loadInventory(), item) !== -1;
}

/** 死掉了：背包全部清空，回傳原本的東西（死亡畫面會把它們噴出來） */
export function emptyInventory(): readonly Stack[] {
	const stacks = loadInventory().filter((slot): slot is Stack => slot !== null);
	setInventory(EMPTY_INVENTORY);
	return stacks;
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
		if (selected === index && !enchanting) {
			useSelected();
			return;
		}
		select(index);
		// 手機沒有懸停：選到格子時順便顯示物品說明
		if (pointerType === 'touch') showTooltipFor(slot);
	});
	// 右鍵使用；手機長按也會觸發 contextmenu，那時只擋掉選單
	slot.addEventListener('contextmenu', (event) => {
		event.preventDefault();
		if (pointerType !== 'mouse') return;
		if (selected !== index || enchanting) select(index);
		if (!enchanting) useSelected();
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
