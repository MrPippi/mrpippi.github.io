import type { Page } from '@playwright/test';
import { expect, mockExternalApis, test } from './fixtures';

const POST = '/blog/hello-title-screen/';

const unlocked = (page: Page): Promise<string> => page.evaluate(() => localStorage.getItem('advancements') ?? '');

async function run(page: Page, command: string): Promise<void> {
	await page.keyboard.press('/');
	const input = page.locator('[data-chat-input]');
	await input.pressSequentially(command);
	await input.press('Enter');
}

test.describe('指令進度', () => {
	test('/time set night 解鎖「甜蜜的夢」', async ({ page }) => {
		await page.goto('/');
		await run(page, 'time set night');
		await expect.poll(() => unlocked(page)).toContain('sweet-dreams');
	});

	test('/give：物品從天而降、落地後被撿起，拿到 3 種解鎖「滿載而歸」', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s cake');
		const drops = page.locator('[data-item-drop]');
		await expect(drops).toHaveCount(1);
		await expect(drops.locator('img')).toHaveAttribute('src', '/mc/item/cake.png');
		expect(await unlocked(page)).not.toContain('hoarder');

		await run(page, 'give @s map');
		await run(page, 'give @s cake');
		expect(await unlocked(page)).not.toContain('hoarder');
		await run(page, 'give @s compass');
		await expect.poll(() => unlocked(page)).toContain('hoarder');
		// 躺一會兒就被撿走
		await expect(drops).toHaveCount(0, { timeout: 10_000 });
	});

	test('減少動態效果時 /give 不播放掉落動畫', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s cake');
		await expect(page.locator('[data-chat-log] li').last()).toContainText('蛋糕');
		await expect(page.locator('[data-item-drop]')).toHaveCount(0);
	});

	test('/kill 解鎖「你死了！」，不算迷路', async ({ page }) => {
		await page.goto('/');
		await run(page, 'kill');
		await expect(page).toHaveURL(/\/kill\/$/);
		await expect.poll(() => unlocked(page)).toContain('you-died');
		expect(await unlocked(page)).not.toContain('lost');
	});
});

test.describe('探索進度', () => {
	test('下雨時解鎖「下雨天」', async ({ page }) => {
		await mockExternalApis(page, { weatherCode: 61 });
		await page.goto('/');
		await expect.poll(() => unlocked(page)).toContain('rainy-day');
	});

	test('點標語換一句，點 10 次解鎖「標語收藏家」', async ({ page }) => {
		await page.goto('/');
		const splash = page.locator('[data-splash]');
		const first = await splash.textContent();
		// 標語一直在脈動，不等它「靜止」
		await splash.click({ force: true });
		await expect(splash).not.toHaveText(first ?? '');
		for (let i = 1; i < 9; i++) await splash.click({ force: true });
		expect(await unlocked(page)).not.toContain('splash');
		await splash.click({ force: true });
		await expect.poll(() => unlocked(page)).toContain('splash');
	});

	test('切換語言解鎖「雙語者」', async ({ page }) => {
		await page.goto('/about/');
		await page.locator('[data-lang-toggle]').click();
		await expect(page).toHaveURL(/\/en\/about\/$/);
		expect(await unlocked(page)).toContain('bilingual');
	});

	test('從作品集打開專案解鎖「結構探索」', async ({ page }) => {
		await page.goto('/portfolio/');
		// 不真的開 GitHub
		await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), { capture: true }));
		await page.locator('[data-project] a').first().click();
		expect(await unlocked(page)).toContain('structure');
	});
});

test.describe('文章進度', () => {
	test('文章讀到最後解鎖「經驗值滿點」', async ({ page }) => {
		await page.goto(POST);
		await expect(page.locator('[data-xp-level]')).toBeVisible();
		expect(await unlocked(page)).not.toContain('max-level');
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect.poll(() => unlocked(page)).toContain('max-level');
	});

	test('搜尋到文章解鎖「考古學家」', async ({ page }) => {
		await page.goto('/blog/?q=合成');
		await expect(page.locator('[data-search-results] a').first()).toBeVisible();
		expect(await unlocked(page)).toContain('archaeologist');
	});

	test('讀了 5 篇文章解鎖「圖書館員」', async ({ page }) => {
		await page.addInitScript(() => {
			if (localStorage.getItem('visited-pages')) return;
			localStorage.setItem('visited-pages', JSON.stringify(['/blog/a/', '/blog/b/', '/blog/c/', '/blog/d/']));
		});
		await page.goto(POST);
		await expect.poll(() => unlocked(page)).toContain('librarian');
	});

	test('文章列表頁不算文章', async ({ page }) => {
		await page.addInitScript(() => {
			if (localStorage.getItem('visited-pages')) return;
			localStorage.setItem('visited-pages', JSON.stringify(['/blog/a/', '/blog/b/', '/blog/c/', '/blog/d/']));
		});
		await page.goto('/blog/');
		await expect.poll(() => unlocked(page)).toContain('welcome');
		expect(await unlocked(page)).not.toContain('librarian');
	});
});
