/**
 * 經驗瓶：從物品欄往上丟、落地碎掉（藍色藥水粒子），噴出原版經驗球，經驗球一顆顆飛回物品欄並「叮」一聲。
 * 數值在 xp.ts；粒子的物理沿用煙火火花（firework.ts 的 sparkPath）。減少動態效果時只有聲音與訊息。
 */
import { langFromDocument, t } from '../i18n';
import { printToChat } from './chat';
import { type Spark, sparkOpacity, sparkPath, TICK_MS } from './firework';
import { ITEM_SIZE, type Point, throwKeyframes } from './item-drop';
import { playBreak, playPling } from './sound';
import { tintedSprite } from './sprite-tint';
import { bottleXp, orbIcon, splitOrbs, XP_SPLASH_COLOR } from './xp';

const THROW_MS = 600;
const SPLASH_COUNT = 16;
const SPLASH_FRAMES = 8;
const SPLASH_SPRITE = '/mc/particle/effect.png';
const BOTTLE_ICON = '/mc/item/experience_bottle.png';
/** 經驗球噴出來後停多久才飛回去、每顆間隔多久 */
const ORB_REST_MS = 700;
const ORB_GAP_MS = 120;
const ORB_FLY_MS = 350;
/** 經驗球圖每格 16px（4×4 格） */
const ORB_CELL = 16;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function layer(): HTMLElement {
	const el = document.createElement('div');
	el.className = 'xp-layer';
	el.setAttribute('aria-hidden', 'true');
	document.body.append(el);
	return el;
}

function randomSpark(speed: number, up: number, life: number): Spark {
	const angle = Math.random() * Math.PI * 2;
	return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - up, life, color: XP_SPLASH_COLOR };
}

function pathKeyframes(spark: Spark, fade: boolean): Keyframe[] {
	return sparkPath(spark).map((p, tick) => ({
		transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`,
		...(fade ? { opacity: sparkOpacity(tick, spark.life) } : {}),
		offset: tick / spark.life,
	}));
}

/** 碎掉的藥水粒子（灰階 effect 粒子染成經驗瓶的藍色） */
async function splash(sky: HTMLElement, at: Point): Promise<void> {
	const sprite = await tintedSprite(SPLASH_SPRITE, XP_SPLASH_COLOR);
	const particles = Array.from({ length: SPLASH_COUNT }, () => {
		const el = document.createElement('span');
		el.className = 'xp-splash';
		el.style.left = `${at.x}px`;
		el.style.top = `${at.y}px`;
		if (sprite) el.style.backgroundImage = `url(${sprite})`;
		else el.style.background = XP_SPLASH_COLOR;
		const spark = randomSpark(2 + Math.random() * 3, 2, 14 + Math.floor(Math.random() * 8));
		const duration = spark.life * TICK_MS;
		el.animate([{ backgroundPosition: '0% 0' }, { backgroundPosition: '100% 0' }], {
			duration,
			easing: `steps(${SPLASH_FRAMES}, jump-none)`,
			fill: 'forwards',
		});
		el.animate(pathKeyframes(spark, true), { duration, fill: 'forwards' });
		return el;
	});
	sky.append(...particles);
}

/** 一顆經驗球：噴出來、停一下，再飛向 target */
async function orb(sky: HTMLElement, at: Point, value: number, delay: number, target: Point): Promise<void> {
	const el = document.createElement('span');
	el.className = 'xp-orb';
	const icon = orbIcon(value);
	el.style.left = `${at.x}px`;
	el.style.top = `${at.y}px`;
	el.style.backgroundPosition = `${-(icon % 4) * ORB_CELL * 2}px ${-Math.floor(icon / 4) * ORB_CELL * 2}px`;
	sky.append(el);
	const pop = randomSpark(3 + Math.random() * 2, 4, 14);
	const path = sparkPath(pop);
	const rest = path[path.length - 1] ?? { x: 0, y: 0 };
	await el.animate(pathKeyframes(pop, false), { duration: pop.life * TICK_MS, fill: 'forwards' }).finished;
	await wait(ORB_REST_MS + delay);
	await el.animate(
		[
			{ transform: `translate(${rest.x}px, ${rest.y}px)` },
			{ transform: `translate(${target.x - at.x}px, ${target.y - at.y}px)`, opacity: 0.6 },
		],
		{ duration: ORB_FLY_MS, easing: 'ease-in', fill: 'forwards' },
	).finished;
	el.remove();
	playPling();
}

/** 丟出經驗瓶（從 from，通常是物品欄的格子） */
export function throwXpBottle(from: Point | undefined): void {
	const total = bottleXp(Math.random);
	const orbs = splitOrbs(total);
	const done = (): void => printToChat(t(langFromDocument()).inventory.xp(total));
	const start = from ?? { x: window.innerWidth / 2, y: window.innerHeight - 80 };
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		playBreak();
		orbs.forEach((_, i) => window.setTimeout(playPling, (i + 1) * ORB_GAP_MS));
		done();
		return;
	}
	const sky = layer();
	const land = { x: start.x - ITEM_SIZE / 2 + (Math.random() - 0.5) * 160, y: start.y - 200 - Math.random() * 80 };
	const bottle = document.createElement('img');
	bottle.src = BOTTLE_ICON;
	bottle.alt = '';
	bottle.className = 'xp-bottle pixelated';
	sky.append(bottle);
	const run = async (): Promise<void> => {
		await bottle.animate([...throwKeyframes(start, land)], { duration: THROW_MS, fill: 'forwards' }).finished;
		bottle.remove();
		playBreak();
		const at = { x: land.x + ITEM_SIZE / 2, y: land.y + ITEM_SIZE / 2 };
		void splash(sky, at);
		await Promise.all(orbs.map((value, i) => orb(sky, at, value, i * ORB_GAP_MS, start)));
		done();
	};
	run()
		.catch(() => undefined)
		.finally(() => sky.remove());
}
