/**
 * 使用物品時的畫面效果：煙火升空炸開、信標光柱。位置與顏色在 firework.ts。
 * 減少動態效果時只有聲音。
 */
import { planFirework, SPARK_DROP, type Spark } from './firework';
import { playFireworkBlast, playFireworkLaunch } from './sound';

const ROCKET_MS = 900;
const SPARK_MS = 1100;
const BEAM_MS = 1600;
const ROCKET_ICON = '/mc/item/firework_rocket.png';

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function layer(className: string): HTMLElement {
	const el = document.createElement('div');
	el.className = className;
	el.setAttribute('aria-hidden', 'true');
	document.body.append(el);
	return el;
}

function sparkElement(spark: Spark, x: number, y: number): HTMLElement {
	const el = document.createElement('span');
	el.className = 'firework-spark';
	el.style.left = `${x}px`;
	el.style.top = `${y}px`;
	el.style.background = spark.color;
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
		.finished.then(() => {
			rocket.remove();
			playFireworkBlast();
			sky.append(...plan.sparks.map((spark) => sparkElement(spark, plan.launchX, plan.burstY)));
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
