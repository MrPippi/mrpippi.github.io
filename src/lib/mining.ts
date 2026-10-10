/**
 * 鑽石鎬挖按鈕：選到鑽石鎬時，對選單按鈕（標題畫面的大按鈕、石頭按鈕）按住不放，
 * 會出現原版的方塊裂痕（destroy_stage_0–9），挖完按鈕碎掉、噴出碎屑，鎬子少一點耐久度。
 * 碎掉的按鈕在換頁或重新整理後回來。附魔過的鎬子挖得比較快（效率）。
 */
import { type Spark, sparkOpacity, sparkPath, TICK_MS } from './firework';
import { damageHeld, heldStack } from './hotbar';
import { playDig, playHit } from './sound';

const TARGETS = '.banner, .mc-btn';
const MINE_MS = 1200;
const ENCHANTED_MINE_MS = 600;
const CRACK_STAGES = 10;
/** 按住超過這麼久才算在挖（短按還是一般的點擊） */
const HOLD_MS = 150;
const DEBRIS_COUNT = 18;
const DEBRIS_COLOR = '#7a7a7a';

/** 挖了 elapsed 毫秒時的裂痕階段（0–9） */
export function crackStage(elapsed: number, total: number): number {
	return Math.min(CRACK_STAGES - 1, Math.max(0, Math.floor((elapsed / total) * CRACK_STAGES)));
}

function holdingPickaxe(): { readonly enchanted: boolean } | undefined {
	const held = heldStack();
	return held?.item === 'diamond_pickaxe' ? { enchanted: held.enchanted === true } : undefined;
}

/** 方塊的顏色：按鈕的背景色，透明時用石頭灰 */
function blockColor(target: HTMLElement): string {
	const color = getComputedStyle(target).backgroundColor;
	return color && color !== 'transparent' && !color.endsWith(', 0)') ? color : DEBRIS_COLOR;
}

/** 碎掉時噴出碎屑：從按鈕各處往外噴、往下掉 */
function shatter(target: HTMLElement): void {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const rect = target.getBoundingClientRect();
	const color = blockColor(target);
	const layer = document.createElement('div');
	layer.className = 'debris-layer';
	layer.setAttribute('aria-hidden', 'true');
	const pieces = Array.from({ length: DEBRIS_COUNT }, () => {
		const el = document.createElement('span');
		el.className = 'debris';
		el.style.left = `${rect.left + Math.random() * rect.width}px`;
		el.style.top = `${rect.top + Math.random() * rect.height}px`;
		el.style.background = Math.random() < 0.5 ? color : DEBRIS_COLOR;
		const angle = Math.random() * Math.PI * 2;
		const spark: Spark = { vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3 - 3, life: 20, color };
		el.animate(
			sparkPath(spark).map((p, tick) => ({
				transform: `translate(${p.x.toFixed(1)}px, ${(p.y * 1.5).toFixed(1)}px)`,
				opacity: sparkOpacity(tick, spark.life),
				offset: tick / spark.life,
			})),
			{ duration: spark.life * TICK_MS, fill: 'forwards' },
		);
		return el;
	});
	layer.append(...pieces);
	document.body.append(layer);
	window.setTimeout(() => layer.remove(), 20 * TICK_MS);
}

function startMining(target: HTMLElement, total: number): void {
	const crack = document.createElement('span');
	crack.className = 'crack';
	crack.setAttribute('aria-hidden', 'true');
	target.append(crack);
	const started = performance.now();
	let frame = 0;
	let lastStage = -1;
	let suppressClick = false;

	const cleanup = (): void => {
		cancelAnimationFrame(frame);
		crack.remove();
		['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => target.removeEventListener(type, cancel));
	};
	const cancel = (): void => cleanup();
	// 挖了一陣子才放開，不要當成點按鈕
	target.addEventListener(
		'click',
		(event) => {
			if (!suppressClick) return;
			event.preventDefault();
			event.stopImmediatePropagation();
		},
		{ capture: true, once: true },
	);
	const tick = (now: number): void => {
		const elapsed = now - started;
		if (elapsed > HOLD_MS) suppressClick = true;
		const stage = crackStage(elapsed, total);
		if (stage !== lastStage) {
			lastStage = stage;
			crack.style.backgroundImage = `url(/mc/block/destroy_stage_${stage}.png)`;
			// 每換一個階段敲一下
			if (stage % 2 === 0) playHit();
		}
		if (elapsed >= total) {
			cleanup();
			playDig();
			shatter(target);
			target.style.visibility = 'hidden';
			target.setAttribute('aria-hidden', 'true');
			damageHeld();
			return;
		}
		frame = requestAnimationFrame(tick);
	};
	['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => target.addEventListener(type, cancel));
	frame = requestAnimationFrame(tick);
}

/** 只綁一次：在整份文件上監聽，換頁後的新按鈕也算 */
export function initMining(): void {
	document.addEventListener('pointerdown', (event) => {
		if (event.button !== 0 || !(event.target instanceof Element)) return;
		const target = event.target.closest<HTMLElement>(TARGETS);
		const pickaxe = holdingPickaxe();
		if (!target || !pickaxe) return;
		startMining(target, pickaxe.enchanted ? ENCHANTED_MINE_MS : MINE_MS);
	});
	// 挖的時候手機長按不要跳出選單
	document.addEventListener('contextmenu', (event) => {
		if (event.target instanceof Element && event.target.closest(TARGETS) && holdingPickaxe()) event.preventDefault();
	});
}
