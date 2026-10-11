/**
 * 傾斜手機看天空（計算部分）：陀螺儀讀數 -> 天空要平移多少 px。
 * 以第一次讀到的角度當作「拿著手機的姿勢」，之後只看相對變化。
 */
export interface TiltReading {
	/** 前後傾（deg） */
	readonly beta: number;
	/** 左右傾（deg） */
	readonly gamma: number;
}

export interface Offset {
	readonly x: number;
	readonly y: number;
}

/** 天空最多平移幾 px */
export const TILT_MAX_PX = 24;
/** 傾斜幾度就移到最大 */
export const TILT_RANGE_DEG = 30;
/** 每一格動畫往目標靠近的比例，越小越平滑 */
export const TILT_SMOOTHING = 0.15;

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

/** 依螢幕方向換算成畫面上的左右、上下（橫拿時兩個軸互換） */
function screenAxes(delta: TiltReading, angle: number): TiltReading {
	switch (((angle % 360) + 360) % 360) {
		case 90:
			return { beta: -delta.gamma, gamma: delta.beta };
		case 180:
			return { beta: -delta.beta, gamma: -delta.gamma };
		case 270:
			return { beta: delta.gamma, gamma: -delta.beta };
		default:
			return delta;
	}
}

/** 手機往右傾，天空往左移（像從窗戶看出去） */
export function tiltOffset(reading: TiltReading, baseline: TiltReading, angle = 0): Offset {
	const axes = screenAxes({ beta: reading.beta - baseline.beta, gamma: reading.gamma - baseline.gamma }, angle);
	return {
		x: -clamp(axes.gamma / TILT_RANGE_DEG) * TILT_MAX_PX,
		y: -clamp(axes.beta / TILT_RANGE_DEG) * TILT_MAX_PX,
	};
}

/** 從目前位置往目標靠近一點 */
export function approach(current: Offset, target: Offset, k = TILT_SMOOTHING): Offset {
	return { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
}
