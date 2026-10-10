import { expect, test } from '@playwright/test';

test.describe('404 死亡畫面', () => {
	test('中文：你死了、分數 404、按鈕 1 秒後才能按，解鎖「迷路了」', async ({ page }) => {
		const response = await page.goto('/this-page-does-not-exist/');
		expect(response?.status()).toBe(404);
		await expect(page.locator('h1')).toHaveText('你死了！');
		await expect(page.locator('[data-death-message]')).toContainText('皮皮');
		await expect(page.locator('.score')).toContainText('404');

		// 一開始是停用的（看伺服器送出的 HTML，不受載入速度影響），之後才能按
		const html = (await response?.text()) ?? '';
		expect(html).toMatch(/<button[^>]*disabled[^>]*data-title-screen|<button[^>]*data-title-screen[^>]*disabled/);
		const titleScreen = page.locator('[data-title-screen]');
		await expect(titleScreen).toBeEnabled({ timeout: 3000 });
		expect(await page.evaluate(() => localStorage.getItem('advancements'))).toContain('lost');

		await titleScreen.click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator('.menu')).toBeVisible();
	});

	test('英文網址顯示英文', async ({ page }) => {
		await page.goto('/en/nowhere/');
		await expect(page.locator('h1')).toHaveText('You Died!');
		await expect(page.locator('[data-respawn]')).toHaveText('Respawn');
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});
});

test.describe('原版物品提示框', () => {
	test('滑鼠移到統計資料上顯示名稱與說明，移開後消失', async ({ page }) => {
		await page.goto('/about/');
		const tooltip = page.locator('[data-mc-tooltip]');
		await page.locator('.stat').first().hover();
		await expect(tooltip).toBeVisible();
		await expect(tooltip.locator('[data-tooltip-name]')).toHaveText('Minecraft 插件');
		await expect(tooltip.locator('[data-tooltip-body] p')).toHaveText(['Java', 'Paper API', 'Gradle']);
		await page.mouse.move(5, 5);
		await expect(tooltip).toBeHidden();
	});

	test('進度提示框顯示達成狀態', async ({ page }) => {
		await page.goto('/about/');
		const tooltip = page.locator('[data-mc-tooltip]');
		await page.locator('[data-adv="welcome"]').hover();
		await expect(tooltip.locator('[data-tooltip-body] p').last()).toHaveText('已達成');
		await page.locator('[data-adv="dj"]').hover();
		await expect(tooltip.locator('[data-tooltip-body] p').last()).toHaveText('尚未達成');
	});

	test('右下角按鈕用提示框取代瀏覽器原生提示', async ({ page }) => {
		await page.goto('/');
		const button = page.locator('[data-lang-toggle]');
		await expect(button).not.toHaveAttribute('title', /.+/);
		await button.hover();
		await expect(page.locator('[data-mc-tooltip] [data-tooltip-name]')).toHaveText('English');
	});
});

test('換頁較慢時顯示「正在載入地形…」，載入完自動消失', async ({ page }) => {
	await page.goto('/');
	// 讓下一頁慢一點回應
	await page.route('**/about/', async (route) => {
		await new Promise((r) => setTimeout(r, 800));
		await route.continue();
	});
	await page.locator('a.banner[href="/about/"]').click();
	const loading = page.locator('[data-loading-screen]');
	await expect(loading).toBeVisible();
	await expect(loading).toHaveText(/正在載入地形/);
	await expect(page).toHaveURL(/\/about\/$/);
	await expect(loading).toBeHidden();
});
