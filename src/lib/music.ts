/**
 * 背景音樂：public/sounds/menu/creative1–6.webm 隨機輪播，預設關閉。
 * - 一首播完隨機換下一首（不會連續重複同一首），也可以手動「下一首」。
 * - 開關與音量存在 localStorage；換頁時把曲目與播放位置存進 sessionStorage，重新整理後接著播。
 * - 瀏覽器不允許沒有使用者操作就自動播放，被擋時等第一次點擊或按鍵再開始。
 * - 只在開啟音樂時才下載，而且一次只下載正在播的那一首。
 * - 每換一首新曲目（或開始播放）都會發出 MUSIC_EVENT，給「正在播放」通知與設定面板使用。
 */

interface Track {
	readonly src: string;
	readonly title: string;
}

const TRACKS: readonly Track[] = [
	{ src: '/sounds/menu/creative1.webm', title: 'Biome Fest' },
	{ src: '/sounds/menu/creative2.webm', title: 'Blind Spots' },
	{ src: '/sounds/menu/creative3.webm', title: 'Haunt Muskie' },
	{ src: '/sounds/menu/creative4.webm', title: 'Aria Math' },
	{ src: '/sounds/menu/creative5.webm', title: 'Dreiton' },
	{ src: '/sounds/menu/creative6.webm', title: 'Taswell' },
];
export const ARTIST = 'C418';
export const MUSIC_EVENT = 'music-change';

const STORAGE_KEY = 'music';
const VOLUME_KEY = 'music-volume';
const SESSION_KEY = 'music-state';
const DEFAULT_VOLUME = 0.35;

export interface MusicChange {
	readonly playing: boolean;
	readonly title: string | undefined;
	/** true：剛開始播一首新曲目（用來決定要不要跳「正在播放」通知） */
	readonly newTrack: boolean;
}

interface PlaybackState {
	readonly track: number;
	readonly position: number;
}

let player: HTMLAudioElement | undefined;
let current = -1;
let announced = -1;

export function isMusicOn(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'on';
	} catch {
		return false;
	}
}

export function getMusicVolume(): number {
	try {
		const value = Number(localStorage.getItem(VOLUME_KEY));
		return localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
	} catch {
		return DEFAULT_VOLUME;
	}
}

export function setMusicVolume(volume: number): void {
	const clamped = Math.min(1, Math.max(0, volume));
	try {
		localStorage.setItem(VOLUME_KEY, String(clamped));
	} catch {
		// 無法儲存時只在本次瀏覽生效
	}
	if (player) player.volume = clamped;
}

export function currentTitle(): string | undefined {
	return current >= 0 ? TRACKS[current].title : undefined;
}

export function isPlaying(): boolean {
	return !!player && !player.paused;
}

function emit(newTrack: boolean): void {
	const detail: MusicChange = { playing: isPlaying(), title: currentTitle(), newTrack };
	document.dispatchEvent(new CustomEvent(MUSIC_EVENT, { detail }));
}

/** 隨機挑一首；exclude 為剛播完的曲目（-1 表示不排除）。 */
export function randomTrack(exclude: number, count: number = TRACKS.length): number {
	if (exclude < 0 || count < 2) return Math.floor(Math.random() * count);
	// 從其餘 n-1 首中挑：挑到的編號 >= exclude 就往後跳一格
	const pick = Math.floor(Math.random() * (count - 1));
	return pick >= exclude ? pick + 1 : pick;
}

function loadState(): PlaybackState | undefined {
	try {
		const parsed: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
		if (typeof parsed !== 'object' || parsed === null) return undefined;
		const { track, position } = parsed as Record<string, unknown>;
		if (typeof track !== 'number' || !Number.isInteger(track) || track < 0 || track >= TRACKS.length) return undefined;
		return { track, position: typeof position === 'number' && position > 0 ? position : 0 };
	} catch {
		return undefined;
	}
}

function saveState(): void {
	if (!player || current < 0) return;
	try {
		const state: PlaybackState = { track: current, position: player.currentTime };
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
	} catch {
		// 無法儲存就從新的一首開始
	}
}

function load(audio: HTMLAudioElement, track: number, position = 0): void {
	current = track;
	audio.src = TRACKS[track].src;
	if (position > 0) {
		audio.addEventListener(
			'loadedmetadata',
			() => {
				audio.currentTime = Math.min(position, Math.max(0, audio.duration - 1));
			},
			{ once: true },
		);
	}
}

function getPlayer(): HTMLAudioElement {
	if (player) return player;
	const audio = new Audio();
	audio.volume = getMusicVolume();
	audio.addEventListener('ended', () => {
		load(audio, randomTrack(current));
		void audio.play().catch(() => undefined);
	});
	// 每首曲目第一次開始播時才算「新曲目」
	audio.addEventListener('playing', () => {
		const isNew = announced !== current;
		announced = current;
		emit(isNew);
	});
	audio.addEventListener('pause', () => emit(false));
	audio.addEventListener('error', () => console.warn(`[music] 無法載入 ${audio.src}`));
	window.addEventListener('pagehide', saveState);

	const saved = loadState();
	load(audio, saved?.track ?? randomTrack(-1), saved?.position ?? 0);
	player = audio;
	return audio;
}

async function play(): Promise<boolean> {
	try {
		await getPlayer().play();
		return true;
	} catch {
		return false;
	}
}

/** 被自動播放政策擋下時，等第一次互動再播。 */
function playOnFirstInteraction(): void {
	const start = (): void => {
		document.removeEventListener('pointerdown', start);
		document.removeEventListener('keydown', start);
		if (isMusicOn()) void play();
	};
	document.addEventListener('pointerdown', start);
	document.addEventListener('keydown', start);
}

export async function setMusicOn(on: boolean): Promise<boolean> {
	try {
		localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
	} catch {
		// 無法儲存時只在本次瀏覽生效
	}
	if (!on) {
		player?.pause();
		return true;
	}
	return play();
}

/** 跳到另一首隨機曲目（音樂關閉時會順便打開）。 */
export async function nextTrack(): Promise<boolean> {
	const audio = getPlayer();
	load(audio, randomTrack(current));
	return setMusicOn(true);
}

/** 頁面載入時呼叫：使用者之前開過音樂就繼續播。 */
export function initMusic(): void {
	if (!isMusicOn()) return;
	void play().then((ok) => {
		if (!ok) playOnFirstInteraction();
	});
}
