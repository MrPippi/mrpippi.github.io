/**
 * Twitch 開台狀態：靜態網站沒辦法直接呼叫 Twitch API（需要金鑰），改向 decapi.me 查詢（免金鑰、純文字回應）。
 * - 結果在 sessionStorage 快取 3 分鐘；查詢失敗就當作沒開台，不影響網站。
 * - 開台時：每次瀏覽跳一次通知、標題畫面標語換成「正在直播」、直播按鈕加上 LIVE 標籤。
 */
import { TWITCH } from '../consts';
import { langFromDocument, t } from '../i18n';
import { fetchText, markFailed, readCache, recentlyFailed, writeCache } from './fetch-cache';
import { showToast } from './toast';

export interface LiveStatus {
	readonly live: boolean;
	readonly title: string;
}

const CACHE_KEY = 'twitch-live';
const NOTIFIED_KEY = 'twitch-live-notified';
const CACHE_MS = 3 * 60 * 1000;
const API = 'https://decapi.me/twitch';
const OFFLINE: LiveStatus = { live: false, title: '' };
const ICON = '/mc/item/firework_rocket.png';

/** decapi 的 uptime 回應：開台時是「1 hour, 5 minutes」這種時間，其他（offline、錯誤訊息）都算沒開台 */
export function isLiveUptime(text: string): boolean {
	const normalized = text.trim().toLowerCase();
	return !normalized.includes('offline') && /^\d+\s+(second|minute|hour|day)s?\b/.test(normalized);
}

function isLiveStatus(value: unknown): value is LiveStatus {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as LiveStatus).live === 'boolean' &&
		typeof (value as LiveStatus).title === 'string'
	);
}

export async function fetchLiveStatus(): Promise<LiveStatus> {
	const cached = readCache<LiveStatus>(CACHE_KEY, CACHE_MS);
	if (isLiveStatus(cached)) return cached;
	if (recentlyFailed(CACHE_KEY)) return OFFLINE;
	try {
		const live = isLiveUptime(await fetchText(`${API}/uptime/${TWITCH.handle}`));
		const title = live ? (await fetchText(`${API}/title/${TWITCH.handle}`).catch(() => '')).trim() : '';
		const status: LiveStatus = { live, title };
		writeCache(CACHE_KEY, status);
		return status;
	} catch (error) {
		console.warn('[twitch] 查不到開台狀態：', error);
		markFailed(CACHE_KEY);
		return OFFLINE;
	}
}

function notifyOnce(status: LiveStatus): void {
	try {
		if (sessionStorage.getItem(NOTIFIED_KEY)) return;
		sessionStorage.setItem(NOTIFIED_KEY, '1');
	} catch {
		// 無法記錄時每頁都可能通知一次，可以接受
	}
	const { live } = t(langFromDocument());
	showToast(live.toastTitle, status.title || live.toastBody, ICON);
}

/** 依開台狀態更新目前頁面：[data-live-tag] 顯示 LIVE、[data-splash] 換成直播標語 */
function applyToPage(status: LiveStatus): void {
	if (!status.live) return;
	const { live } = t(langFromDocument());
	document.querySelectorAll<HTMLElement>('[data-live-tag]').forEach((tag) => {
		tag.hidden = false;
	});
	const splash = document.querySelector<HTMLElement>('[data-splash]');
	if (splash) splash.textContent = live.splash;
}

/** 每次進入頁面（含 ClientRouter 換頁）呼叫 */
export async function checkLive(): Promise<void> {
	const status = await fetchLiveStatus();
	applyToPage(status);
	if (status.live) notifyOnce(status);
}
