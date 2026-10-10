/**
 * 天氣：依台灣實際天氣（Open-Meteo，免金鑰）讓背景天空下雨、下雪或打雷。
 * - 結果在 sessionStorage 快取 15 分鐘；查不到時維持晴天。
 * - 聊天列的 /weather 指令可以暫時覆寫（只在這次瀏覽有效）。
 * - 實際畫面由 <Sky /> 依 .sky[data-weather] 顯示。
 */
import { WEATHER } from '../consts';
import { fetchText, markFailed, readCache, recentlyFailed, writeCache } from './fetch-cache';

export const WEATHERS = ['clear', 'rain', 'thunder', 'snow'] as const;
export type Weather = (typeof WEATHERS)[number];

export const WEATHER_EVENT = 'weather-change';

const CACHE_KEY = 'weather';
const OVERRIDE_KEY = 'weather-override';
const CACHE_MS = 15 * 60 * 1000;

export function isWeather(value: unknown): value is Weather {
	return typeof value === 'string' && (WEATHERS as readonly string[]).includes(value);
}

/** WMO 天氣代碼 → 遊戲裡的天氣。霧、陰天都算晴天（遊戲沒有）。 */
export function weatherFromCode(code: number): Weather {
	if (code >= 95) return 'thunder';
	if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
	if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
	return 'clear';
}

/** 解析 Open-Meteo 回應；格式不對時回傳 undefined */
export function parseOpenMeteo(json: unknown): Weather | undefined {
	if (typeof json !== 'object' || json === null) return undefined;
	const current = (json as { current?: unknown }).current;
	if (typeof current !== 'object' || current === null) return undefined;
	const code = (current as { weather_code?: unknown }).weather_code;
	return typeof code === 'number' && Number.isFinite(code) ? weatherFromCode(code) : undefined;
}

function apiUrl(): string {
	const params = new URLSearchParams({
		latitude: String(WEATHER.latitude),
		longitude: String(WEATHER.longitude),
		current: 'weather_code',
		timezone: WEATHER.timeZone,
	});
	return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** 目前實際天氣（有快取用快取）；查詢失敗回傳 'clear' */
export async function fetchRealWeather(): Promise<Weather> {
	const cached = readCache<Weather>(CACHE_KEY, CACHE_MS);
	if (isWeather(cached)) return cached;
	if (recentlyFailed(CACHE_KEY)) return 'clear';
	try {
		const weather = parseOpenMeteo(JSON.parse(await fetchText(apiUrl()))) ?? 'clear';
		writeCache(CACHE_KEY, weather);
		return weather;
	} catch (error) {
		console.warn('[weather] 查不到天氣，維持晴天：', error);
		markFailed(CACHE_KEY);
		return 'clear';
	}
}

export function getWeatherOverride(): Weather | undefined {
	try {
		const value = sessionStorage.getItem(OVERRIDE_KEY);
		return isWeather(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

/** 套用到天空並廣播 WEATHER_EVENT */
export function applyWeather(weather: Weather): void {
	const sky = document.querySelector<HTMLElement>('[data-sky]');
	if (sky) sky.dataset.weather = weather;
	document.dispatchEvent(new CustomEvent<Weather>(WEATHER_EVENT, { detail: weather }));
}

/** /weather 指令：暫時改天氣（這次瀏覽有效） */
export function overrideWeather(weather: Weather): void {
	try {
		sessionStorage.setItem(OVERRIDE_KEY, weather);
	} catch {
		// 無法儲存時只在這頁有效
	}
	applyWeather(weather);
}

export function currentWeather(): Weather {
	const value = document.querySelector<HTMLElement>('[data-sky]')?.dataset.weather;
	return isWeather(value) ? value : 'clear';
}

/** 頁面第一次載入時呼叫：有覆寫用覆寫，否則查實際天氣 */
export async function initWeather(): Promise<void> {
	const override = getWeatherOverride();
	if (override) {
		applyWeather(override);
		return;
	}
	const real = await fetchRealWeather();
	// 查詢期間訪客可能已經用 /weather 改過天氣，以訪客的為準
	applyWeather(getWeatherOverride() ?? real);
}
