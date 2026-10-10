/**
 * 經驗瓶：丟出去碎掉後噴出經驗球。數值與原版一樣：一瓶 3–11 點，拆成原版大小的經驗球。
 * 純函式，不碰 DOM；畫面在 xp-anim.ts。
 */

/** 原版經驗球的面額（大到小） */
const ORB_VALUES = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1] as const;
/** 藥水碎裂粒子的顏色（原版經驗瓶 0x385DC6） */
export const XP_SPLASH_COLOR = '#385DC6';

export type Random = () => number;

/** 一瓶給多少經驗：3 + 0–4 + 0–4（和原版一樣） */
export function bottleXp(rand: Random): number {
	return 3 + Math.floor(rand() * 5) + Math.floor(rand() * 5);
}

/** 把經驗拆成原版的經驗球：每次拿最大的面額 */
export function splitOrbs(total: number): readonly number[] {
	const orbs: number[] = [];
	let left = Math.max(0, Math.floor(total));
	while (left > 0) {
		const value = ORB_VALUES.find((v) => v <= left) ?? 1;
		orbs.push(value);
		left -= value;
	}
	return orbs;
}

/** 經驗球圖示在 experience_orb.png（4×4 格、每格 16px）的第幾格：面額越大球越大 */
export function orbIcon(value: number): number {
	const index = ORB_VALUES.findIndex((v) => value >= v);
	return index === -1 ? 0 : ORB_VALUES.length - 1 - index;
}
