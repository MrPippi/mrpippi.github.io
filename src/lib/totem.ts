/**
 * 不死圖騰救命的動畫，照原版 GameRenderer 的公式（純函式）：
 * 40 刻（2 秒）內，圖騰在畫面中央放大再縮小、繞 Y 軸轉約兩圈半、左右輕晃，並往隨機方向偏一點。
 * 粒子照原版 TotemParticle：大多是綠色、四分之一是黃色，阻力很大（噴出去很快停下），之後慢慢飄。
 */
import type { Spark } from './firework';

export const TOTEM_TICKS = 40;
/** 原版圖騰大小 50 + 175 × sin（GUI 單位），換成畫面像素的倍率 */
const SIZE_SCALE = 1.2;

export interface TotemFrame {
	/** 相對畫面中央的位移（px） */
	readonly x: number;
	readonly y: number;
	/** 圖騰邊長（px） */
	readonly size: number;
	readonly rotateY: number;
	readonly rotateZ: number;
}

export interface Viewport {
	readonly width: number;
	readonly height: number;
}

/** 第 tick 刻（0–40）的樣子；offX、offY 是 -1 到 1 的隨機偏移方向 */
export function totemFrame(tick: number, offX: number, offY: number, viewport: Viewport): TotemFrame {
	const f = tick / TOTEM_TICKS;
	const f1 = f * f;
	const f2 = f * f1;
	const curve = 10.25 * f2 * f1 - 24.95 * f1 * f1 + 25.5 * f2 - 13.8 * f1 + 4 * f;
	const angle = curve * Math.PI;
	const swing = Math.abs(Math.sin(angle * 2));
	return {
		x: offX * (viewport.width / 4) * swing,
		y: offY * (viewport.height / 4) * swing,
		size: (50 + 175 * Math.sin(angle)) * SIZE_SCALE,
		rotateY: 900 * Math.abs(Math.sin(angle)),
		rotateZ: 6 * Math.cos(f * 8),
	};
}

export function totemFrames(offX: number, offY: number, viewport: Viewport): readonly TotemFrame[] {
	return Array.from({ length: TOTEM_TICKS + 1 }, (_, tick) => totemFrame(tick, offX, offY, viewport));
}

export type Random = () => number;

/** 原版圖騰粒子的顏色：1/4 黃色，其他綠色，深淺隨機 */
export function totemColor(rand: Random): string {
	const r = rand();
	const [red, green, blue] =
		rand() < 0.25 ? [0.6 + r * 0.2, 0.6 + r * 0.3, r * 0.2] : [0.1 + r * 0.2, 0.4 + r * 0.3, r * 0.2];
	const hex = (v: number): string =>
		Math.round(Math.min(1, v) * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

/** 一顆圖騰粒子：往四面八方噴，阻力 0.6 讓它很快停下，然後慢慢往上飄（第一人稱看起來像從身邊冒出來） */
export function totemSpark(rand: Random): Spark {
	const angle = rand() * Math.PI * 2;
	const speed = 25 + rand() * 45;
	return {
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		life: 40 + Math.floor(rand() * 12),
		color: totemColor(rand),
		friction: 0.6,
		gravity: -0.12,
	};
}
