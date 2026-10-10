import { expect, type Page, test } from '@playwright/test';

const PAGES = ['/', '/about/', '/portfolio/', '/media/', '/contact/', '/blog/', '/en/', '/en/about/', '/en/portfolio/', '/en/media/', '/en/contact/'];

/** 收集頁面上的 JS 錯誤（不含外部字型等網路請求失敗） */
function trackErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (msg) => {
		if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) errors.push(msg.text());
	});
	return errors;
}

for (const path of PAGES) {
	test(`${path} 正常載入、沒有 JS 錯誤`, async ({ page }) => {
		const errors = trackErrors(page);
		const response = await page.goto(path);
		expect(response?.status()).toBe(200);
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('[data-music-toggle]')).toBeVisible();
		expect(errors).toEqual([]);
	});
}

test('<html lang> 與語言一致，雙語頁面有 hreflang', async ({ page }) => {
	await page.goto('/en/about/');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('link[hreflang="zh-Hant-TW"]')).toHaveAttribute('href', /\/about\/$/);
	await page.goto('/about/');
	await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-TW');
});

test('換頁不重新載入：天空與音樂按鈕保留原元素', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => {
		(window as unknown as { __marker: Element | null }).__marker = document.querySelector('[data-music-toggle]');
	});
	await page.locator('a.banner[href="/about/"]').click();
	await expect(page).toHaveURL(/\/about\/$/);
	const same = await page.evaluate(
		() =>
			(window as unknown as { __marker: Element | null }).__marker === document.querySelector('[data-music-toggle]'),
	);
	expect(same).toBe(true);
});

test('語言按鈕切換到對應頁面，介面文字跟著換', async ({ page }) => {
	await page.goto('/contact/');
	await page.locator('[data-lang-toggle]').click();
	await expect(page).toHaveURL(/\/en\/contact\/$/);
	await expect(page.locator('h1')).toHaveText('Contact');
	await expect(page.locator('[data-lang-toggle]')).toHaveAttribute('data-tooltip', '中文');
	await page.locator('[data-lang-toggle]').click();
	await expect(page).toHaveURL(/\/contact\/$/);
	await expect(page.locator('h1')).toHaveText('聯絡');
});

test('第一次造訪解鎖「歡迎光臨」，附魔書解鎖「附魔師」', async ({ page }) => {
	await page.goto('/about/');
	await expect(page.locator('[data-toast]')).toBeVisible();
	await expect(page.locator('[data-adv="welcome"]')).toHaveClass(/done/);
	await page.locator('[data-enchanted-book]').click();
	await expect(page.locator('[data-adv="enchanter"]')).toHaveClass(/done/);
	await expect(page.locator('.ch.read')).toHaveCount(await page.locator('.ch').count());
});

test('音樂面板：開關、音量滑桿會記住', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-music-toggle]').click();
	const panel = page.locator('[data-music-panel]');
	await expect(panel).toBeVisible();
	await expect(page.locator('[data-music-power]')).toHaveText('背景音樂：關');

	await page.locator('#music-volume').fill('70');
	await expect(panel.locator('[data-slider-label]').first()).toHaveText('音樂：70%');
	expect(await page.evaluate(() => localStorage.getItem('music-volume'))).toBe('0.7');

	await page.keyboard.press('Escape');
	await expect(panel).toBeHidden();
});

test('日夜切換只顯示下一個主題的圖示', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	const toggle = page.locator('[data-theme-toggle]');
	await expect(toggle.locator('.only-light')).toBeVisible();
	await expect(toggle.locator('.only-dark')).toBeHidden();
	await toggle.click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(toggle.locator('.only-dark')).toBeVisible();
	await expect(toggle.locator('.only-light')).toBeHidden();
});
