/**
 * 挖掘裂痕的拼法（純函式）：按鈕分成幾格，每格用原版裂痕貼圖的 8 種方向之一（轉 0/90/180/270 度、可鏡像），
 * 整片看起來不會一直重複同一個圖案。畫面在 mining.ts。
 */

export const CRACK_STAGES = 10;
/** 原版裂痕貼圖 16×16 */
export const CRACK_TEXTURE = 16;

/** 挖了 elapsed 毫秒時的裂痕階段（0–9） */
export function crackStage(elapsed: number, total: number): number {
	return Math.min(CRACK_STAGES - 1, Math.max(0, Math.floor((elapsed / total) * CRACK_STAGES)));
}

export interface CrackLayout {
	readonly cols: number;
	readonly rows: number;
	/** 每格的方向 0–7：0–3 是轉幾個 90 度，4–7 再加左右鏡像 */
	readonly orientations: readonly number[];
}

/** 依按鈕大小決定格數：一格大約和按鈕一樣高（至少 32px），盡量接近正方形 */
export function crackLayout(width: number, height: number, rand: () => number): CrackLayout {
	const tile = Math.max(32, Math.round(height / CRACK_TEXTURE) * CRACK_TEXTURE);
	const cols = Math.max(1, Math.round(width / tile));
	const rows = Math.max(1, Math.round(height / tile));
	const orientations = Array.from({ length: cols * rows }, () => Math.floor(rand() * 8));
	return { cols, rows, orientations };
}
