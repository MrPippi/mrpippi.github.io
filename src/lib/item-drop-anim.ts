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
	type Viewport,
} from './item-drop';
import { playPop, preloadSamples } from './sound';

/** 落地後躺多久才被撿起來 */
const LINGER_MS = 1800;
const PICKUP_MS = 220;
/** 同時最多幾個掉落物，連打指令時不會塞滿畫面 */
const MAX_ITEMS = 24;
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
