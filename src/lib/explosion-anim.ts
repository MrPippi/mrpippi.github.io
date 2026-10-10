/**
 * 在聊天列呼喚苦力怕：嘶——1.5 秒後爆炸（閃白、畫面震動、原版爆炸粒子），解鎖隱藏進度「嘶嘶…」。
 * 位置與關鍵影格在 explosion.ts。減少動態效果時只有聲音，沒有閃光與震動。
 */
import { unlock } from './advancements';
import {
	explosionMs,
	FUSE_MS,
	planExplosion,
	PUFF_FRAMES,
	PUFF_MS,
	type Puff,
	SHAKE_MS,
	shakeKeyframes,
} from './explosion';
import { playExplosion, playHiss } from './sound';

const FLASH_MS = 400;
const FLASH_OPACITY = 0.7;
const SPRITE = '/mc/particle/explosion.png';

let lit = false;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function overlay(className: string): HTMLElement {
	const el = document.createElement('div');
	el.className = className;
	el.setAttribute('aria-hidden', 'true');
	document.body.append(el);
	return el;
}

function flash(): void {
	const el = overlay('explosion-flash');
	el.animate([{ opacity: FLASH_OPACITY }, { opacity: 0 }], { duration: FLASH_MS, easing: 'ease-out' })
		.finished.catch(() => undefined)
		.finally(() => el.remove());
}

function puffElement(puff: Puff): HTMLElement {
	const el = document.createElement('div');
	el.className = 'explosion-puff';
	Object.assign(el.style, {
		left: `${puff.x}px`,
		top: `${puff.y}px`,
		width: `${puff.size}px`,
		height: `${puff.size}px`,
		backgroundImage: `url(${SPRITE})`,
		backgroundSize: `${PUFF_FRAMES * 100}% 100%`,
		filter: `brightness(${puff.brightness})`,
	});
	// 沒在播放時是透明的（等待 delay 時不會先露出第一格）
	el.animate(
		[
			{ backgroundPosition: '0% 0', opacity: 1 },
			{ backgroundPosition: '100% 0', opacity: 1 },
		],
		{ duration: PUFF_MS, delay: puff.delay, easing: `steps(${PUFF_FRAMES}, jump-none)` },
	);
	return el;
}

function puffs(): void {
	const plan = planExplosion({ width: window.innerWidth, height: window.innerHeight }, Math.random);
	const layer = overlay('explosion');
	layer.append(...plan.map(puffElement));
	window.setTimeout(() => layer.remove(), explosionMs(plan));
}

function shake(): void {
	document.querySelector('main')?.animate([...shakeKeyframes()], { duration: SHAKE_MS, easing: 'ease-out' });
}

/** 點燃苦力怕，爆炸後回傳 true；已經有一隻在點燃中就回傳 false */
export async function igniteCreeper(): Promise<boolean> {
	if (lit) return false;
	lit = true;
	try {
		playHiss(FUSE_MS);
		await wait(FUSE_MS);
		playExplosion();
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			flash();
			shake();
			puffs();
		}
		unlock('creeper');
		return true;
	} finally {
		lit = false;
	}
}
