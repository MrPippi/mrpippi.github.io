/**
 * 瀏覽器端呼叫第三方 API 的共用工具：逾時中止，結果短暫存在 sessionStorage，
 * 同一次瀏覽換頁時不重複查詢，也不會對免費服務送出太多請求。
 */

const DEFAULT_TIMEOUT_MS = 5000;
/** 查詢失敗後這段時間內不再重試，服務掛掉時不會每換一頁就等一次逾時 */
export const FAILURE_BACKOFF_MS = 60 * 1000;

interface CacheEntry<T> {
	readonly at: number;
	readonly value: T;
}

/** 讀快取：超過 maxAgeMs 或格式不對就當作沒有 */
export function readCache<T>(key: string, maxAgeMs: number, now: number = Date.now()): T | undefined {
	try {
		const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
		if (typeof parsed !== 'object' || parsed === null) return undefined;
		const { at, value } = parsed as Partial<CacheEntry<T>>;
		if (typeof at !== 'number' || now - at > maxAgeMs || value === undefined) return undefined;
		return value;
	} catch {
		return undefined;
	}
}

export function writeCache<T>(key: string, value: T, now: number = Date.now()): void {
	try {
		const entry: CacheEntry<T> = { at: now, value };
		sessionStorage.setItem(key, JSON.stringify(entry));
	} catch {
		// 無法儲存就每次重新查詢
	}
}

/** 記錄 key 剛查詢失敗；recentlyFailed 在 FAILURE_BACKOFF_MS 內回傳 true */
export function markFailed(key: string): void {
	writeCache(`${key}:failed`, true);
}

export function recentlyFailed(key: string): boolean {
	return readCache<boolean>(`${key}:failed`, FAILURE_BACKOFF_MS) === true;
}

/** fetch 文字內容；逾時、網路錯誤或非 2xx 都丟出錯誤 */
export async function fetchText(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> {
	const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
	if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
	return res.text();
}
