/**
 * 煙火：火箭從畫面下方升空，在空中炸開成一圈彩色像素。
 * 這裡只算位置與顏色（純函式）；畫面在 firework-anim.ts。
 */

/** 原版染料顏色（煙火之星用的那些） */
export const FIREWORK_COLORS = [
	'#B02E26',
	'#F9801D',
	'#FED83D',
	'#80C71F',
	'#3AB3DA',
	'#3C44AA',
	'#8932B8',
	'#C74EBD',
	'#F9FFFE',
] as const;
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
	const colors = [pick(FIREWORK_COLORS, rand), pick(FIREWORK_COLORS, rand)];
	const sparks = Array.from({ length: count }, (_, i) => {
		const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.2;
		const reach = MIN_REACH + rand() * (MAX_REACH - MIN_REACH);
		return {
			dx: Math.round(Math.cos(angle) * reach),
			dy: Math.round(Math.sin(angle) * reach),
			color: colors[i % colors.length] ?? FIREWORK_COLORS[0],
		};
	});
	return { launchX, burstY, sparks };
}
