/**
 * 把 /give 拿到的物品畫成從天而降的掉落物（位置與關鍵影格在 item-drop.ts）。
 * 物品本身一直自轉、上下浮動（global.css 的 .item-drop），數量多時疊成好幾個；
 * 落地躺一會兒後被撿起來、飛進物品欄並發出「啵」一聲。
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
	type Viewport,
} from './item-drop';
import { playPop, preloadSamples } from './sound';

/** 落地後躺多久才被撿起來 */
const LINGER_MS = 1800;
const PICKUP_MS = 220;
/** 同時最多幾個掉落物，連打指令時不會塞滿畫面 */
const MAX_ITEMS = 8;
/** 疊在一起的掉落物各自偏移一點（px） */
const COPY_OFFSETS: readonly Point[] = [
	{ x: 0, y: 0 },
	{ x: -6, y: -4 },
	{ x: 6, y: -7 },
	{ x: -3, y: -11 },
	{ x: 4, y: -14 },
];

export interface DropOptions {
	readonly count: number;
	/** 撿起時飛去的位置（畫面座標）；沒有就飛向畫面下方中央 */
	readonly target: () => Point | undefined;
	/** 撿起來之後（或沒播動畫時立刻）呼叫一次 */
	readonly onPickup: () => void;
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

async function animate(item: HTMLElement, viewport: Viewport, options: DropOptions): Promise<void> {
	const plan = planDrop(viewport, Math.random);
	await item.animate([...fallKeyframes(plan)], { duration: plan.fallMs + BOUNCE_MS, fill: 'forwards' }).finished;
	await wait(LINGER_MS);
	const target = options.target() ?? { x: viewport.width / 2, y: viewport.height };
	await item.animate([...pickupKeyframes(plan, target)], { duration: PICKUP_MS, easing: 'ease-in', fill: 'forwards' })
		.finished;
	if (item.isConnected) playPop();
}

export function dropItem(icon: string, options: DropOptions): void {
	const skip =
		window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
		document.querySelectorAll('[data-item-drop]').length >= MAX_ITEMS;
	if (skip) {
		options.onPickup();
		return;
	}
	const item = createItem(icon, options.count);
	document.body.append(item);
	preloadSamples(['pop']);
	animate(item, { width: window.innerWidth, height: window.innerHeight }, options)
		.catch(() => undefined) // 換頁時動畫被取消，直接移除即可
		.finally(() => {
			item.remove();
			options.onPickup();
		});
}
