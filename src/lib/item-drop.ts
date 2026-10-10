/**
 * /give 的物品掉落動畫：物品從畫面上方自由落體掉下來，落地彈一下，躺一會兒後被「撿起來」飛進物品欄。
 * 這裡只算位置與關鍵影格（純函式）；畫面在 item-drop-anim.ts。
 */

/** 物品顯示大小（16px 原圖放大 3 倍） */
export const ITEM_SIZE = 48;
/** 地面離畫面底部的距離：落在右下角按鈕列上方 */
export const GROUND_OFFSET = 72;
/** 重力加速度（px/s²） */
export const GRAVITY = 2600;
export const BOUNCE_MS = 220;
export const BOUNCE_HEIGHT = 12;
/** 左右留白（畫面寬度的比例），不要掉在邊緣 */
const SIDE_MARGIN = 0.1;
/** 二次曲線 t²：等加速度落下 */
const GRAVITY_EASING = 'cubic-bezier(0.333, 0, 0.667, 0.333)';
const PICKUP_SCALE = 0.3;

export interface Viewport {
	readonly width: number;
	readonly height: number;
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface DropPlan {
	readonly x: number;
	readonly landY: number;
	readonly fallMs: number;
}

export type Random = () => number;

/** 從靜止落下 distance px 要多久（毫秒） */
export function fallMs(distance: number): number {
	return Math.sqrt((2 * Math.max(0, distance)) / GRAVITY) * 1000;
}

export function planDrop(viewport: Viewport, rand: Random): DropPlan {
	const span = Math.max(0, viewport.width * (1 - 2 * SIDE_MARGIN) - ITEM_SIZE);
	const x = Math.round(viewport.width * SIDE_MARGIN + rand() * span);
	const landY = Math.max(0, viewport.height - GROUND_OFFSET - ITEM_SIZE);
	return { x, landY, fallMs: fallMs(landY + ITEM_SIZE) };
}

const at = (x: number, y: number): string => `translate(${x}px, ${y}px)`;

/** 落下 + 彈一下，總長 plan.fallMs + BOUNCE_MS */
export function fallKeyframes(plan: DropPlan): readonly Keyframe[] {
	const land = plan.fallMs / (plan.fallMs + BOUNCE_MS);
	return [
		{ transform: at(plan.x, -ITEM_SIZE), easing: GRAVITY_EASING },
		{ transform: at(plan.x, plan.landY), offset: land, easing: 'ease-out' },
		{ transform: at(plan.x, plan.landY - BOUNCE_HEIGHT), offset: (land + 1) / 2, easing: 'ease-in' },
		{ transform: at(plan.x, plan.landY) },
	];
}

/** 被撿起來：中心飛到 target（物品欄的格子）並縮小消失 */
export function pickupKeyframes(plan: DropPlan, target: Point): readonly Keyframe[] {
	const half = ITEM_SIZE / 2;
	return [
		{ transform: `${at(plan.x, plan.landY)} scale(1)`, opacity: 1 },
		{ transform: `${at(target.x - half, target.y - half)} scale(${PICKUP_SCALE})`, opacity: 0 },
	];
}

/** 掉落物疊幾個顯示：和原版一樣，數量越多疊越多個（最多 5 個） */
export function renderedCopies(count: number): number {
	if (count <= 1) return 1;
	if (count <= 16) return 2;
	if (count <= 32) return 3;
	if (count <= 48) return 4;
	return 5;
}
