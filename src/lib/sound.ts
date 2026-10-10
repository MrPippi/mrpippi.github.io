/**
 * 介面音效。
 * - 按鈕「喀」：原版 ui/click（public/sounds/，Opus WebM）；瀏覽器無法解碼時退回合成音。
 * - 提示「叮」：Web Audio API 即時合成。
 * - 撿起物品、苦力怕點燃與爆炸：原版 random/ 音效（public/sounds/random/），用到時才下載；無法載入時退回合成音。
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

/** 播放解碼好的音檔；rate 是音高（播放速度），stopAfter 秒後停止 */
function playBuffer(ctx: AudioContext, buffer: AudioBuffer, volume: number, rate = 1, stopAfter?: number): void {
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	source.buffer = buffer;
	source.playbackRate.value = rate;
	gain.gain.value = volume * getSoundVolume();
	source.connect(gain).connect(ctx.destination);
	source.start();
	if (stopAfter !== undefined) source.stop(ctx.currentTime + stopAfter);
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

/** 原版音效（public/sounds/random/，由 scripts/audio.mjs 轉檔）：用到時才下載，載入失敗就用合成音 */
const SAMPLES = {
	pop: '/sounds/random/pop.webm',
	fuse: '/sounds/random/fuse.webm',
	explode1: '/sounds/random/explode1.webm',
	explode2: '/sounds/random/explode2.webm',
	explode3: '/sounds/random/explode3.webm',
	explode4: '/sounds/random/explode4.webm',
} as const;
type Sample = keyof typeof SAMPLES;
const EXPLOSIONS: readonly Sample[] = ['explode1', 'explode2', 'explode3', 'explode4'];
const samples = new Map<Sample, Promise<AudioBuffer | undefined>>();

function loadSample(ctx: AudioContext, name: Sample): Promise<AudioBuffer | undefined> {
	const cached = samples.get(name);
	if (cached) return cached;
	const loading = fetch(SAMPLES[name])
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.arrayBuffer();
		})
		.then((data) => ctx.decodeAudioData(data))
		.catch((error: unknown) => {
			console.warn(`[sound] ${name} 載入失敗，改用合成音：`, error);
			return undefined;
		});
	samples.set(name, loading);
	return loading;
}

/** 先下載等一下會用到的音效（例如苦力怕點燃時先載入爆炸聲） */
export function preloadSamples(names: readonly Sample[]): void {
	const ctx = getContext();
	if (ctx) names.forEach((name) => void loadSample(ctx, name));
}

/** 原版的隨機音高：1 ± spread（兩個亂數相減，越接近 1 越常見） */
function randomPitch(spread: number): number {
	return 1 + (Math.random() - Math.random()) * spread;
}

async function playSample(
	name: Sample,
	volume: number,
	rate: number,
	fallback: (ctx: AudioContext) => void,
	stopAfter?: number,
): Promise<void> {
	const ctx = activeContext();
	if (!ctx) return;
	const buffer = await loadSample(ctx, name);
	if (buffer) playBuffer(ctx, buffer, volume, rate, stopAfter);
	else fallback(ctx);
}

/** 撿起物品的「啵」聲（原版 random/pop，音高約 2 倍並隨機變化） */
export function playPop(): void {
	const rate = Math.min(2, Math.max(0.5, randomPitch(0.7) * 2));
	void playSample('pop', 0.4, rate, (ctx) => {
		const pitch = 0.8 + Math.random() * 0.4;
		playTone(ctx, { type: 'sine', from: 500 * pitch, to: 1100 * pitch, start: 0, duration: 0.07, volume: 0.6 });
	});
}
interface Noise {
	readonly duration: number;
	readonly volume: number;
	readonly filter: BiquadFilterType;
	/** 濾波頻率從 from 滑到 to */
	readonly from: number;
	readonly to: number;
	/** 漸強時間（秒）；沒有就一開始最大聲 */
	readonly attack?: number;
}

function playNoise(ctx: AudioContext, noise: Noise): void {
	const t0 = ctx.currentTime;
	const length = Math.ceil(ctx.sampleRate * noise.duration);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

	const source = ctx.createBufferSource();
	source.buffer = buffer;
	const filter = ctx.createBiquadFilter();
	filter.type = noise.filter;
	filter.frequency.setValueAtTime(noise.from, t0);
	filter.frequency.exponentialRampToValueAtTime(noise.to, t0 + noise.duration);
	const gain = ctx.createGain();
	const peak = Math.max(0.0001, noise.volume * SYNTH_VOLUME * getSoundVolume());
	if (noise.attack) {
		gain.gain.setValueAtTime(0.0001, t0);
		gain.gain.exponentialRampToValueAtTime(peak, t0 + noise.attack);
	} else {
		gain.gain.setValueAtTime(peak, t0);
	}
	gain.gain.exponentialRampToValueAtTime(0.0001, t0 + noise.duration);
	source.connect(filter).connect(gain).connect(ctx.destination);
	source.start(t0);
}

/** 苦力怕點燃的「嘶——」（原版 random/fuse，和遊戲一樣半速播放），爆炸時停止 */
export function playHiss(ms: number): void {
	const duration = ms / 1000;
	void playSample(
		'fuse',
		0.6,
		0.5,
		(ctx) => playNoise(ctx, { duration, volume: 0.6, filter: 'highpass', from: 5000, to: 2500, attack: duration * 0.9 }),
		duration,
	);
}

/** 爆炸聲：隨機挑 explode1–4 其中一個，音高約 0.7 倍並隨機變化 */
export function playExplosion(): void {
	const name = EXPLOSIONS[Math.floor(Math.random() * EXPLOSIONS.length)] ?? 'explode1';
	void playSample(name, 0.8, randomPitch(0.2) * 0.7, (ctx) =>
		playNoise(ctx, { duration: 1.4, volume: 2.5, filter: 'lowpass', from: 1500, to: 60 }),
	);
}
