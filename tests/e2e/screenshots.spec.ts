import { test } from './fixtures';

/**
 * 每個頁面在白天／夜晚各截一張全頁圖，附在測試報告裡（CI 會上傳成 artifact），
 * 方便在 PR 裡人工檢查版面有沒有跑掉。動畫與轉場先關掉，截圖才穩定。
 */
const PAGES = ['/', '/about/', '/portfolio/', '/media/', '/contact/', '/blog/', '/en/', '/en/about/'];
const THEMES = ['light', 'dark'] as const;

for (const theme of THEMES) {
	for (const path of PAGES) {
		test(`截圖 ${theme} ${path}`, async ({ page }, testInfo) => {
			await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
			await page.addInitScript(() => {
				// 已達成所有造訪類進度，避免通知框蓋住畫面
				localStorage.setItem('advancements', JSON.stringify(['welcome', 'explorer', 'reader']));
			});
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const name = `${testInfo.project.name}-${theme}${path.replace(/\//g, '_')}.png`;
			const image = await page.screenshot({ fullPage: true });
			await testInfo.attach(name, { body: image, contentType: 'image/png' });
		});
	}
}
