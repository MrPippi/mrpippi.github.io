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
/** 原版一刻（tick）是 50 毫秒，火花的物理一刻算一次 */
export const TICK_MS = 50;
/** 每一刻速度乘上這個值（空氣阻力，和原版火花一樣是 0.91） */
const FRICTION = 0.91;
/** 每一刻往下加的速度（px／刻） */
const GRAVITY = 0.15;
/** 炸開的初速（px／刻）：阻力下最後大約飛出初速 × 11 的距離 */
const MIN_SPEED = 6.3;
const MAX_SPEED = 12.6;
/** 火花活多久（刻） */
const MIN_LIFE = 30;
const MAX_LIFE = 42;
/** 最後這段比例的壽命慢慢變透明 */
const FADE_FROM = 0.6;

export interface Viewport {
	readonly width: number;
	readonly height: number;
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface Spark {
	/** 初速（px／刻） */
	readonly vx: number;
	readonly vy: number;
	/** 壽命（刻） */
	readonly life: number;
	readonly color: string;
	/** 每刻速度乘上的阻力（預設 0.91，原版火花） */
	readonly friction?: number;
	/** 每刻往下加的速度（預設 0.15；負的往上飄） */
	readonly gravity?: number;
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
		const speed = MIN_SPEED + rand() * (MAX_SPEED - MIN_SPEED);
		return {
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: MIN_LIFE + Math.floor(rand() * (MAX_LIFE - MIN_LIFE + 1)),
			color: colors[i % colors.length] ?? FIREWORK_COLORS.white,
		};
	});
	return { launchX, burstY, sparks };
}

/**
 * 火花每一刻的位置（相對爆炸點，第 0 個是爆炸點）：先移動，再乘上阻力、加上重力（和原版粒子的順序一樣）。
 * 結果是先快速散開、慢慢減速，最後畫著弧線往下飄。
 */
export function sparkPath(spark: Spark): readonly Point[] {
	const step = (state: { p: Point; vx: number; vy: number }) => ({
		p: { x: state.p.x + state.vx, y: state.p.y + state.vy },
		vx: state.vx * (spark.friction ?? FRICTION),
		vy: state.vy * (spark.friction ?? FRICTION) + (spark.gravity ?? GRAVITY),
	});
	return Array.from({ length: spark.life }).reduce<readonly { p: Point; vx: number; vy: number }[]>(
		(states, _) => [...states, step(states[states.length - 1] ?? { p: { x: 0, y: 0 }, vx: spark.vx, vy: spark.vy })],
		[{ p: { x: 0, y: 0 }, vx: spark.vx, vy: spark.vy }],
	).map((state) => state.p);
}

/** 第 tick 刻的不透明度：前段全亮，最後 40% 的壽命淡出 */
export function sparkOpacity(tick: number, life: number): number {
	const age = life > 0 ? tick / life : 1;
	return age <= FADE_FROM ? 1 : Math.max(0, (1 - age) / (1 - FADE_FROM));
}
