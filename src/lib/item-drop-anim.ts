/**
 * 把 /give 拿到的物品畫成從天而降的掉落物（位置與關鍵影格在 item-drop.ts）。
 * 物品本身一直自轉、上下浮動（global.css 的 .item-drop），落地躺一會兒後被撿起來並發出「啵」一聲。
 * 減少動態效果時不播放。
 */
import { BOUNCE_MS, fallKeyframes, ITEM_SIZE, pickupKeyframes, planDrop, type Viewport } from './item-drop';
import { playPop, preloadSamples } from './sound';

/** 落地後躺多久才被撿起來 */
const LINGER_MS = 1800;
const PICKUP_MS = 180;
/** 同時最多幾個掉落物，連打指令時不會塞滿畫面 */
const MAX_ITEMS = 8;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function createItem(icon: string): HTMLElement {
	const item = document.createElement('div');
	item.className = 'item-drop';
	item.dataset.itemDrop = '';
	item.setAttribute('aria-hidden', 'true');
	const img = document.createElement('img');
	img.src = icon;
	img.alt = '';
	img.width = ITEM_SIZE;
	img.height = ITEM_SIZE;
	img.className = 'pixelated';
	item.append(img);
	return item;
}

async function animate(item: HTMLElement, viewport: Viewport): Promise<void> {
	const plan = planDrop(viewport, Math.random);
	await item.animate([...fallKeyframes(plan)], { duration: plan.fallMs + BOUNCE_MS, fill: 'forwards' }).finished;
	await wait(LINGER_MS);
	await item.animate([...pickupKeyframes(plan, viewport)], { duration: PICKUP_MS, easing: 'ease-in', fill: 'forwards' })
		.finished;
	if (item.isConnected) playPop();
}

export function dropItem(icon: string): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (document.querySelectorAll('[data-item-drop]').length >= MAX_ITEMS) return;
	const item = createItem(icon);
	document.body.append(item);
	preloadSamples(['pop']);
	animate(item, { width: window.innerWidth, height: window.innerHeight })
		.catch(() => undefined) // 換頁時動畫被取消，直接移除即可
		.finally(() => item.remove());
}
