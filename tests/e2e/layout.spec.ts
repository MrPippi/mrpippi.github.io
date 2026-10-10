import { expect, test } from '@playwright/test';

/**
 * 版面檢查：每頁都不能出現橫向捲動，子頁標題不能被右上角按鈕蓋住。
 * 在桌機與手機兩種尺寸都會跑（見 playwright.config.ts）。
 */
const PAGES = ['/', '/about/', '/media/', '/contact/', '/blog/', '/en/', '/en/about/', '/en/media/', '/en/contact/'];

for (const path of PAGES) {
	test(`${path} 沒有橫向捲動`, async ({ page }) => {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});
}

for (const path of PAGES.filter((p) => p !== '/' && p !== '/en/')) {
	test(`${path} 標題沒有被右上角按鈕蓋住`, async ({ page }) => {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const title = await page.locator('h1').boundingBox();
		const controls = await page.locator('.controls').boundingBox();
		expect(title && controls).toBeTruthy();
		if (!title || !controls) return;
		const overlaps =
			title.x < controls.x + controls.width &&
			title.x + title.width > controls.x &&
			title.y < controls.y + controls.height &&
			title.y + title.height > controls.y;
		expect(overlaps).toBe(false);
	});
}
