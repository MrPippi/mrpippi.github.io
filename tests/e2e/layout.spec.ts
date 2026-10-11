import { expect, test } from './fixtures';

/**
 * 版面檢查（桌機與手機都會跑，見 playwright.config.ts）：
 * - 每頁都不能出現橫向捲動。
 * - 子頁標題不能被右下角按鈕列蓋住。
 * - 按鈕列固定在畫面右下角，捲到最底時頁面最後的內容（返回按鈕、頁尾）不能被它蓋住。
 */
const PAGES = ['/', '/about/', '/portfolio/', '/media/', '/contact/', '/blog/', '/en/', '/en/about/', '/en/portfolio/', '/en/media/', '/en/contact/'];

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
	a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

for (const path of PAGES) {
	test(`${path} 沒有橫向捲動`, async ({ page }) => {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});
}

for (const path of PAGES.filter((p) => p !== '/' && p !== '/en/')) {
	test(`${path} 標題文字沒有被按鈕列蓋住`, async ({ page }) => {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const title = await page.evaluate(() => {
			const range = document.createRange();
			range.selectNodeContents(document.querySelector('h1') as Node);
			const r = range.getBoundingClientRect();
			return { x: r.x, y: r.y, width: r.width, height: r.height };
		});
		const controls = await page.locator('.controls').boundingBox();
		expect(controls && overlaps(title, controls)).toBeFalsy();
	});
}

for (const path of PAGES) {
	test(`${path} 按鈕列固定在右下角，捲到最底時不會蓋住頁面最後的內容`, async ({ page }) => {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		const controls = await page.locator('.controls').boundingBox();
		const viewport = page.viewportSize();
		expect(controls && viewport).toBeTruthy();
		if (!controls || !viewport) return;
		// 固定在右下角（電腦版標題畫面會往上移到版權文字上方，所以容許 80px 內）
		expect(viewport.height - (controls.y + controls.height)).toBeLessThan(80);
		expect(viewport.width - (controls.x + controls.width)).toBeLessThan(40);
		// 頁面最後的內容：子頁的返回按鈕、標題畫面的版本號與版權
		const lastItems = page.locator('footer a, footer button, footer span');
		for (const box of await Promise.all((await lastItems.all()).map((el) => el.boundingBox()))) {
			if (box) expect(overlaps(box, controls)).toBe(false);
		}
	});
}

test('標題畫面：版本號與版權不會蓋住選單按鈕', async ({ page }) => {
	for (const path of ['/', '/en/']) {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const corner = await page.locator('footer.corner').boundingBox();
		expect(corner).toBeTruthy();
		if (!corner) return;
		for (const banner of await page.locator('.menu .banner').all()) {
			const box = await banner.boundingBox();
			if (box) expect(overlaps(box, corner)).toBe(false);
		}
	}
});

test('電腦版標題畫面：右下角按鈕列在版權文字上方、不重疊', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', '只檢查電腦版');
	for (const path of ['/', '/en/']) {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const controls = await page.locator('.controls').boundingBox();
		const texts = await Promise.all((await page.locator('footer.corner span').all()).map((el) => el.boundingBox()));
		expect(controls).toBeTruthy();
		if (!controls) return;
		for (const text of texts) {
			if (!text) continue;
			expect(overlaps(text, controls)).toBe(false);
			// 按鈕列的底部要在文字頂端之上
			expect(controls.y + controls.height).toBeLessThanOrEqual(text.y + 1);
		}
		// 選單按鈕也不能被按鈕列蓋住
		for (const banner of await page.locator('.menu .banner').all()) {
			const box = await banner.boundingBox();
			if (box) expect(overlaps(box, controls)).toBe(false);
		}
	}
});

test('聊天按鈕只在觸控裝置顯示，點了會打開聊天列', async ({ page }, testInfo) => {
	await page.goto('/');
	const toggle = page.locator('[data-chat-toggle]');
	if (testInfo.project.name !== 'mobile') {
		await expect(toggle).toBeHidden();
		return;
	}
	await expect(toggle).toBeVisible();
	await toggle.click();
	await expect(page.locator('[data-chat-input]')).toBeFocused();
	await page.locator('[data-chat-input]').fill('/give @s diamond');
	await page.locator('[data-chat-input]').press('Enter');
	await expect(page.locator('[data-hotbar]')).toHaveClass(/visible/);
});
