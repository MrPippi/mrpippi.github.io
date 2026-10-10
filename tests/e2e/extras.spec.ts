import { expect, mockExternalApis, test } from './fixtures';

test.describe('聊天列指令', () => {
	test('按 T 開啟聊天，Enter 送出訊息，Esc 關閉', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('t');
		const input = page.locator('[data-chat-input]');
		await expect(input).toBeFocused();
		await expect(input).toHaveValue('');
		await input.fill('尼好');
		await input.press('Enter');
		await expect(page.locator('[data-chat-log] li').last()).toHaveText('<訪客> 尼好');
		await expect(input).toBeHidden();

		await page.keyboard.press('t');
		await input.press('Escape');
		await expect(input).toBeHidden();
	});

	test('按 / 直接打指令：/time set night 切成夜晚並解鎖進度', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('/');
		const input = page.locator('[data-chat-input]');
		await expect(input).toHaveValue('/');
		await input.pressSequentially('time set night');
		await input.press('Enter');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(page.locator('[data-chat-log] li').last()).toHaveText('已將時間設為夜晚');
		expect(await page.evaluate(() => localStorage.getItem('advancements'))).toContain('commander');
	});

	test('Tab 自動完成，未知指令顯示紅字', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('/');
		const input = page.locator('[data-chat-input]');
		await input.pressSequentially('wea');
		await expect(page.locator('[data-chat-suggest] button').first()).toHaveText('/weather');
		await input.press('Tab');
		await expect(input).toHaveValue('/weather ');

		await input.fill('/creeper');
		await input.press('Enter');
		const errors = page.locator('[data-chat-log] li[data-tone="error"]');
		await expect(errors.first()).toHaveText('未知的指令：/creeper');
	});

	test('/give 跳出物品通知，/weather 改變天空', async ({ page }) => {
		await page.goto('/en/');
		await page.keyboard.press('/');
		const input = page.locator('[data-chat-input]');
		await input.pressSequentially('give @s cake');
		await input.press('Enter');
		// 通知會排隊：先是「歡迎光臨」與指令進度，接著才是物品
		await expect(page.locator('[data-toast-body]')).toHaveText('Gave 1 [Cake] to Guest', { timeout: 12_000 });

		await page.keyboard.press('/');
		await input.pressSequentially('weather thunder');
		await input.press('Enter');
		await expect(page.locator('[data-sky]')).toHaveAttribute('data-weather', 'thunder');
	});

	test('在輸入框裡打字不會開啟聊天列', async ({ page }) => {
		await page.goto('/blog/');
		await page.locator('[data-search-input]').pressSequentially('t/');
		await expect(page.locator('[data-chat-input]')).toBeHidden();
	});
});

test.describe('天氣', () => {
	test('依實際天氣下雨', async ({ page }) => {
		await mockExternalApis(page, { weatherCode: 61 });
		await page.goto('/');
		await expect(page.locator('[data-sky]')).toHaveAttribute('data-weather', 'rain');
		// 雨要真的在動：每層都有動畫時間，而且位置會變
		const layers = page.locator('.precip');
		const durations = await layers.evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDuration));
		expect(durations.every((d) => d !== '0s')).toBe(true);
		const before = await layers.first().evaluate((el) => getComputedStyle(el).transform);
		await expect
			.poll(() => layers.first().evaluate((el) => getComputedStyle(el).transform))
			.not.toBe(before);
	});

	test('晴天時沒有雨', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('[data-sky]')).toHaveAttribute('data-weather', 'clear');
		await expect(page.locator('.precip').first()).toBeHidden();
	});
});

test.describe('Twitch 開台狀態', () => {
	test('沒開台時不顯示 LIVE', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('[data-live-tag]')).toBeHidden();
	});

	test('開台時：LIVE 標籤、直播標語與通知', async ({ page }) => {
		await mockExternalApis(page, { twitchUptime: '1 hour, 2 minutes', twitchTitle: '來挖礦' });
		await page.goto('/');
		await expect(page.locator('[data-live-tag]')).toBeVisible();
		await expect(page.locator('[data-splash]')).toHaveText('正在直播！');
		await expect(page.locator('[data-toast-body]')).toHaveText('來挖礦');
	});
});

test.describe('音樂面板', () => {
	test('曲目清單與單曲循環', async ({ page }) => {
		await page.goto('/');
		await page.locator('[data-music-toggle]').click();
		const tracks = page.locator('[data-track]');
		await expect(tracks).toHaveCount(6);
		await expect(tracks.first()).toContainText('Biome Fest');

		const loop = page.locator('[data-music-loop]');
		await expect(loop).toHaveText('循環：關');
		await loop.click();
		await expect(loop).toHaveText('循環：開');
		expect(await page.evaluate(() => localStorage.getItem('music-loop'))).toBe('on');

		await tracks.nth(2).click();
		expect(await page.evaluate(() => localStorage.getItem('music'))).toBe('on');
	});
});

test.describe('文章', () => {
	const POST = '/blog/hello-title-screen/';

	test('目錄、標題連結、程式碼複製按鈕', async ({ page }) => {
		await page.goto(POST);
		const toc = page.locator('.toc');
		await expect(toc).toBeVisible();
		const first = toc.locator('a').first();
		const href = await first.getAttribute('href');
		expect(href).toMatch(/^#/);
		await expect(page.locator(`.prose ${href} .anchor`)).toHaveAttribute('href', href ?? '');
		await expect(page.locator('.prose .copy-code').first()).toHaveText('複製');
	});

	test('閱讀進度經驗條捲到底是 100', async ({ page }) => {
		await page.goto(POST);
		const level = page.locator('[data-xp-level]');
		await expect(level).toBeVisible();
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect(level).toHaveText('100');
		await expect(page.locator('[data-xp-bar]')).toHaveAttribute('aria-valuenow', '100');
	});

	test('站內搜尋：中文與英文關鍵字都找得到，網址帶 ?q=', async ({ page }) => {
		await page.goto('/blog/?q=合成');
		const results = page.locator('[data-search-results] a');
		await expect(results.first()).toHaveAttribute('href', '/blog/hello-title-screen/');
		await expect(page.locator('.list')).toBeHidden();

		const input = page.locator('[data-search-input]');
		await input.fill('Claude');
		await expect(results.first()).toBeVisible();
		await expect(page).toHaveURL(/\?q=Claude$/);

		await input.fill('苦力怕');
		await expect(page.locator('[data-search-status]')).toHaveText('找不到符合的文章');

		await input.fill('');
		await expect(page.locator('.list')).toBeVisible();
	});
});
