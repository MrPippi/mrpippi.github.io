/**
 * 介面音效。
 * - 按鈕「喀」：原版 ui/click（public/sounds/，Opus WebM）；瀏覽器無法解碼時退回合成音。
 * - 提示「叮」：Web Audio API 即時合成。
 * AudioContext 一載入就建立（此時是暫停狀態），先解碼好點擊音；第一次使用者操作時才恢復出聲。
 */

const STORAGE_KEY = 'sound';
const VOLUME_KEY = 'sound-volume';
const CLICK_URL = '/sounds/ui/click.webm';
const CLICK_VOLUME = 0.5;
const SYNTH_VOLUME = 0.25;

let context: AudioContext | undefined;
let clickBuffer: AudioBuffer | undefined;

export function isMuted(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'off';
	} catch {
		return false;
	}
}

export function setMuted(muted: boolean): void {
	try {
		localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on');
	} catch {
		// 無法儲存時只在本次瀏覽生效
	}
	document.documentElement.dataset.sound = muted ? 'off' : 'on';
}

/** 音效音量（0–1），由音樂設定面板調整 */
export function getSoundVolume(): number {
	try {
		const raw = localStorage.getItem(VOLUME_KEY);
		const value = Number(raw);
		return raw !== null && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
	} catch {
		return 1;
	}
}

export function setSoundVolume(volume: number): void {
	try {
		localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
	} catch {
		// 無法儲存時只在本次瀏覽生效
	}
}

function getContext(): AudioContext | undefined {
	try {
		context ??= new AudioContext();
		return context;
	} catch {
		return undefined;
	}
}

/** 預先下載並解碼點擊音，避免第一次點擊時還沒準備好。 */
async function preloadClick(): Promise<void> {
	const ctx = getContext();
	if (!ctx) return;
	try {
		const res = await fetch(CLICK_URL);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		clickBuffer = await ctx.decodeAudioData(await res.arrayBuffer());
	} catch (error) {
		console.warn('[sound] 點擊音載入失敗，改用合成音：', error);
	}
}

void preloadClick();

function activeContext(): AudioContext | undefined {
	if (isMuted()) return undefined;
	const ctx = getContext();
	if (ctx?.state === 'suspended') void ctx.resume();
	return ctx;
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer, volume: number): void {
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	source.buffer = buffer;
	gain.gain.value = volume * getSoundVolume();
	source.connect(gain).connect(ctx.destination);
	source.start();
}

interface Tone {
	readonly type: OscillatorType;
	readonly from: number;
	readonly to: number;
	readonly start: number;
	readonly duration: number;
	readonly volume: number;
}

function playTone(ctx: AudioContext, tone: Tone): void {
	const t0 = ctx.currentTime + tone.start;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = tone.type;
	osc.frequency.setValueAtTime(tone.from, t0);
	osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.duration);
	gain.gain.setValueAtTime(Math.max(0.0001, tone.volume * SYNTH_VOLUME * getSoundVolume()), t0);
	gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.duration);
	osc.connect(gain).connect(ctx.destination);
	osc.start(t0);
	osc.stop(t0 + tone.duration + 0.02);
}

/** 按鈕「喀」聲 */
export function playClick(): void {
	const ctx = activeContext();
	if (!ctx) return;
	if (clickBuffer) {
		playBuffer(ctx, clickBuffer, CLICK_VOLUME);
		return;
	}
	playTone(ctx, { type: 'square', from: 1900, to: 700, start: 0, duration: 0.045, volume: 0.35 });
	playTone(ctx, { type: 'triangle', from: 420, to: 180, start: 0, duration: 0.06, volume: 0.5 });
}

/** 提示「叮」聲：兩個上升的音（類似撿到經驗球） */
export function playPling(): void {
	const ctx = activeContext();
	if (!ctx) return;
	playTone(ctx, { type: 'sine', from: 1318, to: 1318, start: 0, duration: 0.12, volume: 0.6 });
	playTone(ctx, { type: 'sine', from: 1760, to: 1760, start: 0.08, duration: 0.22, volume: 0.6 });
}

/** 撿起物品的「啵」聲：短促上升，音高每次略有不同（和遊戲一樣） */
export function playPop(): void {
	const ctx = activeContext();
	if (!ctx) return;
	const pitch = 0.8 + Math.random() * 0.4;
	playTone(ctx, { type: 'sine', from: 500 * pitch, to: 1100 * pitch, start: 0, duration: 0.07, volume: 0.6 });
}
