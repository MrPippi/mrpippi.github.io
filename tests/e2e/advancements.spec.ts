import type { Page } from '@playwright/test';
import { expect, mockExternalApis, test } from './fixtures';

const POST = '/blog/hello-title-screen/';

const unlocked = (page: Page): Promise<string> => page.evaluate(() => localStorage.getItem('advancements') ?? '');

/** 按 T 開聊天送出一般訊息 */
async function chat(page: Page, text: string): Promise<void> {
	await page.keyboard.press('t');
	const input = page.locator('[data-chat-input]');
	await input.fill(text);
	await input.press('Enter');
}

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

test.describe('隱藏進度', () => {
	test('達成前清單只顯示「???」，達成後才顯示名稱與圖示', async ({ page }) => {
		await page.goto('/about/');
		const item = page.locator('[data-adv="diamonds"]');
		await expect(item.locator('[data-adv-title]')).toHaveText('???');
		await expect(item.locator('[data-adv-desc]')).toHaveText('隱藏進度');
		await expect(item.locator('img')).toBeHidden();

		await run(page, 'give @s diamond_pickaxe');
		await expect(item).toHaveClass(/done/);
		await expect(item.locator('[data-adv-title]')).toHaveText('鑽石！');
		await expect(item.locator('img')).toHaveAttribute('src', '/mc/item/diamond.png');
	});

	test('/say 解鎖「自言自語」', async ({ page }) => {
		await page.goto('/');
		await run(page, 'say 哈囉');
		await expect.poll(() => unlocked(page)).toContain('soliloquy');
	});

	test('凌晨造訪解鎖「失眠」，下午不會', async ({ page, context }) => {
		await page.clock.setFixedTime(new Date(2026, 9, 10, 14, 0));
		await page.goto('/');
		await expect.poll(() => unlocked(page)).toContain('welcome');
		expect(await unlocked(page)).not.toContain('insomnia');

		const night = await context.newPage();
		await night.clock.setFixedTime(new Date(2026, 9, 10, 2, 30));
		await night.goto('/about/');
		await expect.poll(() => unlocked(night)).toContain('insomnia');
	});

	test('死亡畫面按「重生」解鎖「重生」', async ({ page }) => {
		await page.goto('/this-page-does-not-exist/');
		const respawn = page.locator('[data-respawn]');
		await expect(respawn).toBeEnabled({ timeout: 3000 });
		await respawn.click();
		await expect(page).toHaveURL(/\/$/);
		expect(await unlocked(page)).toContain('respawn');
	});

	test('聽過所有唱片解鎖「唱片收藏家」', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'heard-tracks',
				JSON.stringify(['Biome Fest', 'Blind Spots', 'Haunt Muskie', 'Aria Math', 'Dreiton']),
			);
		});
		await page.goto('/');
		expect(await unlocked(page)).not.toContain('disc-collector');
		// 模擬第六首開始播放（headless 瀏覽器不實際播音樂）
		await page.evaluate(() =>
			document.dispatchEvent(
				new CustomEvent('music-change', { detail: { playing: true, title: 'Taswell', newTrack: true } }),
			),
		);
		await expect.poll(() => unlocked(page)).toContain('disc-collector');
	});

	test('聊天列呼喚苦力怕：1.5 秒後爆炸，解鎖「嘶嘶…」', async ({ page }) => {
		await page.goto('/');
		// 點燃時先下載原版爆炸音效
		const explodeSound = page.waitForResponse(/\/sounds\/random\/explode\d\.webm$/);
		await chat(page, 'creeper');
		expect((await explodeSound).ok()).toBe(true);
		await expect(page.locator('.explosion-puff').first()).toBeAttached({ timeout: 3000 });
		await expect(page.locator('[data-chat-log] li').last()).toHaveText('訪客 被苦力怕炸死了');
		expect(await unlocked(page)).toContain('creeper');
		await expect(page.locator('.explosion')).toHaveCount(0, { timeout: 3000 });
	});

	test('減少動態效果時苦力怕只有聲音，沒有閃光與粒子', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await chat(page, '苦力怕');
		await expect.poll(() => unlocked(page)).toContain('creeper');
		await expect(page.locator('.explosion, .explosion-flash')).toHaveCount(0);
	});
});

test.describe('物品欄', () => {
	const hotbar = (page: Page) => page.locator('[data-hotbar]');
	const slot = (page: Page, i: number) => page.locator(`[data-slot="${i}"]`);

	test('/give 數量：物品欄出現，掉落物撿起來後放進格子並顯示數量與名稱', async ({ page }) => {
		await page.goto('/');
		await expect(hotbar(page)).not.toHaveClass(/visible/);
		await run(page, 'give @s redstone 5');
		await expect(page.locator('[data-chat-log] li').last()).toHaveText('已將 [紅石粉] × 5 給予 訪客');
		await expect(hotbar(page)).toHaveClass(/visible/);
		// 分成 5 個掉落物，陸續掉下來
		await expect(page.locator('[data-item-drop]')).toHaveCount(5);

		await expect(slot(page, 0).locator('img')).toHaveAttribute('src', '/mc/item/redstone.png', { timeout: 6000 });
		await expect(slot(page, 0).locator('.count')).toHaveText('5');
		await expect(page.locator('[data-hotbar-name]')).toHaveText('紅石粉 ×5');
		// 背包有東西時一直顯示
		await page.waitForTimeout(6500);
		await expect(hotbar(page)).toHaveClass(/visible/);
	});

	test('不能疊的物品一格一個，背包記在瀏覽器裡', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s cake 2');
		await run(page, 'give @s map 3');
		await expect(slot(page, 0).locator('img')).toHaveAttribute('src', '/mc/item/cake.png');
		await expect(slot(page, 1).locator('img')).toHaveAttribute('src', '/mc/item/cake.png');
		await expect(slot(page, 2).locator('.count')).toHaveText('3');
		await expect(slot(page, 0).locator('.count')).toHaveCount(0);

		await page.reload();
		await run(page, 'give @s map');
		await expect(slot(page, 2).locator('.count')).toHaveText('4');
		await expect(slot(page, 0).locator('img')).toHaveAttribute('src', '/mc/item/cake.png');
	});

	test('只打 /give 列出所有物品，自動完成也全部列出', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give');
		const log = page.locator('[data-chat-log] li');
		await expect(log.filter({ hasText: '可以拿的物品' })).toHaveCount(1);
		await expect(log.filter({ hasText: 'experience_bottle - 經驗瓶' })).toHaveCount(1);
		await expect(log.filter({ hasText: ' - ' })).toHaveCount(13);

		await page.keyboard.press('/');
		await page.locator('[data-chat-input]').pressSequentially('give @s ');
		await expect(page.locator('[data-chat-suggest] button')).toHaveCount(13);
	});

	test('數量超出範圍時顯示用法', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s cake 65');
		await expect(page.locator('[data-chat-log] li').last()).toHaveText('用法：/give @s <item> [count]');
	});
});

test.describe('物品欄操作', () => {
	const slot = (page: Page, i: number) => page.locator(`[data-slot="${i}"]`);
	const count = (page: Page, i: number) => slot(page, i).locator('.count');

	test.beforeEach(async ({ page }) => {
		// 不播掉落動畫，物品直接進物品欄
		await page.emulateMedia({ reducedMotion: 'reduce' });
	});

	test('數字鍵選格子，Q 丟一個、Ctrl+Q 丟整格，空了物品欄就隱藏', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s map 3');
		await run(page, 'give @s compass 2');
		// 剛拿到的物品那一格會被選到
		await expect(slot(page, 1)).toHaveAttribute('aria-pressed', 'true');
		await page.keyboard.press('1');
		await expect(slot(page, 0)).toHaveAttribute('aria-pressed', 'true');

		await page.keyboard.press('2');
		await expect(slot(page, 1)).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('[data-hotbar-name]')).toHaveText('指南針');
		await page.keyboard.press('q');
		await expect(count(page, 1)).toHaveCount(0);
		await expect(slot(page, 1)).toHaveAttribute('aria-label', '指南針');
		await page.keyboard.press('Control+q');
		await expect(slot(page, 1).locator('img')).toHaveCount(0);

		await page.keyboard.press('1');
		await page.keyboard.press('Control+q');
		await expect(page.locator('[data-hotbar]')).not.toHaveClass(/visible/);
		expect(await page.evaluate(() => localStorage.getItem('inventory'))).not.toContain('map');
	});

	test('在輸入框裡打 Q 不會丟東西', async ({ page }) => {
		await page.goto('/blog/');
		await run(page, 'give @s map 3');
		await page.locator('[data-search-input]').pressSequentially('q');
		await expect(count(page, 0)).toHaveText('3');
	});

	test('點選中的格子使用物品：紅石切換白天黑夜並印出訊息', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s redstone 2');
		const before = await page.locator('html').getAttribute('data-theme');
		await slot(page, 0).click();
		await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? 'none');
		await expect(page.locator('[data-chat-log] li').last()).toHaveText(/紅石燈(亮了|熄了)/);
		await expect(count(page, 0)).toHaveCount(0);
	});

	test('點沒選中的格子只會選取，右鍵直接使用', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s cake 2');
		await slot(page, 1).click();
		await expect(slot(page, 1)).toHaveAttribute('aria-pressed', 'true');
		await expect(slot(page, 1).locator('img')).toHaveCount(1);
		await slot(page, 0).click({ button: 'right' });
		await expect(page.locator('[data-chat-log] li').last()).toHaveText('訪客 吃了一片蛋糕');
		await expect(slot(page, 0).locator('img')).toHaveCount(0);
	});

	test('長按丟出，按住不放會一直丟', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s redstone 10');
		const box = await slot(page, 0).boundingBox();
		if (!box) throw new Error('找不到格子');
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.waitForTimeout(900);
		await page.mouse.up();
		const left = Number(await count(page, 0).textContent());
		expect(left).toBeLessThan(9);
		// 放開後不會被當成點一下（沒有使用掉）
		await expect(page.locator('[data-chat-log] li').last()).not.toContainText('紅石燈');
	});

	test('終界珍珠傳送到別的頁面', async ({ page }) => {
		await page.goto('/');
		await run(page, 'give @s ender_pearl');
		await slot(page, 0).click();
		await expect(page).not.toHaveURL(/:\d+\/$/);
		await expect(page.locator('[data-chat-log] li').last()).toContainText('傳送');
	});
});

test('使用煙火：火箭升空炸開', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => localStorage.setItem('inventory', JSON.stringify([{ item: 'firework_rocket', count: 1 }])));
	await page.reload();
	await page.locator('[data-slot="0"]').click();
	await expect(page.locator('.firework-spark').first()).toBeAttached({ timeout: 3000 });
	await expect(page.locator('.firework')).toHaveCount(0, { timeout: 4000 });
});
