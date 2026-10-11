/**
 * 鑽石鎬挖按鈕：選到鑽石鎬時，對選單按鈕（標題畫面的大按鈕、石頭按鈕）按住不放，
 * 會出現原版的方塊裂痕（destroy_stage_0–9，每格隨機轉向，不會整片重複），挖完按鈕碎掉、噴出碎屑，鎬子少一點耐久度。
 * 碎掉的按鈕在換頁或重新整理後回來。附魔過的鎬子挖得比較快（效率）。
 */
import { CRACK_STAGES, CRACK_TEXTURE, type CrackLayout, crackLayout, crackStage } from './crack';
import { type Spark, sparkOpacity, sparkPath, TICK_MS } from './firework';
import { vibrate } from './haptics';
import { damageHeld, heldStack } from './hotbar';
import { playDig, playHit } from './sound';

const TARGETS = '.banner, .mc-btn';
const MINE_MS = 1200;
const ENCHANTED_MINE_MS = 600;
/** 按住超過這麼久才算在挖（短按還是一般的點擊） */
const HOLD_MS = 150;
const DEBRIS_COUNT = 18;
const DEBRIS_COLOR = '#7a7a7a';

let crackImages: Promise<readonly HTMLImageElement[]> | undefined;

/** 10 張裂痕貼圖，第一次挖的時候才載入 */
function loadCracks(): Promise<readonly HTMLImageElement[]> {
	crackImages ??= Promise.all(
		Array.from(
			{ length: CRACK_STAGES },
			(_, stage) =>
				new Promise<HTMLImageElement>((resolve, reject) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.onerror = () => reject(new Error(`無法載入裂痕 ${stage}`));
					img.src = `/mc/block/destroy_stage_${stage}.png`;
				}),
		),
	);
	return crackImages;
}

/** 依拼法把某個階段的裂痕畫到 canvas（每格 16×16，CSS 再放大鋪滿按鈕） */
function drawCrack(canvas: HTMLCanvasElement, layout: CrackLayout, img: HTMLImageElement): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	layout.orientations.forEach((orientation, i) => {
		const x = (i % layout.cols) * CRACK_TEXTURE;
		const y = Math.floor(i / layout.cols) * CRACK_TEXTURE;
		const half = CRACK_TEXTURE / 2;
		ctx.save();
		ctx.translate(x + half, y + half);
		ctx.rotate(((orientation % 4) * Math.PI) / 2);
		if (orientation >= 4) ctx.scale(-1, 1);
		ctx.drawImage(img, -half, -half);
		ctx.restore();
	});
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
	const rect = target.getBoundingClientRect();
	const layout = crackLayout(rect.width, rect.height, Math.random);
	const crack = document.createElement('canvas');
	crack.className = 'crack';
	crack.width = layout.cols * CRACK_TEXTURE;
	crack.height = layout.rows * CRACK_TEXTURE;
	crack.setAttribute('aria-hidden', 'true');
	target.append(crack);
	let images: readonly HTMLImageElement[] = [];
	void loadCracks()
		.then((loaded) => {
			images = loaded;
		})
		.catch(() => undefined);
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
		const img = images[stage];
		if (stage !== lastStage && img) {
			lastStage = stage;
			drawCrack(crack, layout, img);
			// 每換一個階段敲一下
			if (stage % 2 === 0) {
				playHit();
				vibrate('hit');
			}
		}
		if (elapsed >= total) {
			cleanup();
			playDig();
			vibrate('break');
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
