/**
 * 不死圖騰救命的畫面：圖騰從畫面中央跳出來轉一圈再消失，四周噴出綠色與黃色的閃光粒子（原版 glitter 染色）。
 * 減少動態效果時只有聲音。
 */
import { type Spark, sparkOpacity, sparkPath, TICK_MS } from './firework';
import { playTotem } from './sound';
import { tintedSprite } from './sprite-tint';

const ICON = '/mc/item/totem_of_undying.png';
const GLITTER = '/mc/particle/glitter.png';
/** 原版不死圖騰粒子的兩種顏色 */
const COLORS = ['#7FE33A', '#E8D93C'] as const;
const PARTICLES = 40;
const POP_MS = 1600;

export function totemPop(): void {
	playTotem();
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const layer = document.createElement('div');
	layer.className = 'totem-layer';
	layer.setAttribute('aria-hidden', 'true');
	const totem = document.createElement('img');
	totem.src = ICON;
	totem.alt = '';
	totem.className = 'totem-pop pixelated';
	layer.append(totem);
	document.body.append(layer);
	totem.animate(
		[
			{ transform: 'translate(-50%, -50%) scale(0.2) rotateY(0deg)', opacity: 1 },
			{ transform: 'translate(-50%, -50%) scale(1.6) rotateY(360deg)', opacity: 1, offset: 0.4 },
			{ transform: 'translate(-50%, -50%) scale(1.4) rotateY(360deg)', opacity: 1, offset: 0.75 },
			{ transform: 'translate(-50%, -60%) scale(1.2) rotateY(360deg)', opacity: 0 },
		],
		{ duration: POP_MS, easing: 'ease-out', fill: 'forwards' },
	);
	const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
	void Promise.all(COLORS.map((color) => tintedSprite(GLITTER, color))).then((sprites) => {
		const particles = Array.from({ length: PARTICLES }, (_, i) => {
			const el = document.createElement('span');
			el.className = 'totem-particle';
			el.style.left = `${center.x}px`;
			el.style.top = `${center.y}px`;
			const sprite = sprites[i % sprites.length];
			if (sprite) el.style.backgroundImage = `url(${sprite})`;
			else el.style.background = COLORS[i % COLORS.length] ?? COLORS[0];
			const angle = Math.random() * Math.PI * 2;
			const speed = 6 + Math.random() * 8;
			const spark: Spark = { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 4, life: 26, color: '' };
			const duration = spark.life * TICK_MS;
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
			return el;
		});
		layer.append(...particles);
	});
	window.setTimeout(() => layer.remove(), POP_MS + 200);
}
