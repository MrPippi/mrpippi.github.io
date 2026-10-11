/**
 * 不死圖騰救命的畫面（公式在 totem.ts，照原版）：圖騰在畫面中央放大、旋轉、再縮小消失，
 * 同時 1.5 秒內陸續從畫面中央附近噴出綠色與黃色的閃光粒子（原版 glitter 染色）。
 * 減少動態效果時只有聲音。
 */
import { sparkOpacity, sparkPath, TICK_MS } from './firework';
import { playTotem } from './sound';
import { tintedSprite } from './sprite-tint';
import { TOTEM_TICKS, totemFrames, totemSpark } from './totem';

const ICON = '/mc/item/totem_of_undying.png';
const GLITTER = '/mc/particle/glitter.png';
/** 粒子噴發器持續幾刻、每刻噴幾顆（原版 30 刻） */
const EMIT_TICKS = 30;
const PER_TICK = 3;
/** 粒子從中央附近多大的範圍冒出來（px） */
const EMIT_RADIUS = 60;

function particle(layer: HTMLElement, center: { x: number; y: number }): void {
	const spark = totemSpark(Math.random);
	const el = document.createElement('span');
	el.className = 'totem-particle';
	el.style.left = `${center.x + (Math.random() * 2 - 1) * EMIT_RADIUS}px`;
	el.style.top = `${center.y + (Math.random() * 2 - 1) * EMIT_RADIUS}px`;
	const duration = spark.life * TICK_MS;
	void tintedSprite(GLITTER, spark.color).then((sprite) => {
		if (sprite) el.style.backgroundImage = `url(${sprite})`;
		else el.style.background = spark.color;
	});
	el.animate([{ backgroundPosition: '0% 0' }, { backgroundPosition: '100% 0' }], {
		duration,
		easing: 'steps(8, jump-none)',
		fill: 'forwards',
	});
	el.animate(
		sparkPath(spark).map((p, tick) => ({
			transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`,
			opacity: sparkOpacity(tick, spark.life),
			offset: tick / spark.life,
		})),
		{ duration, fill: 'forwards' },
	);
	layer.append(el);
	window.setTimeout(() => el.remove(), duration);
}

export function totemPop(): void {
	playTotem();
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const viewport = { width: window.innerWidth, height: window.innerHeight };
	const center = { x: viewport.width / 2, y: viewport.height / 2 };
	const layer = document.createElement('div');
	layer.className = 'totem-layer';
	layer.setAttribute('aria-hidden', 'true');
	document.body.append(layer);

	// 圖騰：每刻一個關鍵影格，刻與刻之間線性補間
	const totem = document.createElement('img');
	totem.src = ICON;
	totem.alt = '';
	totem.className = 'totem-pop pixelated';
	layer.append(totem);
	const frames = totemFrames(Math.random() * 2 - 1, Math.random() * 2 - 1, viewport);
	totem.animate(
		frames.map((frame, tick) => ({
			width: `${frame.size.toFixed(1)}px`,
			height: `${frame.size.toFixed(1)}px`,
			transform: `translate(-50%, -50%) translate(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px) rotateY(${frame.rotateY.toFixed(1)}deg) rotateZ(${frame.rotateZ.toFixed(1)}deg)`,
			offset: tick / TOTEM_TICKS,
		})),
		{ duration: TOTEM_TICKS * TICK_MS, fill: 'forwards' },
	);

	// 粒子：每刻噴幾顆，持續 EMIT_TICKS 刻
	let tick = 0;
	const emitter = window.setInterval(() => {
		Array.from({ length: PER_TICK }).forEach(() => particle(layer, center));
		tick += 1;
		if (tick >= EMIT_TICKS) window.clearInterval(emitter);
	}, TICK_MS);
	window.setTimeout(() => layer.remove(), (EMIT_TICKS + 52) * TICK_MS);
}
