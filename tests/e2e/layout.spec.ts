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

/** 兩個矩形是否重疊 */
const overlaps = (a: Box, b: Box) =>
	a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
type Box = { x: number; y: number; width: number; height: number };

for (const path of PAGES.filter((p) => p !== '/' && p !== '/en/')) {
	test(`${path} 標題文字沒有被右上角按鈕或「進度達成」通知蓋住`, async ({ page }) => {
		// 第一次造訪會跳出「歡迎光臨」通知
		await page.goto(path);
		await expect(page.locator('[data-toast]')).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		// 量標題文字本身（不含左右留白）
		const title = await page.evaluate(() => {
			const range = document.createRange();
			range.selectNodeContents(document.querySelector('h1') as Node);
			const r = range.getBoundingClientRect();
			return { x: r.x, y: r.y, width: r.width, height: r.height };
		});
		const controls = await page.locator('.controls').boundingBox();
		const toast = await page.locator('[data-toast]').boundingBox();
		expect(controls && overlaps(title, controls)).toBeFalsy();
		expect(toast && overlaps(title, toast)).toBeFalsy();
	});
}

for (const path of PAGES) {
	test(`${path} 捲動到任何位置時，右上角按鈕都不會蓋住頁面裡的按鈕`, async ({ page }) => {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const covered = await page.evaluate(async () => {
			const controls = document.querySelector('.controls');
			if (!controls) return ['找不到 .controls'];
			const targets = [...document.querySelectorAll('main a, main button, footer a, footer button')];
			const found = new Set<string>();
			const step = Math.max(100, window.innerHeight / 2);
			for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
				window.scrollTo(0, y);
				await new Promise((r) => requestAnimationFrame(() => r(null)));
				const c = controls.getBoundingClientRect();
				for (const el of targets) {
					const b = el.getBoundingClientRect();
					if (b.width && b.left < c.right && b.right > c.left && b.top < c.bottom && b.bottom > c.top) {
						found.add(el.className.split(' ')[0] || el.tagName);
					}
				}
			}
			return [...found];
		});
		expect(covered).toEqual([]);
	});
}
