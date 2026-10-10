/**
 * 使用物品時的畫面效果：煙火升空炸開（原版火花粒子，染成煙火之星的顏色）、信標光柱。位置與顏色在 firework.ts。
 * 減少動態效果時只有聲音。
 */
import { planFirework, SPARK_DROP, SPARK_FRAMES, type Spark } from './firework';
import { playFireworkBlast, playFireworkLaunch } from './sound';
import { tintedSprite } from './sprite-tint';

const ROCKET_MS = 900;
const SPARK_MS = 1100;
const BEAM_MS = 1600;
const ROCKET_ICON = '/mc/item/firework_rocket.png';
/** 原版火花粒子（灰階），依煙火顏色染色 */
const SPARK_SPRITE = '/mc/particle/spark.png';

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function layer(className: string): HTMLElement {
	const el = document.createElement('div');
	el.className = className;
	el.setAttribute('aria-hidden', 'true');
	document.body.append(el);
	return el;
}

function sparkElement(spark: Spark, x: number, y: number, sprite: string | undefined): HTMLElement {
	const el = document.createElement('span');
	el.className = 'firework-spark';
	el.style.left = `${x}px`;
	el.style.top = `${y}px`;
	if (sprite) {
		// 火花由大變小：逐格播放 spark_7 → spark_0
		el.style.backgroundImage = `url(${sprite})`;
		el.style.backgroundSize = `${SPARK_FRAMES * 100}% 100%`;
		el.animate([{ backgroundPosition: '0% 0' }, { backgroundPosition: '100% 0' }], {
			duration: SPARK_MS,
			easing: `steps(${SPARK_FRAMES}, jump-none)`,
			fill: 'forwards',
		});
	} else {
		el.style.background = spark.color;
	}
	el.animate(
		[
			{ transform: 'translate(0, 0)', opacity: 1 },
			{ transform: `translate(${spark.dx}px, ${spark.dy}px)`, opacity: 1, offset: 0.6 },
			{ transform: `translate(${spark.dx}px, ${spark.dy + SPARK_DROP}px)`, opacity: 0 },
		],
		{ duration: SPARK_MS, easing: 'ease-out', fill: 'forwards' },
	);
	return el;
}

/** 放一發煙火：火箭從畫面下方升空，在上半部炸開 */
export function launchFirework(): void {
	playFireworkLaunch();
	const plan = planFirework({ width: window.innerWidth, height: window.innerHeight }, Math.random);
	if (reducedMotion()) {
		window.setTimeout(playFireworkBlast, ROCKET_MS);
		return;
	}
	// 火箭飛行時先把火花染好色
	const colors = [...new Set(plan.sparks.map((spark) => spark.color))];
	const sprites = Promise.all(colors.map((color) => tintedSprite(SPARK_SPRITE, color))).then(
		(urls) => new Map(colors.map((color, i) => [color, urls[i]])),
	);
	const sky = layer('firework');
	const rocket = document.createElement('img');
	rocket.src = ROCKET_ICON;
	rocket.alt = '';
	rocket.className = 'firework-rocket pixelated';
	sky.append(rocket);
	rocket
		.animate(
			[
				{ transform: `translate(${plan.launchX}px, ${window.innerHeight}px)` },
				{ transform: `translate(${plan.launchX}px, ${plan.burstY}px)` },
			],
			{ duration: ROCKET_MS, easing: 'ease-out', fill: 'forwards' },
		)
		.finished.then(async () => {
			rocket.remove();
			playFireworkBlast();
			const urls = await sprites;
			sky.append(...plan.sparks.map((spark) => sparkElement(spark, plan.launchX, plan.burstY, urls.get(spark.color))));
			window.setTimeout(() => sky.remove(), SPARK_MS);
		})
		.catch(() => sky.remove());
}

/** 信標光柱：畫面中央一道光從下往上亮起再消失 */
export function beaconBeam(): void {
	if (reducedMotion()) return;
	const beam = layer('beacon-beam');
	beam
		.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.2 }, { opacity: 0.85, offset: 0.7 }, { opacity: 0 }], {
			duration: BEAM_MS,
			easing: 'ease-in-out',
		})
		.finished.catch(() => undefined)
		.finally(() => beam.remove());
}
