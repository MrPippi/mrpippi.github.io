/**
 * 傾斜手機看天空：讀陀螺儀，讓太陽／月亮、星星、雲跟著手機傾斜平移（--tilt-x / --tilt-y）。
 * 能直接讀就直接開始（Android）；iPhone 要使用者點一下才能要權限，所以在標題畫面第一次點空白處時才問，只問一次。
 * 減少動態效果時不啟用。
 */
import { approach, type Offset, type TiltReading, tiltOffset } from './tilt';

const PERMISSION_KEY = 'tilt-permission';

type PermissionRequest = () => Promise<'granted' | 'denied'>;

function permissionRequest(): PermissionRequest | undefined {
	const ctor = window.DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest } | undefined;
	return typeof ctor?.requestPermission === 'function' ? ctor.requestPermission.bind(ctor) : undefined;
}

function storedPermission(): string | null {
	try {
		return localStorage.getItem(PERMISSION_KEY);
	} catch {
		return null;
	}
}

function storePermission(state: string): void {
	try {
		localStorage.setItem(PERMISSION_KEY, state);
	} catch {
		// 無法儲存時下次再問
	}
}

let following = false;

function follow(sky: HTMLElement): void {
	if (following) return;
	following = true;
	let baseline: TiltReading | undefined;
	let target: Offset = { x: 0, y: 0 };
	let current: Offset = { x: 0, y: 0 };
	let frame = 0;

	const step = (): void => {
		current = approach(current, target);
		sky.style.setProperty('--tilt-x', `${current.x.toFixed(1)}px`);
		sky.style.setProperty('--tilt-y', `${current.y.toFixed(1)}px`);
		const settled = Math.abs(target.x - current.x) < 0.1 && Math.abs(target.y - current.y) < 0.1;
		frame = settled ? 0 : requestAnimationFrame(step);
	};

	window.addEventListener('deviceorientation', (event) => {
		if (event.beta === null || event.gamma === null) return;
		const reading = { beta: event.beta, gamma: event.gamma };
		baseline ??= reading;
		target = tiltOffset(reading, baseline, screen.orientation?.angle ?? 0);
		if (!frame) frame = requestAnimationFrame(step);
	});
	// 換個姿勢拿手機（例如轉成橫的）就重新抓基準
	screen.orientation?.addEventListener('change', () => {
		baseline = undefined;
	});
}

/** 只跑一次（天空在換頁時保留） */
export function initTiltSky(sky: HTMLElement): void {
	if (!('DeviceOrientationEvent' in window)) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	// 不需要權限的瀏覽器直接會收到讀數；需要權限的（iPhone）在允許之前什麼都收不到，聽著也無妨
	follow(sky);
	const request = permissionRequest();
	if (!request) return;
	const stored = storedPermission();
	if (stored === 'granted') {
		// 已經允許過：iOS 仍要在使用者操作時呼叫一次才會開始送資料，不會再跳出詢問
		document.addEventListener('pointerup', () => void request().catch(() => undefined), { once: true });
		return;
	}
	if (stored === 'denied') return;
	// 標題畫面點空白處（不是按鈕或連結）時才詢問
	const ask = (event: PointerEvent): void => {
		if (!document.querySelector('.title-screen')) return;
		if (event.target instanceof Element && event.target.closest('a, button, input, [data-tooltip]')) return;
		document.removeEventListener('pointerup', ask);
		void request().then(storePermission).catch(() => undefined);
	};
	document.addEventListener('pointerup', ask);
}
