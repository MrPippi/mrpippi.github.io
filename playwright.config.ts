import { defineConfig, devices } from '@playwright/test';

// 用 Astro 預設埠：本機已經開著 npm run preview 時直接沿用（Astro 7 同時只允許一個 preview）
const PORT = 4321;
const CI = !!process.env.CI;

/**
 * 端對端測試：對建置好的網站（astro preview）跑瀏覽器測試並截圖。
 * 請先 npm run build。CI 用 Playwright 內建的 Chromium，本機直接用已安裝的 Edge（不用另外下載瀏覽器）。
 */
export default defineConfig({
	testDir: 'tests/e2e',
	outputDir: 'test-results',
	fullyParallel: true,
	forbidOnly: CI,
	retries: CI ? 1 : 0,
	reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
	},
	webServer: {
		command: `npm run preview -- --port ${PORT}`,
		url: `http://localhost:${PORT}/`,
		reuseExistingServer: !CI,
		timeout: 60_000,
	},
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], channel: CI ? undefined : 'msedge' },
		},
		{
			name: 'mobile',
			use: { ...devices['Pixel 7'], channel: CI ? undefined : 'msedge' },
			testMatch: /(screenshots|layout)\.spec\.ts/,
		},
	],
});
