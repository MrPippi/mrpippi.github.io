/**
 * 煙火：火箭從畫面下方升空，在空中炸開成一圈彩色像素。
 * 這裡只算位置與顏色（純函式）；畫面在 firework-anim.ts。
 */

/**
 * 原版煙火之星的顏色（DyeColor 的 fireworkColor，和染料方塊的顏色不同）。
 * 黑、灰、棕、綠在夜空裡幾乎看不見，沒放進來。
 */
export const FIREWORK_COLORS = {
	white: '#F0F0F0',
	orange: '#EB8844',
	magenta: '#C354CD',
	light_blue: '#6689D3',
	yellow: '#DECF2A',
	lime: '#41CD34',
	pink: '#D88198',
	light_gray: '#ABABAB',
	cyan: '#287697',
	purple: '#7B2FBE',
	blue: '#253192',
	red: '#B3312C',
} as const;
const COLOR_LIST: readonly string[] = Object.values(FIREWORK_COLORS);
/** 火花動畫的格數（public/mc/particle/spark.png：spark_7 到 spark_0，由大變小） */
export const SPARK_FRAMES = 8;
export const SPARK_COUNT = 36;
/** 火花飛多遠（px） */
const MIN_REACH = 70;
const MAX_REACH = 140;
/** 火花炸開後往下掉多少（px） */
export const SPARK_DROP = 40;

export interface Viewport {
	readonly width: number;
	readonly height: number;
}

export interface Spark {
	readonly dx: number;
	readonly dy: number;
	readonly color: string;
}

export interface FireworkPlan {
	/** 升空起點與爆炸點（畫面座標） */
	readonly launchX: number;
	readonly burstY: number;
	readonly sparks: readonly Spark[];
}

export type Random = () => number;

const pick = <T>(list: readonly T[], rand: Random): T => list[Math.floor(rand() * list.length) % list.length] as T;

export function planFirework(viewport: Viewport, rand: Random, count: number = SPARK_COUNT): FireworkPlan {
	const launchX = Math.round(viewport.width * (0.25 + rand() * 0.5));
	const burstY = Math.round(viewport.height * (0.2 + rand() * 0.2));
	// 一發煙火用一到兩種顏色
	const colors = [pick(COLOR_LIST, rand), pick(COLOR_LIST, rand)];
	const sparks = Array.from({ length: count }, (_, i) => {
		const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.2;
		const reach = MIN_REACH + rand() * (MAX_REACH - MIN_REACH);
		return {
			dx: Math.round(Math.cos(angle) * reach),
			dy: Math.round(Math.sin(angle) * reach),
			color: colors[i % colors.length] ?? FIREWORK_COLORS.white,
		};
	});
	return { launchX, burstY, sparks };
}
