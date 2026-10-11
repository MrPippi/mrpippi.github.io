import { test as base, type Page } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

export interface ExternalMocks {
	/** decapi uptime 回應；預設沒開台 */
	readonly twitchUptime?: string;
	readonly twitchTitle?: string;
	/** Open-Meteo 的 WMO 天氣代碼；預設 0（晴天） */
	readonly weatherCode?: number;
}

/**
 * 攔截網站在瀏覽器端呼叫的第三方 API（Twitch 開台狀態、天氣），測試結果才不受網路與實際天氣影響。
 * 要測特定狀態時在 page.goto 之前再呼叫一次（後設定的優先）。
 */
export async function mockExternalApis(page: Page, mocks: ExternalMocks = {}): Promise<void> {
	const { twitchUptime = 'mr_pippi is offline', twitchTitle = '', weatherCode = 0 } = mocks;
	const cors = { 'access-control-allow-origin': '*' };
	await page.route('https://decapi.me/twitch/uptime/**', (route) => route.fulfill({ body: twitchUptime, headers: cors }));
	await page.route('https://decapi.me/twitch/title/**', (route) => route.fulfill({ body: twitchTitle, headers: cors }));
	// 皮膚頭像：回一張 1×1 的 PNG，不連到外部
	await page.route('https://crafthead.net/**', (route) =>
		route.fulfill({
			contentType: 'image/png',
			body: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
				'base64',
			),
		}),
	);
	await page.route('https://api.open-meteo.com/**', (route) =>
		route.fulfill({ json: { current: { time: '2026-10-10T16:00', weather_code: weatherCode } }, headers: cors }),
	);
}

/** 所有測試共用：預設攔截第三方 API，並當作已經打開過新手禮包（物品欄從空的開始） */
export const test = base.extend({
	page: async ({ page }, use) => {
		await mockExternalApis(page);
		await page.addInitScript(() => {
			if (!sessionStorage.getItem('keep-starter-kit')) localStorage.setItem('starter-kit', 'opened');
		});
		await use(page);
	},
});
