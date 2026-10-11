/**
 * 單色像素圖示（以 currentColor 繪製），移植自 MJP-Paper-Skills。
 * 每列字串一格一像素，'X' 為實心、'.' 為透明。
 */
export const PIXEL_GLYPHS = {
	sun: ['...XX...', '.X....X.', '..XXXX..', 'X.XXXX.X', 'X.XXXX.X', '..XXXX..', '.X....X.', '...XX...'],
	moon: ['..XXX...', '.XXX....', 'XXX.....', 'XXX.....', 'XXX.....', 'XXX....X', '.XXXXXX.', '..XXXX..'],
	soundOn: ['...X....', '..XX..X.', 'XXXX...X', 'XXXX.X.X', 'XXXX.X.X', 'XXXX...X', '..XX..X.', '...X....'],
	music: ['..XXXXXX', '..XXXXXX', '..X....X', '..X....X', '..X....X', 'XXX..XXX', 'XXX..XXX', '........'],
	soundOff:['...X....', '..XX....', 'XXXX.X.X', 'XXXX..X.', 'XXXX.X.X', 'XXXX....', '..XX....', '...X....'],
	chat: ['XXXXXXXX', 'X......X', 'X.XXXX.X', 'X......X', 'X.XXX..X', 'X......X', 'XXXXXXXX', '.XX.....'],
} as const satisfies Record<string, readonly string[]>;

export type GlyphName = keyof typeof PIXEL_GLYPHS;

export interface PixelRect {
	readonly x: number;
	readonly y: number;
	readonly w: number;
}

/** 把同一列連續的實心格合併成一個 rect，減少 DOM 節點。 */
export function toRects(rows: readonly string[]): readonly PixelRect[] {
	return rows.flatMap((row, y) => {
		const runs = [...row.matchAll(/X+/g)];
		return runs.map((m) => ({ x: m.index ?? 0, y, w: m[0].length }));
	});
}
