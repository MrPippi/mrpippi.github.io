/**
 * 把 /give 拿到的物品畫成從天而降的掉落物（位置與關鍵影格在 item-drop.ts）。
 * 一次給很多個時分成好幾個掉落物，陸續從不同位置掉下來（每個再依數量疊成 1–5 個）。
 * 物品本身一直自轉、上下浮動（global.css 的 .item-drop），落地躺一會兒後被撿起來、飛進物品欄並發出「啵」一聲。
 * 減少動態效果時不播放，直接放進物品欄。
 */
import {
	BOUNCE_MS,
	fallKeyframes,
	ITEM_SIZE,
	pickupKeyframes,
	planDrop,
	type Point,
	renderedCopies,
	splitCount,
	throwKeyframes,
	type Viewport,
} from './item-drop';
import { playPop, preloadSamples } from './sound';

/** 落地後躺多久才被撿起來 */
const LINGER_MS = 1800;
const PICKUP_MS = 220;
/** 同時最多幾個掉落物，連打指令時不會塞滿畫面 */
const MAX_ITEMS = 24;
/** 丟出去的物品飛行時間、落地後多久消失、消失的淡出時間 */
const THROW_MS = 650;
const DESPAWN_MS = 2500;
const FADE_MS = 400;
/** 丟出去的物品往左右偏多遠（px） */
const THROW_SPREAD = 120;
/** 分散的掉落物一個接一個掉下來的間隔 */
const STAGGER_MS = 120;
/** 疊在一起的掉落物各自偏移一點（px） */
const COPY_OFFSETS: readonly Point[] = [
	{ x: 0, y: 0 },
	{ x: -6, y: -4 },
	{ x: 6, y: -7 },
	{ x: -3, y: -11 },
	{ x: 4, y: -14 },
];

export interface DropOptions {
	/** 撿起 count 個時飛去的位置（畫面座標）；沒有就飛向畫面下方中央 */
	readonly target: (count: number) => Point | undefined;
	/** 撿起 count 個之後呼叫（沒播動畫時立刻用全部數量呼叫一次） */
	readonly onPickup: (count: number) => void;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function createItem(icon: string, count: number): HTMLElement {
	const item = document.createElement('div');
	item.className = 'item-drop';
	item.dataset.itemDrop = '';
	item.setAttribute('aria-hidden', 'true');
	const copies = COPY_OFFSETS.slice(0, renderedCopies(count)).map((offset) => {
		const img = document.createElement('img');
		img.src = icon;
		img.alt = '';
		img.width = ITEM_SIZE;
		img.height = ITEM_SIZE;
		img.className = 'pixelated';
		img.style.translate = `${offset.x}px ${offset.y}px`;
		return img;
	});
	item.append(...copies);
	return item;
}

async function animate(item: HTMLElement, viewport: Viewport, count: number, options: DropOptions): Promise<void> {
	const plan = planDrop(viewport, Math.random);
	await item.animate([...fallKeyframes(plan)], { duration: plan.fallMs + BOUNCE_MS, fill: 'forwards' }).finished;
	await wait(LINGER_MS);
	const target = options.target(count) ?? { x: viewport.width / 2, y: viewport.height };
	await item.animate([...pickupKeyframes(plan, target)], { duration: PICKUP_MS, easing: 'ease-in', fill: 'forwards' })
		.finished;
	if (item.isConnected) playPop();
}

function dropOne(icon: string, count: number, options: DropOptions): void {
	if (document.querySelectorAll('[data-item-drop]').length >= MAX_ITEMS) {
		options.onPickup(count);
		return;
	}
	const item = createItem(icon, count);
	document.body.append(item);
	animate(item, { width: window.innerWidth, height: window.innerHeight }, count, options)
		.catch(() => undefined) // 換頁時動畫被取消，直接移除即可
		.finally(() => {
			item.remove();
			options.onPickup(count);
		});
}

/** 掉下 count 個物品：分成最多 MAX_SCATTER 個掉落物，陸續從不同位置掉下來 */
export function dropItems(icon: string, count: number, options: DropOptions): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		options.onPickup(count);
		return;
	}
	preloadSamples(['pop']);
	splitCount(count).forEach((share, i) => {
		if (i === 0) dropOne(icon, share, options);
		else window.setTimeout(() => dropOne(icon, share, options), i * STAGGER_MS);
	});
}

export interface ThrowOptions {
	/** 落點（左上角）；沒給就往上拋、落在附近 */
	readonly land?: Point;
	/** 落地後多久消失；null 表示一直留著（死亡時噴出來的物品） */
	readonly despawnMs?: number | null;
	/** 點地上的物品可以撿回來：飛到 target（物品欄的格子）後呼叫 onPickup */
	readonly pickup?: { readonly target: () => Point | undefined; readonly onPickup: () => void };
}

function landingNear(from: Point, viewport: Viewport): Point {
	const ground = planDrop(viewport, Math.random).landY;
	const x = from.x - ITEM_SIZE / 2 + (Math.random() * 2 - 1) * THROW_SPREAD;
	return {
		x: Math.min(Math.max(0, x), viewport.width - ITEM_SIZE),
		// 物品欄在地面附近，落點至少要在它上面
		y: Math.min(ground, from.y - ITEM_SIZE * 1.5),
	};
}

/** 等到被點（回傳 true）或時間到（回傳 false）；ms 為 null 時一直等 */
function clickedOrTimeout(item: HTMLElement, ms: number | null, clickable: boolean): Promise<boolean> {
	return new Promise((resolve) => {
		const timer = ms === null ? undefined : window.setTimeout(() => resolve(false), ms);
		if (!clickable) return;
		item.classList.add('pickable');
		item.addEventListener(
			'click',
			() => {
				window.clearTimeout(timer);
				resolve(true);
			},
			{ once: true },
		);
	});
}

/** 從物品欄丟出物品（中心在 from）：往上拋、落地，躺一會兒後消失；可以點一下撿回來 */
export function throwItem(icon: string, count: number, from: Point, options: ThrowOptions = {}): void {
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const despawnMs = options.despawnMs === undefined ? DESPAWN_MS : options.despawnMs;
	if (reduced && !options.pickup) return;
	const viewport = { width: window.innerWidth, height: window.innerHeight };
	const land = options.land ?? landingNear(from, viewport);
	const item = createItem(icon, count);
	// 丟出去的不算「等著被撿」的掉落物
	delete item.dataset.itemDrop;
	item.dataset.itemThrown = '';
	item.style.transform = `translate(${land.x}px, ${land.y}px)`;
	document.body.append(item);
	const lie = { x: land.x, landY: land.y, fallMs: 0 };
	const fly = async (): Promise<void> => {
		if (!reduced) await item.animate([...throwKeyframes(from, land)], { duration: THROW_MS, fill: 'forwards' }).finished;
		const picked = await clickedOrTimeout(item, despawnMs, options.pickup !== undefined);
		if (picked && options.pickup) {
			const target = options.pickup.target() ?? { x: viewport.width / 2, y: viewport.height };
			if (!reduced) {
				await item.animate([...pickupKeyframes(lie, target)], { duration: PICKUP_MS, easing: 'ease-in', fill: 'forwards' })
					.finished;
			}
			playPop();
			options.pickup.onPickup();
			return;
		}
		if (!reduced) await item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' }).finished;
	};
	fly()
		.catch(() => undefined)
		.finally(() => item.remove());
}
