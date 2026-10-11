/**
 * 手機震動回饋（Vibration API）：挖礦、爆炸、不死圖騰觸發時震一下。
 * iPhone 的 Safari 不支援，會直接略過；關掉音效時也不震動。
 */
import { isMuted } from './sound';

/** 震動節奏（毫秒）：震、停、震…… */
export const HAPTICS = {
	hit: [12],
	break: [40],
	explosion: [120, 40, 200],
	totem: [30, 40, 30, 40, 90],
} as const satisfies Record<string, readonly number[]>;

export type Haptic = keyof typeof HAPTICS;

export function vibrate(name: Haptic): void {
	if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function' || isMuted()) return;
	try {
		navigator.vibrate([...HAPTICS[name]]);
	} catch {
		// 沒有使用者互動前呼叫可能被瀏覽器擋下，忽略
	}
}
