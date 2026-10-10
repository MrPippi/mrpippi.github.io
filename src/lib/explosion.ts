/**
 * 苦力怕彩蛋的爆炸：畫面中央冒出一團原版爆炸粒子、畫面震動。
 * 這裡只算粒子位置與震動關鍵影格（純函式）；畫面在 explosion-anim.ts。
 */

/** 點燃到爆炸的時間（和遊戲一樣 1.5 秒） */
export const FUSE_MS = 1500;
/** 爆炸粒子動畫的格數（public/mc/particle/explosion.png 橫向接成一條） */
export const PUFF_FRAMES = 16;
export const PUFF_MS = 600;
export const PUFF_COUNT = 12;
/** 粒子大小（px），每個再隨機縮放 0.6 ~ 1.4 倍 */
const PUFF_SIZE = 128;
/** 粒子散開的範圍：畫面短邊的比例 */
const SPREAD = 0.25;
const MAX_DELAY_MS = 250;
export const SHAKE_MS = 500;
const SHAKE_PX = [12, -10, 8, -6, 4, -2, 0];

export interface Viewport {
	readonly width: number;
	readonly height: number;
}

export interface Puff {
	readonly x: number;
	readonly y: number;
	readonly size: number;
	readonly delay: number;
	/** 亮度（原版爆炸粒子是隨機深淺的灰色） */
	readonly brightness: number;
}

export type Random = () => number;

export function planExplosion(viewport: Viewport, rand: Random, count: number = PUFF_COUNT): readonly Puff[] {
	const cx = viewport.width / 2;
	const cy = viewport.height / 2;
	const reach = Math.min(viewport.width, viewport.height) * SPREAD;
	return Array.from({ length: count }, () => {
		const angle = rand() * Math.PI * 2;
		const radius = rand() * reach;
		const size = Math.round(PUFF_SIZE * (0.6 + rand() * 0.8));
		return {
			x: Math.round(cx + Math.cos(angle) * radius - size / 2),
			y: Math.round(cy + Math.sin(angle) * radius - size / 2),
			size,
			delay: Math.round(rand() * MAX_DELAY_MS),
			brightness: 0.6 + rand() * 0.4,
		};
	});
}

/** 整段爆炸動畫多久結束（最晚的粒子播完） */
export function explosionMs(puffs: readonly Puff[]): number {
	return Math.max(0, ...puffs.map((p) => p.delay)) + PUFF_MS;
}

/** 畫面震動：左右上下晃動，幅度越來越小 */
export function shakeKeyframes(): readonly Keyframe[] {
	return SHAKE_PX.map((px, i) => ({ transform: `translate(${px}px, ${i % 2 === 0 ? -px / 2 : px / 2}px)` }));
}
